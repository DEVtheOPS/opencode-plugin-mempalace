# opencode-plugin-mempalace

[![npm version](https://img.shields.io/npm/v/@devtheops/opencode-plugin-mempalace.svg)](https://www.npmjs.com/package/@devtheops/opencode-plugin-mempalace)
[![npm downloads](https://img.shields.io/npm/dm/@devtheops/opencode-plugin-mempalace.svg)](https://www.npmjs.com/package/@devtheops/opencode-plugin-mempalace)
[![GitHub stars](https://img.shields.io/github/stars/DEVtheOPS/opencode-plugin-mempalace.svg)](https://github.com/DEVtheOPS/opencode-plugin-mempalace/stargazers)
[![Build status](https://img.shields.io/github/actions/workflow/status/DEVtheOPS/opencode-plugin-mempalace/release-please.yml?branch=main)](https://github.com/DEVtheOPS/opencode-plugin-mempalace/actions/workflows/release-please.yml)
[![License](https://img.shields.io/npm/l/@devtheops/opencode-plugin-mempalace.svg)](https://github.com/DEVtheOPS/opencode-plugin-mempalace/blob/main/LICENSE)

An [OpenCode](https://opencode.ai) server plugin that integrates [MemPalace](https://github.com/MemPalace/mempalace) without vendoring the MemPalace application code.

- [opencode-plugin-mempalace](#opencode-plugin-mempalace)
  - [Installation](#installation)
  - [Requirements](#requirements)
  - [What It Adds](#what-it-adds)
  - [Runtime Behavior](#runtime-behavior)
  - [Development](#development)

The plugin:

- requires an existing `mempalace` installation and logs startup diagnostics if it is missing
- registers a local `mempalace` MCP server
- injects MemPalace slash commands into OpenCode
- injects a bundled `mempalace` skill into OpenCode
- automatically mines OpenCode session transcripts into MemPalace conversation memory
- can inject `mempalace wake-up` memory into the system prompt and compaction context

## Installation

Add the plugin to your OpenCode config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@devtheops/opencode-plugin-mempalace"]
}
```

You can configure automatic conversation mining with a per-session message threshold:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [["@devtheops/opencode-plugin-mempalace", { "threshold": 30 }]]
}
```

Full plugin options:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [["@devtheops/opencode-plugin-mempalace", {
    "threshold": 15,
    "autoMine": true,
    "injectWakeUp": true,
    "injectOnCompaction": true,
    "maxWakeUpChars": 4000,
    "flushOnIdle": true,
    "flushOnExit": true
  }]]
}
```

`threshold` rules:

- default: `15`
- `0`: disable threshold-triggered mining and only flush on idle, delete, and compaction
- invalid or negative values fall back to `15`

Other options:

- `autoMine`: enable or disable automatic conversation mining entirely
- `injectWakeUp`: inject `mempalace wake-up` output into the system prompt
- `injectOnCompaction`: inject `mempalace wake-up` output into compaction context
- `maxWakeUpChars`: truncate injected wake-up memory to this many characters
- `flushOnIdle`: flush dirty sessions when OpenCode marks them idle or deleted
- `flushOnExit`: register graceful process-exit hooks

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
- MemPalace installed already, either as `mempalace` on `PATH` or as a Python module importable by `python3` or `python`

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

When OpenCode loads the plugin, it checks for the `mempalace` CLI first, then falls back to verifying whether the `mempalace` package is importable through `python3` or `python`.

If MemPalace is missing, the plugin does not install it automatically. Instead it logs explicit warnings so MCP startup failures are easier to diagnose.

The plugin also exports OpenCode session transcripts through the OpenCode client API and mines them with:

```bash
mempalace mine <transcript-file> --mode convos
```

Threshold-based mining is configurable through the plugin `threshold` option.

## Development

```bash
bun install
bun run typecheck
bun test
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development and release workflow details.
