---
description: Develop a story using the BMAD V6 dev story skill.
argument-hint: story=AD.3
model: Claude Sonnet 4.5 (copilot)
---

# Story Development: ${story}

## Setup

1. Create a GitHub issue for story `${story}` if one does not already exist. Use the story title and description from `_bmad-output/implementation-artifacts/${story}.md` as the issue body.
2. Create a branch in GitHub for that issue (e.g. `feat/story-${story}`).
3. Create a git worktree for the branch at `../dms/story-${story}` using:
   ```bash
   git worktree add ../dms/story-${story} <branch-name>
   ```
4. `cd` into `../dms/story-${story}` and run `pnpm i` to install dependencies.

## Implementation

Invoke the `#skill:bmad-dev-story` skill to implement the story from within the worktree directory.

When implementation is complete, return immediately — the parent workflow handles committing, PR creation, and merge.
