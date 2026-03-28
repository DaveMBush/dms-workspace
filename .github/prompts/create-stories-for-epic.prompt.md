---
description: Create stories from Epics that use TDD stories.
argument-hint: epic=AD
model: Claude Opus 4.6
---

Next we want to create the stories for epic ${epic} but before we do, we need to adjust the epic.

Originally, we had bundled the TDD unit tests with the implementation of the feature, that the story represented. This generally makes the story too large.

Instead, break the stories into TDD story, implementation story, and repeat for as many implementation stories as exist in the original epic.

We don't need a TDD story for e2e test stories

In the TDD stories, in order to make the CI pass and allow us to merge, once you have a running "RED" test, disable the test and then in the implementation story reimplement it.

Make sure the Definition of Done for each story includes:

- capture the worktree path and use it in all subsequent shell commands that need to run in the worktree via the bash MCP server (e.g. `mcp_bash_run({ command: "pnpm format", cwd: "${WORKTREE_PATH}", timeout: 0 })` for the commit-and-pr story)

- [ ] All validation commands pass. Each shell command must use the bash MCP server, for example `mcp_bash_run({ command: "CI=1 pnpm all", cwd: "${WORKTREE_PATH}", timeout: 0 })`
  - Run `CI=1 pnpm all`
  - Run `pnpm e2e:dms-material:chromium`
  - Run `pnpm e2e:dms-material:firefox`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Rate Limits

To avoid GitHub Copilot rate limiting:
- Always wait for at least 2 minutes between API calls.
- Prefer slow completion over fast failure.
