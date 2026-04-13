# Contributing

## Prerequisites

- [Bun](https://bun.sh) v1.0+
- Python 3.9+
- An OpenCode installation for manual testing

## Getting started

```bash
git clone https://github.com/DEVtheOPS/opencode-mempalace
cd opencode-mempalace
bun install
```

## Development workflow

Point your local OpenCode config at the repo so changes are picked up immediately without a build step. In `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["/path/to/opencode-mempalace/src/index.ts"]
}
```

OpenCode loads TypeScript natively via Bun, so there is no build step required during development.

## Commands

| Command | Description |
|---------|-------------|
| `bun run typecheck` | Type-check all sources without emitting |
| `bun test` | Run the test suite |

## Project structure

```text
src/
├── index.ts              - Plugin entrypoint and Python package bootstrap
└── config.ts             - Runtime config injection for MCP, commands, and skills

skills/
└── mempalace/
    └── SKILL.md          - Bundled MemPalace skill definition

tests/
└── config.test.ts        - Config injection regression tests
```

## Manual testing

Use a local OpenCode config that points at this checkout, then start OpenCode and verify:

1. the plugin loads without errors
2. the `mempalace` MCP server appears if it was not already configured
3. the `mempalace` skill is available
4. the `/mempalace-*` commands appear and execute correctly

## Commit messages

This project follows [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

### Types

| Type | When to use |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `perf` | A performance improvement |
| `refactor` | Code change that is neither a fix nor a feature |
| `test` | Adding or updating tests |
| `docs` | Documentation only changes |
| `ci` | CI/CD configuration changes |
| `chore` | Maintenance tasks |
| `build` | Changes to the build system |

## Submitting changes

1. Create a branch from `main`
2. Make your changes and ensure `bun run typecheck` and `bun test` pass
3. Commit using Conventional Commits
4. Open a pull request with a clear description and link related issues
