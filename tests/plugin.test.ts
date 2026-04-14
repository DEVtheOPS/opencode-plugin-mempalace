import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import type { PluginInput } from "@opencode-ai/plugin";

const diagnoseMemPalace = mock(async () => {});
const resolveMemPalaceCommand = mock(async () => ["mempalace"]);
const isProjectReady = mock(async () => true);
const wakeUp = mock(async () => "remember this");
const noteMessage = mock(async () => {});
const flush = mock(async () => {});
const createSessionMiner = mock(() => ({ noteMessage, flush }));

mock.module("../src/mempalace.ts", () => ({
  diagnoseMemPalace,
  resolveMemPalaceCommand,
  isProjectReady,
  wakeUp,
}));

mock.module("../src/mining.ts", () => ({
  createSessionMiner,
  resolveThreshold: (value: unknown) => {
    if (value === undefined) return 15;
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) return 15;
    return parsed;
  },
}));

const { server } = await import("../src/index.ts");

describe("plugin runtime", () => {
  const logs: Array<{ body: { message: string; extra?: Record<string, string> } }> = [];

  const input = {
    client: {
      app: {
        log: async (entry: { body: { message: string; extra?: Record<string, string> } }) => {
          logs.push(entry);
        },
      },
    },
    project: {} as never,
    directory: "/tmp/project",
    worktree: "/tmp/project",
    serverUrl: new URL("http://localhost"),
    $: {} as never,
  } as unknown as PluginInput;

  beforeEach(() => {
    logs.length = 0;
    diagnoseMemPalace.mockClear();
    resolveMemPalaceCommand.mockClear();
    isProjectReady.mockClear();
    wakeUp.mockClear();
    noteMessage.mockClear();
    flush.mockClear();
    createSessionMiner.mockClear();
    wakeUp.mockResolvedValue("remember this");
    isProjectReady.mockResolvedValue(true);
  });

  afterEach(() => {
    process.removeAllListeners("SIGINT");
    process.removeAllListeners("SIGTERM");
  });

  test("logs configured option values", async () => {
    await server(input, {
      threshold: 0,
      autoMine: false,
      injectWakeUp: false,
      injectOnCompaction: false,
      flushOnIdle: false,
      flushOnExit: false,
      maxWakeUpChars: 123,
    });

    expect(logs.some((entry) => entry.body.message === "MemPalace plugin options configured.")).toBe(true);
    expect(logs.find((entry) => entry.body.message === "MemPalace plugin options configured.")?.body.extra).toEqual({
      threshold: "0",
      autoMine: "false",
      injectWakeUp: "false",
      injectOnCompaction: "false",
      flushOnIdle: "false",
      flushOnExit: "false",
      maxWakeUpChars: "123",
    });
  });

  test("injects wake-up memory into the system prompt by default", async () => {
    const hooks = await server(input, {});
    const output = { system: [] as string[] };

    await hooks["experimental.chat.system.transform"]?.({ model: {} as never }, output);

    expect(resolveMemPalaceCommand).toHaveBeenCalled();
    expect(isProjectReady).toHaveBeenCalled();
    expect(wakeUp).toHaveBeenCalledWith(["mempalace"], 4000);
    expect(output.system).toEqual(["remember this"]);
  });

  test("skips wake-up injection when disabled", async () => {
    const hooks = await server(input, { injectWakeUp: false });
    const output = { system: [] as string[] };

    await hooks["experimental.chat.system.transform"]?.({ model: {} as never }, output);

    expect(wakeUp).not.toHaveBeenCalled();
    expect(output.system).toEqual([]);
  });

  test("injects wake-up memory during compaction when enabled", async () => {
    const hooks = await server(input, { autoMine: false, injectOnCompaction: true });
    const output = { context: [] as string[] };

    await hooks["experimental.session.compacting"]?.({ sessionID: "sess-1" }, output);

    expect(wakeUp).toHaveBeenCalledWith(["mempalace"], 4000);
    expect(output.context).toEqual(["remember this"]);
    expect(flush).not.toHaveBeenCalled();
  });
});
