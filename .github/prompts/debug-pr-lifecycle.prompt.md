---
description: Dedicated debug PR creation and CodeRabbit lifecycle runner
argument-hint: story=AD.5
model: Claude Sonnet 4.6 (copilot)
---

# Dedicated Debug PR Lifecycle Workflow

**IMPORTANT**: This workflow uses the bmad-workflow skill:

#skill:bmad-workflow

Run this prompt from the debug branch working directory that contains the validated bug fixes.

## Purpose

This prompt exists to run commit/PR creation and the CodeRabbit review loop in a **fresh subagent context** so the parent debug workflow does not accumulate PR metadata, review polling, and remediation history.

## Required Startup Context

Before doing anything else, read all of the following:

1. `_bmad-output/project-context.md`
2. `_bmad/bmm/config.yaml`
3. `.github/prompts/commit-and-pr.prompt.md`
4. `.github/prompts/code-rabbit.prompt.md`
5. `.github/prompts/quality-validation.prompt.md`

## Execution Rules

1. Operate in the **current working directory** on the debug branch.
2. Run:

```bash
run #file:./commit-and-pr.prompt.md story=${story}
```

3. Ensure PR metadata is written to `$(git rev-parse --git-common-dir)/tmp/story-${story}-meta.json`.
4. If commit-and-pr fails, call `.github/prompts/prompt.sh` with `timeout: 0` and stop.
5. Wait 5 minutes after PR creation for rate-limit protection.
6. Run the full CodeRabbit loop by calling:

```bash
run #file:./code-rabbit.prompt.md story=${story}
```

7. If CodeRabbit requires in-scope fixes, allow it to use the shared quality-validation prompt as needed.
8. Return as soon as the PR is ready to merge or the CodeRabbit loop fails.
9. For all human interaction, use `.github/prompts/prompt.sh` via `run_in_terminal` with `timeout: 0`.
10. Do not ask for confirmation on success; return control immediately to the caller.

## Completion Contract

Return a concise summary containing:

- `story`: `${story}`
- `status`: `PR READY TO MERGE` or `PR FLOW FAILED`
- PR number
- branch name
- whether CodeRabbit applied fixes
- whether re-validation was required

If PR creation or the CodeRabbit loop fails after required retries and escalations, return `PR FLOW FAILED: <reason>` after handling required `prompt.sh` escalation.
