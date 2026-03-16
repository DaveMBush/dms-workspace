---
description: Dedicated debug merge verification and cleanup runner
agent: dev
argument-hint: story=AD.5
model: Claude Sonnet 4.6 (copilot)
---

# Dedicated Debug Merge And Finalize Workflow

**IMPORTANT**: This workflow uses the bmad-workflow skill:

#skill:bmad-workflow

Run this prompt from the repository root after the debug PR is ready to merge.

## Purpose

This prompt exists to run merge verification, merge execution, post-merge validation, and local cleanup for debug branches in a **fresh subagent context** so the parent debug workflow does not accumulate merge state.

## Required Startup Context

Before doing anything else, read all of the following:

1. `.github/skills/bmad-workflow/SKILL.md`
2. `.github/skills/bmad-workflow/references/human-interaction.md`
3. `.github/prompts/quality-validation.prompt.md`
4. `.bmad-core/core-config.yaml`
5. `$(git rev-parse --git-common-dir)/tmp/story-${story}-meta.json`

## Execution Rules

1. Operate in the **current repository** on the debug branch from the metadata file.
2. Use the metadata file to recover PR number, branch name, and repo.
3. Verify PR mergeability:
   - CI/CD checks passing
   - no merge conflicts
   - issue linkage present
   - CodeRabbit approved or no blocking comments
4. Perform the main conflict check using:

```bash
git fetch origin main
git merge-tree --quiet $(git merge-base HEAD origin/main) HEAD origin/main
```

5. If conflicts exist, attempt rebase onto `origin/main` up to 3 times.
6. After any conflict fix, run:

```bash
run #file:./quality-validation.prompt.md context=debug-${story}-merge
```

7. Verify PR `mergeable` state via GitHub tools until it is `true` or `false`.
8. If the changes include UI, run a quick Playwright sanity validation; if they include unfamiliar API usage, run a quick Context7 check.
9. Merge the PR using squash merge.
10. Verify linked issue auto-closes.
11. Perform local cleanup:
    - checkout `main`
    - pull `main`
    - delete the local debug branch
12. For all human interaction, use `.github/prompts/prompt.sh` via `run_in_terminal` with `timeout: 0`.
13. Do not ask for confirmation on success; return control immediately to the caller.

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
