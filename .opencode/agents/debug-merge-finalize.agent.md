---
description: 'Verify debug PR mergeability, resolve merge conflicts with rebase, squash-merge the PR, verify issue auto-close, and delete the local debug branch'
argument-hint: story=3-5
tools: {execute: true, read: true, agent: true, edit: true, 'context7/*': true, 'playwright/*': true, 'github/*': true, todo: true}
agents: [quality-validation]
user-invocable: false
---

## Dedicated Debug Merge And Finalize Workflow

**IMPORTANT**: This workflow uses the `#skill:bmad-workflow-builder` skill.

Run this prompt from the repository root after the debug PR is ready to merge.

Shell execution rule: every shell command in this workflow must use the bash MCP server. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `pnpm`, `git`, `gh`, and `bash`.

### Purpose

This prompt exists to run merge verification, merge execution, post-merge validation, and local cleanup for debug branches in a **fresh subagent context** so the parent debug workflow does not accumulate merge state.

### Required Startup Context

Before doing anything else, read all of the following:

1. `_bmad-output/project-context.md`
2. `_bmad/bmm/config.yaml`
3. `.github/agents/quality-validation.agent.md`
4. `$(git rev-parse --git-common-dir)/tmp/story-${story}-meta.json`

If the metadata file is missing or malformed, or if it lacks PR number, `branch`, or `repo`, return `MERGE FAILED: missing metadata` and exit.

### Execution Rules

1. Global rules:
   - Operate in the **current repository** on the debug branch from the metadata file.
   - Use the metadata file to recover PR number, branch name, and repo.
   - Do not ask for confirmation on success; return control immediately to the caller.
2. Phase 1 - Preconditions and merge readiness:
   - If the PR state is `MERGED`, skip to rule 9 and continue with post-merge verification and cleanup.
   - If the PR state is `CLOSED` without merge, return `MERGE FAILED: PR closed`.
   - If CI checks are pending, poll every 30s for up to 10 minutes. If they are still pending after that, return `MERGE FAILED: CI timeout`.
   - Require CI/CD checks passing, issue linkage present, and CodeRabbit review state `APPROVED` or all comments labeled severity `critical` or `major` resolved.
3. Phase 2 - Main conflict check: perform the main conflict check using:

```bash
git fetch origin main
git merge-tree --quiet $(git merge-base HEAD origin/main) HEAD origin/main
```

4. If conflicts exist, perform up to 3 distinct conflict-resolution cycles. Each cycle means: start `git rebase origin/main`, resolve conflicts via the edit tool, run the validation subagent, then run `git rebase --continue`. If all 3 cycles fail, return `MERGE FAILED: rebase/conflict resolution failed`.
5. After any conflict fix, call the `runSubagent` tool with:

   - `description`: `"Validation for story ${story} after merge conflict resolution"`
   - `prompt`: Read the full contents of `.github/agents/quality-validation.agent.md` and include them verbatim, substituting `context` with `debug-${story}-merge`.
   - If the quality-validation subagent returns failure, treat that as a conflict-resolution failure and count it toward the 3-cycle limit in rule 4.

6. Phase 3 - Mergeability verification: verify PR `mergeable` state via GitHub tools until it is `true` or `false`. If it becomes `false`, return `MERGE FAILED: PR not mergeable`.
7. If the PR diff touches files under `apps/dms-material/` or other browser-visible route, component, template, or style files, run one Playwright smoke validation that opens the changed screen or route and exercises the changed UI path once. If the diff introduces third-party package imports not already present on `main`, run a Context7 lookup for each new package.
8. Phase 4 - Merge: merge the PR using squash merge. If the squash-merge call returns an error, fetch `origin/main`, re-run rules 2 through 7 once, and retry the squash merge one time. If the second merge attempt fails, return `MERGE FAILED: <gh error>`.
9. Phase 4 - Post-merge issue closure: verify the linked issue auto-closes. If the issue is not closed within 60s of merge, close it manually via `gh issue close <num> --comment "Closed by PR #<pr>"`.
10. Phase 5 - Metadata normalization: after a successful merge, normalize `$(git rev-parse --git-common-dir)/tmp/story-${story}-meta.json` so downstream epic workflows can resume without repair. Write at minimum: string `story`, string `pr`, string `branch`, boolean `merged: true`, and ISO-8601 `mergedAt`. If the PR was already merged when this workflow started, still write the normalized merged metadata before cleanup.
11. Phase 5 - Local cleanup:
    - Before checking out `main`, run `git status --porcelain`; if non-empty, stash with `git stash push -m "debug-${story}-cleanup"`.
    - checkout `main`
    - pull `main`
    - delete the local debug branch with `git branch -D <branch>` after confirming checkout of `main` succeeded
    - if local branch deletion fails, include a warning in the cleanup result but do not mark the merge as failed

### Completion Contract

Return a concise summary containing:

- `story`: `${story}`
- `status`: `MERGE COMPLETE` or `MERGE FAILED`
- PR number
- issue number
- whether rebase/conflict resolution was required
- whether re-validation was required
- cleanup result

If merge/finalization fails after required retries and escalations, return `MERGE FAILED: <reason>` after asking for guidance.
