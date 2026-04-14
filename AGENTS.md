# AGENTS.md

## What this repo is

- This is an OpenCode plugin, not the MemPalace app itself. The shipped runtime is `src/index.ts` plus helpers in `src/config.ts`, `src/mempalace.ts`, `src/mining.ts`, and `src/session.ts`; `skills/mempalace/SKILL.md` is bundled data.
- `src/index.ts` is the runtime entrypoint exported by the package. It logs MemPalace availability diagnostics, installs config, exposes the `mempalace_mine_session` tool, wires automatic session mining hooks, and injects `mempalace wake-up` output into prompt/compaction hooks.
- `src/config.ts` injects the `mempalace` MCP server, slash commands, and the bundled skill path into OpenCode config.
- `src/mempalace.ts` is the MemPalace CLI integration layer: command discovery, startup diagnostics, project readiness checks, and `wake-up` execution.
- `src/mining.ts` and `src/session.ts` implement transcript export and `mempalace mine ... --mode convos` integration using the OpenCode client API instead of SQLite.

## Commands

- Install deps with `bun install`.
- Typecheck with `bun run typecheck`.
- Run tests with `bun test`.
- CI and release workflows run `bun install --frozen-lockfile`, then `bun run typecheck`, then `bun test`. Keep that order when doing full verification.

## High-signal behavior

- OpenCode loads this plugin directly from TypeScript via Bun. There is no build step and no compiled output to update.
- This repo no longer auto-installs MemPalace. If the `mempalace` CLI or Python module is missing, startup logs warn clearly but the plugin stays loaded.
- The injected MCP server is currently hardcoded to `python3 -m mempalace.mcp_server`. Do not document or rely on a Python fallback unless the code adds it back.
- `applyMemPalaceConfig` must not overwrite an existing `mcp.mempalace` entry.
- The skill injection expects a directory path in `cfg.skills.paths`, not a direct path to `SKILL.md`.
- Runtime options now include `threshold`, `autoMine`, `injectWakeUp`, `injectOnCompaction`, `maxWakeUpChars`, `flushOnIdle`, and `flushOnExit`.
- Automatic conversation mining uses project readiness checks via `mempalace status`; when the project is not initialized, the plugin warns once and skips auto-mining and wake-up injection until `/mempalace-init` is run.
- `flushOnExit` currently only installs graceful signal handlers. It is not a true synchronous crash-safe flush yet.

## Testing focus

- `tests/config.test.ts` covers config-injection invariants; `tests/plugin.test.ts` covers runtime option logging and wake-up injection toggles. Update the appropriate file when changing config or runtime hook behavior.
- If you change plugin bootstrap logic in `src/index.ts`, at least run `bun run typecheck` and `bun test`.

## Manual validation

- For end-to-end manual testing, point `~/.config/opencode/opencode.json` at `/path/to/opencode-mempalace/src/index.ts`.
- Useful checks: plugin loads cleanly, existing `mempalace` MCP config is preserved, the `mempalace` skill appears, `/mempalace-*` commands are present, `mempalace wake-up` content appears in prompts when enabled, and the `mempalace_mine_session` tool can manually mine the current session.

## Release workflow

- This package uses Release Please (`release-please.yml` plus `release-please-config.json` and `.release-please-manifest.json`). Prefer Conventional Commits because releases are derived from commit history.
- Publishing to npm is handled by GitHub Actions after Release Please creates a release, and the publish job reruns typecheck and tests first.
