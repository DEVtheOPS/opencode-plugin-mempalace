---
name: mempalace
description: MemPalace memory workflows for setup, mining, search, and palace status. Use when asked about MemPalace, memory palace setup, mining memories, or semantic memory search.
license: MIT
compatibility: opencode
---

# MemPalace

MemPalace is a searchable memory system for mined projects and conversations.

## Prerequisites

Verify the CLI is available:

```bash
mempalace --version
```

If it is missing, install it manually:

```bash
python3 -m pip install --upgrade mempalace
```

or:

```bash
python -m pip install --upgrade mempalace
```

## Dynamic Instructions

MemPalace ships operation-specific instructions. Fetch the guide for the workflow you need first:

```bash
mempalace instructions <command>
```

Supported commands:

- `help`
- `init`
- `mine`
- `search`
- `status`

After retrieving the instructions, follow them step by step.

## MCP Server

This plugin injects a local `mempalace` MCP server into OpenCode config at runtime.
If the tools are missing, confirm the `mempalace` CLI or Python package is installed and check the plugin logs for startup diagnostics.
