---
description: 'Full quality validation loop: run pnpm all, e2e tests, dupcheck, format, and self-review until one full iteration passes or 5 iterations are exhausted'
argument-hint: context=story-AD.3
tools: { execute: true, read: true, agent: true, edit: true, 'context7/*': true, 'playwright/*': true, todo: true }
user-invocable: false
---

## Dedicated Quality Validation Workflow

Run this prompt from the repository/worktree that contains the code being validated.

Shell execution rule: every shell command in this workflow must use the bash MCP server. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `pnpm`, `git`, `gh`, and `bash`.

### Purpose

This prompt exists to run the full quality validation loop in a **fresh subagent context** so long-running test/debug/fix cycles do not consume the parent workflow's context window.

### Required Startup Context

Before running the loop, read:

1. `_bmad-output/project-context.md` — project conventions, patterns, and test rules
2. `.github/instructions/code-review.md` — code review checklist

If either startup file is missing or unreadable, return `VALIDATION FAILED: missing startup context <path>` immediately without running the loop.

### Execution Rules

1. If a `WORKTREE_PATH:` line appears at the top of this prompt, use that value as the `cwd` for all bash MCP calls. Otherwise use the current working directory as `cwd`.
2. Treat `${context}` only as a logging label for status messages and summaries.
3. When running shell commands using the bash MCP server,
   **DO NOT EVER ADD SLEEP STATEMENTS TO THE COMMANDS\*\***.
   **ALWAYS WAIT FOR THE COMMAND TO COMPLETE**.
   **USE THE MCP SERVER'S `timeout` PARAMETER INSTEAD**.
   For long-running validation commands, use `timeout: 0` to disable the timeout and wait indefinitely.
   If a bash MCP call returns a tool error, missing binary error, MCP timeout, or similar infrastructure failure unrelated to the command result, retry that same command once. If it still fails, return `VALIDATION FAILED: infrastructure error <details>`.

4. Run at most 5 full validation loop iterations. Each full iteration must execute these substeps in order using the bash MCP server, using `WORKTREE_PATH` (resolved in step 1) as the cwd and `timeout: 0` for long-running validation commands:
   - 4a. Run `CI=1 pnpm all` (lint + build + unit tests).
   - 4b. Run `pnpm e2e:dms-material:chromium`. If it fails, re-run it once immediately. If it passes on retry, log it as flaky and continue without restarting the loop. If it fails twice, treat it as a real failure.
   - 4c. Run `pnpm e2e:dms-material:firefox`. If it fails, re-run it once immediately. If it passes on retry, log it as flaky and continue without restarting the loop. If it fails twice, treat it as a real failure.
   - 4d. Run `pnpm dupcheck`.
   - 4e. Run `pnpm format`. Formatting-only changes from this step do not by themselves trigger a loop restart.
5. Before self-review, run `git fetch origin main`. If `origin/main` cannot be resolved after the fetch, fall back to `HEAD~1` as the diff base and log a warning in the final summary. Then self-review changed files against `.github/instructions/code-review.md` and fix any findings. Fixes from this self-review step also trigger a restart from step 4a.
6. **ALWAYS fix ALL failures automatically — never ask the user for permission to fix a failing test or check.** This applies unconditionally to unit tests, e2e tests, lint errors, dupcheck failures, formatting fixes, and code-review findings, regardless of whether they appear to be pre-existing, unrelated to the current story, or introduced by this story. Every required check must pass before reporting success.
7. If any fix is applied during steps 4a through 4d or step 5, restart the loop from step 4a. All required steps must pass in one full loop iteration before reporting success.
8. If the workflow still has any unresolved failure after 5 full loop iterations, return `VALIDATION FAILED: loop did not converge` with the remaining failures.
9. Prompting rules:
   - Do not ask for confirmation when the loop completes successfully; return control immediately to the caller.
   - If a fix requires modifying files outside the current worktree or repository root, stop and return `VALIDATION FAILED: requires out-of-scope change <description>`.

### Completion Contract

Return a concise summary containing:

- `context`: `${context}`
- `status`: `VALIDATION PASSED` or `VALIDATION FAILED`
- files changed during validation/fix loop
- checks run
- brief summary of any auto-fixes applied

If validation fails after exhausting the 5 full loop iterations, return `VALIDATION FAILED: <reason>` with the remaining failures.
