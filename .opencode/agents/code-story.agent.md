---
description: 'Implement a story inside an already-created worktree using the bmad-dev-story skill'
argument-hint: story=3-3
tools: {execute: true, read: true, agent: true, edit: true, 'context7/*': true, 'playwright/*': true, todo: true}
user-invocable: false
---

## Story Implementation: ${story}

WORKTREE_PATH: <required absolute path>

### Startup

Read the `WORKTREE_PATH:` value from the top of this prompt. If `WORKTREE_PATH` is missing, blank, or still placeholder text, stop immediately and emit `BLOCKED: missing WORKTREE_PATH` — do not guess or use repo root. Use it as the `cwd` for all bash MCP calls and as the root for all file reads and edits during implementation.

### Implementation

Invoke the `#skill:bmad-dev-story` skill to implement the story. All bash MCP calls, file reads, and file edits during implementation must use `WORKTREE_PATH` as the `cwd`:

```
mcp_bash_run({ command: "<command>", cwd: WORKTREE_PATH, timeout: 600000 })
```

If `#skill:bmad-dev-story` is unavailable, returns an error, or reports partial completion, stop and emit `BLOCKED: <reason>` without attempting manual implementation. If a blocking bash MCP command hangs, kill the terminal and emit `BLOCKED: command hang: <cmd>`.

During implementation, call `mcp_context7_query-docs` before using any third-party library API not already imported in the repo. Run Playwright only when the story touches UI files under `apps/dms-material` or modifies routes, components, or other browser-visible behavior, always scoped to `WORKTREE_PATH`. If tests or Playwright checks fail after implementation, allow one fix iteration through the skill; if they still fail, emit `FAILED: <summary>` and stop.

Implementation is complete only when (1) all acceptance criteria in the story file are checked, (2) `pnpm test` passes in `WORKTREE_PATH`, and (3) `pnpm lint` passes in `WORKTREE_PATH`. When the `#skill:bmad-dev-story` skill reports completion and verification passes, output a single-line status `DONE: ${story}` and stop. Do not stage, commit, push, or open PRs.
