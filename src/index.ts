import { fileURLToPath } from "node:url";
import type { Plugin } from "@opencode-ai/plugin";
import type { ConfigWithExtensions } from "./config.ts";
import { applyMemPalaceConfig } from "./config.ts";

const PACKAGE_NAME = "mempalace";
const SKILLS_DIR = fileURLToPath(new URL("../skills", import.meta.url));
const IMPORT_CHECK = "import importlib.util, sys; sys.exit(0 if importlib.util.find_spec('mempalace') else 1)";

type Logger = {
  app?: {
    log?: (input: {
      body: {
        service: string;
        level: "debug" | "info" | "warn" | "error";
        message: string;
        extra?: Record<string, string>;
      };
    }) => Promise<unknown>;
  };
};

async function log(
  client: Logger,
  level: "debug" | "info" | "warn" | "error",
  message: string,
  extra?: Record<string, string>,
) {
  if (!client.app?.log) return;
  await client.app.log({
    body: {
      service: "opencode-plugin-mempalace",
      level,
      message,
      extra,
    },
  });
}

async function run(cmd: string[]) {
  const proc = Bun.spawn({
    cmd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { stdout, stderr, exitCode };
}

async function ensureMemPalaceInstalled(client: Logger) {
  const python = Bun.which("python3") ?? Bun.which("python");
  if (!python) {
    await log(
      client,
      "warn",
      "Could not find python3 or python. MemPalace MCP setup will remain unavailable until Python is installed.",
    );
    return;
  }

  const check = await run([python, "-c", IMPORT_CHECK]);
  if (check.exitCode === 0) {
    await log(client, "debug", "MemPalace Python package already installed.", { python });
    return;
  }

  await log(client, "info", "Installing MemPalace Python package.", { python, package: PACKAGE_NAME });
  const install = await run([python, "-m", "pip", "install", "--upgrade", PACKAGE_NAME]);

  if (install.exitCode === 0) {
    await log(client, "info", "Installed MemPalace Python package.", { python, package: PACKAGE_NAME });
    return;
  }

  await log(client, "warn", "MemPalace Python package install failed.", {
    python,
    stderr: install.stderr.trim() || "unknown error",
  });
}

export const server: Plugin = async ({ client }) => {
  await ensureMemPalaceInstalled(client);

  return {
    config: async (cfg) => {
      applyMemPalaceConfig(cfg as ConfigWithExtensions, SKILLS_DIR);
    },
  };
};

export default {
  id: "devtheops.mempalace",
  server,
};
