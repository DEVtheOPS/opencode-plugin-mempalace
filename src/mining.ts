import type { PluginInput } from "@opencode-ai/plugin";
import { isProjectReady, resolveMemPalaceCommand, run } from "./mempalace.ts";
import { exportSessionTranscript } from "./session.ts";

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

type SessionState = {
  dirtyCount: number;
  mining: boolean;
};

const DEFAULT_THRESHOLD = 15;

export function resolveThreshold(value: unknown): number {
  if (value === undefined) return DEFAULT_THRESHOLD;

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return DEFAULT_THRESHOLD;
  return parsed;
}

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

export function createSessionMiner(input: PluginInput, threshold = DEFAULT_THRESHOLD) {
  const state = new Map<string, SessionState>();
  let projectReady: boolean | undefined;
  let projectReadinessLogged = false;

  function get(sessionID: string): SessionState {
    const existing = state.get(sessionID);
    if (existing) return existing;
    const fresh = { dirtyCount: 0, mining: false };
    state.set(sessionID, fresh);
    return fresh;
  }

  async function mineSession(sessionID: string, reason: string) {
    const session = get(sessionID);
    if (session.mining || session.dirtyCount === 0) return;

    session.mining = true;
    try {
      const command = await resolveMemPalaceCommand();
      if (!command) {
        await log(input.client as unknown as Logger, "warn", "MemPalace conversation mining skipped because the CLI is unavailable.", {
          sessionID,
          reason,
          directory: input.directory,
        });
        return;
      }

      if (projectReady === undefined) {
        projectReady = await isProjectReady(command);
      }

      if (!projectReady) {
        if (!projectReadinessLogged) {
          projectReadinessLogged = true;
          await log(input.client as unknown as Logger, "warn", "MemPalace is installed but this project does not appear to be initialized. Skipping automatic conversation mining. Run /mempalace-init first.", {
            directory: input.directory,
          });
        }
        return;
      }

      const transcript = await exportSessionTranscript(
        input.client as unknown as Parameters<typeof exportSessionTranscript>[0],
        sessionID,
        input.directory,
      );

      await log(input.client as unknown as Logger, "info", "Mining OpenCode session transcript into MemPalace.", {
        sessionID,
        reason,
        messages: String(transcript.messageCount),
        transcript: transcript.path,
      });

      const result = await run([...command, "mine", transcript.path, "--mode", "convos"]);
      if (result.exitCode !== 0) {
        await log(input.client as unknown as Logger, "warn", "MemPalace conversation mining failed.", {
          sessionID,
          reason,
          stderr: result.stderr.trim() || "unknown error",
        });
        return;
      }

      session.dirtyCount = 0;
      await log(input.client as unknown as Logger, "info", "MemPalace conversation mining completed.", {
        sessionID,
        reason,
        messages: String(transcript.messageCount),
      });
    } catch (error) {
      await log(input.client as unknown as Logger, "warn", "MemPalace conversation mining threw an error.", {
        sessionID,
        reason,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      session.mining = false;
    }
  }

  async function noteMessage(sessionID: string) {
    const session = get(sessionID);
    session.dirtyCount += 1;
    if (threshold === 0) return;
    if (session.dirtyCount < threshold) return;
    await mineSession(sessionID, "threshold");
  }

  async function flush(sessionID: string, reason: string) {
    await mineSession(sessionID, reason);
  }

  async function mineNow(sessionID: string, reason: string) {
    const session = get(sessionID);
    if (session.dirtyCount === 0) {
      session.dirtyCount = 1;
    }
    await mineSession(sessionID, reason);
  }

  return {
    noteMessage,
    flush,
    mineNow,
  };
}
