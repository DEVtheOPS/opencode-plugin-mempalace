# AGENTS.md

## What this repo is

- This is an OpenCode plugin, not the MemPalace app itself. The shipped code is just `src/index.ts` and `src/config.ts`; `skills/mempalace/SKILL.md` is bundled data.
- `src/index.ts` is the runtime entrypoint exported by the package. It logs MemPalace availability diagnostics, installs config, and wires automatic session mining hooks.
- `src/config.ts` injects the `mempalace` MCP server, slash commands, and the bundled skill path into OpenCode config.
- `src/mining.ts` and `src/session.ts` implement automatic transcript export and `mempalace mine ... --mode convos` integration using the OpenCode client API instead of SQLite.

## Commands

- Install deps with `bun install`.
- Typecheck with `bun run typecheck`.
- Run tests with `bun test`.
- CI and release workflows run `bun install --frozen-lockfile`, then `bun run typecheck`, then `bun test`. Keep that order when doing full verification.

## High-signal behavior

- OpenCode loads this plugin directly from TypeScript via Bun. There is no build step and no compiled output to update.
- This repo no longer auto-installs MemPalace. If the `mempalace` CLI or Python module is missing, startup logs warn clearly but the plugin stays loaded.
- The injected MCP server intentionally uses `sh -lc` and prefers `python3`, falling back to `python`. Preserve that behavior unless the repo explicitly changes its Python support policy.
- `applyMemPalaceConfig` must not overwrite an existing `mcp.mempalace` entry.
- The skill injection expects a directory path in `cfg.skills.paths`, not a direct path to `SKILL.md`.
- Automatic conversation mining is configurable via plugin option `threshold`: default `15`, `0` disables threshold-triggered saves, invalid values fall back to `15`.

## Testing focus

- The only automated tests are in `tests/config.test.ts`; they cover the important config-injection invariants. Update or extend them when changing `src/config.ts` behavior.
- If you change plugin bootstrap logic in `src/index.ts`, at least run `bun run typecheck` even if there is not yet a dedicated test.

## Manual validation

- For end-to-end manual testing, point `~/.config/opencode/opencode.json` at `/path/to/opencode-mempalace/src/index.ts`.
- Useful checks: plugin loads cleanly, existing `mempalace` MCP config is preserved, the `mempalace` skill appears, and `/mempalace-*` commands are present.

## Release workflow

- This package uses Release Please (`release-please.yml` plus `release-please-config.json` and `.release-please-manifest.json`). Prefer Conventional Commits because releases are derived from commit history.
- Publishing to npm is handled by GitHub Actions after Release Please creates a release, and the publish job reruns typecheck and tests first.
