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

const IMPORT_CHECK = "import importlib.util, sys; sys.exit(0 if importlib.util.find_spec('mempalace') else 1)";

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

export async function run(cmd: string[]) {
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

export async function diagnoseMemPalace(client: Logger) {
  const cli = Bun.which("mempalace");
  const python = Bun.which("python3") ?? Bun.which("python");
  if (cli) {
    await log(client, "info", "MemPalace CLI detected.", { cli });
    return;
  }

  if (!python) {
    await log(
      client,
      "warn",
      "MemPalace is required but neither the `mempalace` CLI nor python3/python is available.",
    );
    return;
  }

  const check = await run([python, "-c", IMPORT_CHECK]);
  if (check.exitCode === 0) {
    await log(client, "info", "MemPalace Python package detected via Python module lookup.", { python });
    return;
  }

  await log(client, "warn", "MemPalace is not installed. The MCP server and conversation mining will fail until it is installed manually.", {
    python,
  });
}

export async function resolveMemPalaceCommand() {
  if (Bun.which("mempalace")) return ["mempalace"];

  const python = Bun.which("python3") ?? Bun.which("python");
  if (!python) return null;

  const check = await run([python, "-c", IMPORT_CHECK]);
  if (check.exitCode !== 0) return null;
  return [python, "-m", "mempalace"];
}

export async function isProjectReady(command: string[]) {
  const result = await run([...command, "status"]);
  if (result.exitCode === 0) return true;

  const output = `${result.stderr}\n${result.stdout}`.toLowerCase();
  if (
    output.includes("mempalace.yaml") ||
    output.includes("not initialized") ||
    output.includes("run mempalace init") ||
    output.includes("no palace")
  ) {
    return false;
  }

  return false;
}

export async function wakeUp(command: string[], maxChars: number) {
  const result = await run([...command, "wake-up"]);
  if (result.exitCode !== 0) return null;

  const text = result.stdout.trim();
  if (!text) return null;
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n...[Memory Truncated]`;
}
