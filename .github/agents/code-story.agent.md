---
description: 'Implement a story inside an already-created worktree using the bmad-dev-story skill'
argument-hint: story=3-3
model: Claude Sonnet 4.6 High (copilot)
tools: [read, edit, search, agent, mcp_bash/*, mcp_github/*, mcp_context7/*, mcp_microsoft_pla/*]
user-invocable: false
---

# Story Implementation: ${story}

Shell execution rule: use the bash MCP server for every shell command in this workflow. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only when a background process is truly required. This includes `git`, `pnpm`, `gh`, `bash`, and helper scripts. Prefer `cwd` on the MCP call instead of a separate `cd` command.

## Code Exploration Rule

Before exploring source code structure, architecture, or relationships between components, **always read `graphify-out/GRAPH_REPORT.md` first** (if it exists). This pre-built graph answers "where is X", "what does Y do", and "how do X and Y relate" questions without reading individual source files. Only read source files directly when (a) modifying/debugging specific code, (b) the graph lacks the needed detail, or (c) the graph is missing or stale.

## Startup

Read the `WORKTREE_PATH:` value from the top of this prompt. Use it as the `cwd` for all bash MCP calls and as the root for all file reads and edits during implementation.

## Implementation

Invoke the `#skill:bmad-dev-story` skill to implement the story. All bash MCP calls, file reads, and file edits during implementation must use `WORKTREE_PATH` as the `cwd`:

```
mcp_bash_run({ command: "<command>", cwd: WORKTREE_PATH, timeout: 0 })
```

During implementation, use `mcp_context7_query-docs` for unfamiliar APIs and Playwright for UI checks, always scoped to `WORKTREE_PATH`.

When implementation is complete, return immediately — the parent workflow handles committing, PR creation, and merge.
