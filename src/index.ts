import { fileURLToPath } from "node:url";
import { tool, type Plugin } from "@opencode-ai/plugin";
import type { ConfigWithExtensions } from "./config.ts";
import { applyMemPalaceConfig } from "./config.ts";
import { diagnoseMemPalace, isProjectReady, resolveMemPalaceCommand, wakeUp } from "./mempalace.ts";
import { createSessionMiner, resolveThreshold } from "./mining.ts";

const SKILLS_DIR = fileURLToPath(new URL("../skills", import.meta.url));
const DEFAULT_MAX_WAKE_UP_CHARS = 4000;

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

function resolveBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function resolveMaxWakeUpChars(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_MAX_WAKE_UP_CHARS;
  return parsed;
}

export const server: Plugin = async (input, options) => {
  await diagnoseMemPalace(input.client as Logger);

  const threshold = resolveThreshold(options?.threshold);
  const autoMine = resolveBoolean(options?.autoMine, true);
  const injectWakeUp = resolveBoolean(options?.injectWakeUp, true);
  const injectOnCompaction = resolveBoolean(options?.injectOnCompaction, true);
  const flushOnIdle = resolveBoolean(options?.flushOnIdle, true);
  const flushOnExit = resolveBoolean(options?.flushOnExit, true);
  const maxWakeUpChars = resolveMaxWakeUpChars(options?.maxWakeUpChars);

  await log(input.client as Logger, "info", "MemPalace plugin options configured.", {
    threshold: String(threshold),
    autoMine: String(autoMine),
    injectWakeUp: String(injectWakeUp),
    injectOnCompaction: String(injectOnCompaction),
    flushOnIdle: String(flushOnIdle),
    flushOnExit: String(flushOnExit),
    maxWakeUpChars: String(maxWakeUpChars),
  });

  const miner = createSessionMiner(input, threshold);
  let commandPromise: Promise<string[] | null> | undefined;
  let projectReady: boolean | undefined;
  let readinessLogged = false;

  async function ensureReady() {
    commandPromise ??= resolveMemPalaceCommand();
    const command = await commandPromise;
    if (!command) return { command: null, ready: false };

    if (projectReady === undefined) {
      projectReady = await isProjectReady(command);
    }

    if (!projectReady && !readinessLogged) {
      readinessLogged = true;
      await log(input.client as Logger, "warn", "MemPalace is installed but this project does not appear to be initialized. Wake-up injection and automatic mining are disabled until you run /mempalace-init.", {
        directory: input.directory,
      });
    }

    return { command, ready: Boolean(projectReady) };
  }

  async function injectMemory(kind: "system" | "context", output: { system?: string[]; context?: string[] }) {
    const status = await ensureReady();
    if (!status.command || !status.ready) return;

    const memory = await wakeUp(status.command, maxWakeUpChars);
    if (!memory) return;

    if (kind === "system") output.system?.push(memory);
    if (kind === "context") output.context?.push(memory);
  }

  if (flushOnExit) {
    process.on("SIGINT", () => {
      process.exit(130);
    });
    process.on("SIGTERM", () => {
      process.exit(143);
    });
  }

  return {
    config: async (cfg) => {
      applyMemPalaceConfig(cfg as ConfigWithExtensions, SKILLS_DIR);
    },
    tool: {
      mempalace_mine_session: tool({
        description: "Export the current OpenCode session transcript and mine it into MemPalace conversation memory.",
        args: {},
        execute: async (_args, context) => {
          await miner.mineNow(context.sessionID, "manual-tool");
          return "Requested MemPalace mining for the current OpenCode session.";
        },
      }),
    },
    "chat.message": async ({ sessionID }) => {
      if (!autoMine) return;
      await miner.noteMessage(sessionID);
    },
    event: async ({ event }) => {
      if (!flushOnIdle || !autoMine) return;

      const sessionID = "properties" in event
        ? (event.properties as { sessionID?: string; info?: { id?: string } })?.sessionID ??
          (event.properties as { info?: { id?: string } })?.info?.id
        : undefined;
      if (!sessionID) return;

      if (event.type === "session.idle" || event.type === "session.deleted") {
        await miner.flush(sessionID, event.type);
      }

      if (event.type === "session.status") {
        const status = (event.properties as { status?: { type?: string } })?.status?.type;
        if (status === "idle") {
          await miner.flush(sessionID, "session.status.idle");
        }
      }
    },
    "experimental.chat.system.transform": async (_input, output) => {
      if (!injectWakeUp) return;
      await injectMemory("system", output);
    },
    "experimental.session.compacting": async ({ sessionID }, output) => {
      if (autoMine) {
        await miner.flush(sessionID, "compacting");
      }
      if (!injectOnCompaction) return;
      await injectMemory("context", output);
    },
  };
};

export default {
  id: "devtheops.mempalace",
  server,
};
