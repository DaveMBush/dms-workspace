---
description: Create stories from Epics that use TDD stories.
argument-hint: epic=AD
model: Claude Sonnet 4.5 (copilot)
---

Next we want to create the stories for epic ${epic} but before we do, we need to adjust the epic.

Originally, we had bundled the TDD unit tests with the implementation of the feature, that the story represented. This generally makes the story too large.

Instead, break the stories into TDD story, implementation story, and repeat for as many implementation stories as exist in the original epic.

We don't need a TDD story for e2e test stories

In the TDD stories, in order to make the CI pass and allow us to merge, once you have a running "RED" test, disable the test and then in the implementation story reimplement it.

Make sure the Definition of Done for each story includes:

- capture the worktree path and use it in all subsequent commands that need to run in the worktree (e.g. `run ("pnpm format", { cwd: "${WORKTREE_PATH}" })` for the commit-and-pr story)

- [ ] All validation commands pass each run command should use the bash mcp server to run the command.  ie `run ("pnpm all", { cwd: "${WORKTREE_PATH}" })`
  - Run `CI=1 pnpm all`
  - Run `pnpm e2e:dms-material:chromium`
  - Run `pnpm e2e:dms-material:firefox`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass
