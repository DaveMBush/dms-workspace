---
description: Dedicated merge verification and final cleanup runner
argument-hint: story=AD.3
model: Claude Opus 4.6
---

# Dedicated Merge And Finalize Workflow

Run this prompt from the story worktree that contains the PR branch to finalize.

Shell execution rule: every shell command in this workflow must use the bash MCP server. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `pnpm`, `git`, `gh`, `bash`, and `.github/prompts/prompt.sh`.

## Purpose

This prompt exists to run merge verification, merge execution, post-merge validation, and local cleanup in a **fresh subagent context** so the parent story workflow does not accumulate merge polling, conflict resolution, and cleanup state.

## Required Startup Context

Before doing anything else, read all of the following:

1. `_bmad-output/project-context.md`
2. `_bmad/bmm/config.yaml`
3. `.github/prompts/quality-validation.prompt.md`
4. `$(git rev-parse --git-common-dir)/tmp/story-${story}-meta.json`

## Execution Rules

1. Operate in the **current worktree** for the story branch.
2. Use the bash MCP server for every shell command in this workflow. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `git`, `gh`, `bash`, and `.github/prompts/prompt.sh`.
3. Use the meta file to recover PR number, branch name, repo, and worktree path.
4. Verify PR mergeability:
   - CI/CD checks passing
   - no merge conflicts
   - issue linkage present
   - CodeRabbit approved or no blocking comments
5. Perform the main conflict check using:

```bash
git fetch origin main
git merge-tree --quiet $(git merge-base HEAD origin/main) HEAD origin/main
```

6. If conflicts exist, attempt rebase onto `origin/main` up to 3 times.
7. After any conflict fix, run:

```bash
run #file:./quality-validation.prompt.md context=story-${story}-merge
```

8. Verify PR `mergeable` state via GitHub tools until it is `true` or `false`.
9. If story changes include UI, run a quick Playwright sanity validation; if they include unfamiliar API usage, run a quick Context7 check.
10. Merge the PR using squash merge.
11. Verify linked issue auto-closes.
12. Perform local cleanup:

- return to main workspace
- pull `main`
- remove the story worktree
- delete the local story branch

13. For all human interaction, use `.github/prompts/prompt.sh` via the bash MCP server with `timeout: 0`.
14. Do not ask for confirmation on success; return control immediately to the caller.

## Completion Contract

Return a concise summary containing:

- `story`: `${story}`
- `status`: `MERGE COMPLETE` or `MERGE FAILED`
- PR number
- issue number
- whether rebase/conflict resolution was required
- whether re-validation was required
- cleanup result

If merge/finalization fails after required retries and escalations, return `MERGE FAILED: <reason>` after handling required `prompt.sh` escalation.

## Rate Limits

To avoid GitHub Copilot rate limiting:

- Always wait for at least 2 minutes between terminal calls, calls to MCP servers, or code updates.
- Prefer slow completion over fast failure.
