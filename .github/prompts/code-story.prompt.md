---
description: Develop a story using the BMAD V6 dev story skill.
argument-hint: story=AD.3
model: GPT-5.4 (copilot)
---

# Story Development: ${story}

## Setup

Shell execution rule: use the bash MCP server for every shell command in this workflow. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only when a background process is truly required. This includes `git`, `pnpm`, `gh`, `bash`, and helper scripts. Prefer `cwd` on the MCP call instead of a separate `cd` command.

1. Create a GitHub issue for story `${story}` if one does not already exist. Use the story title and description from `_bmad-output/implementation-artifacts/${story}.md` as the issue body.
2. Create a branch in GitHub for that issue (e.g. `feat/story-${story}`).
3. Create a git worktree for the branch at `../dms/story-${story}` using the bash MCP server:
   ```bash
   git worktree add ../dms/story-${story} <branch-name>
   ```
4. Run `pnpm i` from `../dms/story-${story}` using the bash MCP server to install dependencies.

```
mcp_bash_run({ command: "pnpm i", cwd: "../dms/story-${story}", timeout: 0 })
```

## Implementation

Invoke the `#skill:bmad-dev-story` skill to implement the story from within the worktree directory.

When implementation is complete, return immediately — the parent workflow handles committing, PR creation, and merge.
