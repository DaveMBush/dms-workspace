---
description: Dedicated quality validation loop runner
argument-hint: context=story-AD.3
model: Claude Sonnet 4.6 (copilot)
---

# Dedicated Quality Validation Workflow

Run this prompt from the repository/worktree that contains the code being validated.

Shell execution rule: every shell command in this workflow must use the bash MCP server. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `pnpm`, `git`, `gh`, `bash`, and `.github/prompts/prompt.sh`.

## Purpose

This prompt exists to run the full quality validation loop in a **fresh subagent context** so long-running test/debug/fix cycles do not consume the parent workflow's context window.

## Required Startup Context

Before running the loop, read:

1. `_bmad-output/project-context.md` — project conventions, patterns, and test rules
2. `.github/instructions/code-review.md` — code review checklist

## Execution Rules

1. Operate in the **current working directory** only.
2. Treat `${context}` only as a logging label for status messages and summaries.
3. Run the following Quality Validation Loop steps in order using the bash MCP server for each command, for example `mcp_bash_run({ command: "<command>", cwd: process.cwd(), timeout: 0 })`:
   1. `CI=1 pnpm all` (lint + build + unit tests)
   2. `pnpm e2e:dms-material:chromium`
   3. `pnpm e2e:dms-material:firefox`
   4. `pnpm dupcheck`
   5. `pnpm format`
4. Self-review changed files (`git diff --name-only origin/main...HEAD`) against `.github/instructions/code-review.md` and fix any findings
5. Auto-fix failures and code-review findings when possible.
6. If any fix is applied, restart the loop from step 1.
7. All steps must pass in a single uninterrupted iteration before reporting success.
8. For all human interaction, run `.github/prompts/prompt.sh` through the bash MCP server, for example `mcp_bash_run({ command: 'bash .github/prompts/prompt.sh "<message>"', cwd: process.cwd(), timeout: 0 })`.
9. Do not ask for confirmation when the loop completes successfully; return control immediately to the caller.

## Completion Contract

Return a concise summary containing:

- `context`: `${context}`
- `status`: `VALIDATION PASSED` or `VALIDATION FAILED`
- files changed during validation/fix loop
- checks run
- brief summary of any auto-fixes applied

If validation fails after exhausting the loop rules, return `VALIDATION FAILED: <reason>` after handling required `prompt.sh` escalation.
