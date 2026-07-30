---
name: tool-priority
description: Use when selecting which tool to use for a task — defines tool hierarchy from MCP → Skills → CLI → Custom scripts
---

# Tooling Priority Rules

When executing tasks, use tools in this exact hierarchy:

1. **MCP Tools** (Jira, GitHub, Filesystem MCPs) — Always check for an official MCP tool first.
2. **Skills / Slash Commands** — Use defined skills and commands.
3. **Native Platform Capabilities** — Use standard CLI / Shell commands.
4. **Custom Implementation** — Write custom scripts ONLY as a last resort.

Before writing custom code or running complex shell scripts, verify whether an existing MCP tool already solves the task.
