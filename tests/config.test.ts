import { describe, expect, test } from "bun:test";
import { applyMemPalaceConfig, type ConfigWithExtensions } from "../src/config.ts";

const SKILLS_DIR = "/tmp/mempalace-skills";

describe("applyMemPalaceConfig", () => {
  test("adds mempalace mcp server when missing", () => {
    const cfg: ConfigWithExtensions = {};
    applyMemPalaceConfig(cfg, SKILLS_DIR);

    expect(cfg.mcp).toBeDefined();
    expect((cfg.mcp as Record<string, unknown>)["mempalace"]).toBeDefined();
  });

  test("does not overwrite an existing mempalace mcp server", () => {
    const existing = { type: "remote", url: "https://example.com/mcp", enabled: false } as const;
    const cfg: ConfigWithExtensions = {
      mcp: {
        mempalace: existing,
      },
    };

    applyMemPalaceConfig(cfg, SKILLS_DIR);

    expect((cfg.mcp as Record<string, unknown>)["mempalace"]).toBe(existing);
  });

  test("adds the skills directory instead of a SKILL.md file path", () => {
    const cfg: ConfigWithExtensions = {};
    applyMemPalaceConfig(cfg, SKILLS_DIR);

    expect(cfg.skills?.paths).toEqual([SKILLS_DIR]);
  });

  test("preserves existing skill paths and avoids duplicates", () => {
    const cfg: ConfigWithExtensions = {
      skills: {
        paths: ["/existing", SKILLS_DIR],
      },
    };

    applyMemPalaceConfig(cfg, SKILLS_DIR);

    expect(cfg.skills?.paths).toEqual(["/existing", SKILLS_DIR]);
  });

  test("adds command templates", () => {
    const cfg: ConfigWithExtensions = {};
    applyMemPalaceConfig(cfg, SKILLS_DIR);

    const commands = cfg.command as Record<string, { template: string; description: string }>;
    expect(commands["mempalace-help"]?.description).toContain("MemPalace usage");
    expect(commands["mempalace-mine"]?.template).toContain("Use the `skill` tool to load the `mempalace` skill.");
    expect(commands["mempalace-mine"]?.template).toContain("current project root");
    expect(commands["mempalace-mine-session"]?.description).toContain("current OpenCode session");
  });
});
