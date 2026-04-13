# opencode-plugin-mempalace

[![npm version](https://img.shields.io/npm/v/@devtheops/opencode-plugin-mempalace.svg)](https://www.npmjs.com/package/@devtheops/opencode-plugin-mempalace)
[![npm downloads](https://img.shields.io/npm/dm/@devtheops/opencode-plugin-mempalace.svg)](https://www.npmjs.com/package/@devtheops/opencode-plugin-mempalace)
[![GitHub stars](https://img.shields.io/github/stars/DEVtheOPS/opencode-mempalace.svg)](https://github.com/DEVtheOPS/opencode-mempalace/stargazers)
[![Build status](https://img.shields.io/github/actions/workflow/status/DEVtheOPS/opencode-mempalace/release-please.yml?branch=main)](https://github.com/DEVtheOPS/opencode-mempalace/actions/workflows/release-please.yml)
[![License](https://img.shields.io/npm/l/@devtheops/opencode-plugin-mempalace.svg)](https://github.com/DEVtheOPS/opencode-mempalace/blob/main/LICENSE)

An [OpenCode](https://opencode.ai) server plugin that integrates [MemPalace](https://github.com/MemPalace/mempalace) without vendoring the MemPalace application code.

- [Installation](#installation)
- [Requirements](#requirements)
- [What It Adds](#what-it-adds)
- [Runtime Behavior](#runtime-behavior)
- [Development](#development)

The plugin:

- installs the `mempalace` Python package if it is missing
- registers a local `mempalace` MCP server
- injects MemPalace slash commands into OpenCode
- injects a bundled `mempalace` skill into OpenCode

## Installation

Add the plugin to your OpenCode config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@devtheops/opencode-plugin-mempalace"]
}
```

For local development you can point OpenCode directly at this checkout:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["/path/to/opencode-mempalace/src/index.ts"]
}
```

## Requirements

- OpenCode
- Python 3.9+
- `pip`

## What It Adds

The plugin injects these commands:

- `/mempalace-help`
- `/mempalace-init`
- `/mempalace-mine`
- `/mempalace-search`
- `/mempalace-status`

It also injects:

- a `mempalace` skill
- a local `mempalace` MCP server that runs `python3 -m mempalace.mcp_server` or falls back to `python -m mempalace.mcp_server`

If a `mempalace` MCP server is already configured, the plugin leaves it alone.

## Runtime Behavior

When OpenCode loads the plugin, it checks for `python3` or `python` and then verifies whether the `mempalace` package is importable.
If not, it runs:

```bash
python3 -m pip install --upgrade mempalace
```

If installation fails, the plugin logs a warning and OpenCode continues running.

## Development

```bash
bun install
bun run typecheck
bun test
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development and release workflow details.
