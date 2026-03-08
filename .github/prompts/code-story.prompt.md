---
description: Develop a story using the bmad method dev mode.
agent: dev
argument-hint: story=AD.3
model: Claude Sonnet 4.5 (copilot)
---

\*develop-story ${story}. Start by creating an issue in github for the story. Then create a branch in github for that issue. Then create a git worktree for the branch at `../dms/story-${story}`using`git worktree add ../dms/story-${story} <branch-name>`. Then cd into `../dms/story-${story}`, run `pnpm i` to install dependencies, and implement the story from there. When implementation is complete, return immediately — the parent workflow handles committing.
