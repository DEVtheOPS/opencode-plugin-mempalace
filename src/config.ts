import type { Config } from "@opencode-ai/plugin";

export type ConfigWithExtensions = Config & {
  mcp?: Record<string, unknown>;
  command?: Record<string, unknown>;
  skills?: {
    paths?: string[];
    urls?: string[];
  };
};

function ensureStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function injectCommands(cfg: ConfigWithExtensions) {
  cfg.command ??= {};

  const commands = cfg.command as Record<string, unknown>;
  const template = (workflow: string, description: string, extra = "") => ({
    description,
    template: [
      "Use the `skill` tool to load the `mempalace` skill.",
      `Then run \`mempalace instructions ${workflow}\` with the bash tool.`,
      "Follow the returned instructions exactly and complete the workflow end to end.",
      extra,
    ]
      .filter(Boolean)
      .join("\n\n"),
  });

  commands["mempalace-help"] = template("help", "Show MemPalace usage, tools, and workflow guidance.");
  commands["mempalace-init"] = template("init", "Install and initialize MemPalace for the current project.");
  commands["mempalace-mine"] = template(
    "mine",
    "Mine a project or conversation export into MemPalace.",
    "If command arguments are present, treat them as the target path or export to mine. Otherwise, use the current project root.",
  );
  commands["mempalace-search"] = template(
    "search",
    "Search memories stored in MemPalace.",
    "If command arguments are present, treat them as the search query.",
  );
  commands["mempalace-status"] = template("status", "Show MemPalace status, room counts, and health.");
  commands["mempalace-mine-session"] = {
    description: "Export the current OpenCode session and mine it into MemPalace conversation memory.",
    template: [
      "Use the `mempalace_mine_session` tool to export the current OpenCode session and mine it into MemPalace.",
      "If the tool reports that MemPalace is unavailable or the project is not initialized, run `/mempalace-init` first.",
    ].join("\n\n"),
  };
}

function injectMcp(cfg: ConfigWithExtensions) {
  cfg.mcp ??= {};
  const mcp = cfg.mcp as Record<string, unknown>;
  if (mcp["mempalace"]) return;

  mcp["mempalace"] = {
    type: "local",
    command: ["python3", "-m", "mempalace.mcp_server"],
    enabled: true,
    timeout: 10000,
  };
}

function injectSkill(cfg: ConfigWithExtensions, skillsDir: string) {
  cfg.skills ??= {};
  const paths = ensureStringArray(cfg.skills.paths);
  if (!paths.includes(skillsDir)) paths.push(skillsDir);
  cfg.skills.paths = paths;
}

export function applyMemPalaceConfig(cfg: ConfigWithExtensions, skillsDir: string) {
  injectMcp(cfg);
  injectCommands(cfg);
  injectSkill(cfg, skillsDir);
}
