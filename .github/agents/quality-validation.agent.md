---
description: 'Full quality validation loop: run pnpm all, e2e tests (chromium and firefox), dupcheck, format, and self-review changed files — restart from step 1 if any fix is applied'
argument-hint: context=story-AD.3
model: GPT-5.4 (copilot)
tools: [vscode, execute/runNotebookCell, execute/getTerminalOutput, execute/killTerminal, execute/runTask, execute/createAndRunTask, execute/runTests, execute/testFailure, read, agent, edit, search, web, browser, 'bash/*', 'context7/*', 'playwright/*', 'github/*', 'nx-mcp-server/*', 'gitkraken/*', todo]
user-invocable: false
---

## Response Style

Respond like smart caveman. Cut all filler, keep technical substance.
- Drop articles (a, an, the), filler (just, really, basically, actually).
- Drop pleasantries (sure, certainly, happy to).
- No hedging. Fragments fine. Short synonyms.
- Technical terms stay exact. Code blocks unchanged.
- Pattern: [thing] [action] [reason]. [next step].

load the #skill:prompt

# Dedicated Quality Validation Workflow

Run this prompt from the repository/worktree that contains the code being validated.

Shell execution rule: every shell command in this workflow must use the bash MCP server. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `pnpm`, `git`, `gh`, and `bash`.

## Purpose

This prompt exists to run the full quality validation loop in a **fresh subagent context** so long-running test/debug/fix cycles do not consume the parent workflow's context window.

## Required Startup Context

Before running the loop, read:

1. `_bmad-output/project-context.md` — project conventions, patterns, and test rules
2. `.github/instructions/code-review.md` — code review checklist

## Execution Rules

1. If a `WORKTREE_PATH:` line appears at the top of this prompt, use that value as the `cwd` for all bash MCP calls. Otherwise use the current working directory as `cwd`.
2. Treat `${context}` only as a logging label for status messages and summaries.
3. When running shell commands using the bash MCP server,
   **DO NOT EVER ADD SLEEP STATEMENTS TO THE COMMANDS\*\***.
   **ALWAYS WAIT FOR THE COMMAND TO COMPLETE**.
   **USE THE MCP SERVER'S `timeout` PARAMETER INSTEAD using the MAX timeout value** .

4. Run the following Quality Validation Loop steps in order using the bash MCP server for each command, using `WORKTREE_PATH` (resolved in step 1) as the cwd: `mcp_bash_run({ command: "<command>", cwd: WORKTREE_PATH, timeout: 0 })`:
   1. `CI=1 pnpm all` (lint + build + unit tests)
   2. `pnpm e2e:dms-material:chromium` (this can take a very long time... over 20 minutes or more, so be patient and do not interrupt it)
   3. `pnpm e2e:dms-material:firefox` (this can also take a very long time, so again be patient and do not interrupt it)
   4. `pnpm dupcheck`
   5. `pnpm format`
5. Self-review changed files (`git diff --name-only origin/main...HEAD`) against `.github/instructions/code-review.md` and fix any findings
6. **ALWAYS fix ALL failures automatically — never ask the user for permission to fix a failing test or check.** This applies unconditionally to unit tests, e2e tests, lint errors, and code-review findings, regardless of whether they appear to be pre-existing, unrelated to the current story, or introduced by this story. Every test must pass before reporting success. There is no category of test failure that warrants asking the user whether to fix it.
7. If any fix is applied, restart the loop from step 1.
8. All steps must pass in a single uninterrupted iteration before reporting success.
9. For all human interaction, use the prompt skill so the question is shown in chat and execution waits for the user's answer. **Exception: never use the prompt skill to ask whether to fix a failing test or check — just fix it.**
10. Do not ask for confirmation when the loop completes successfully; return control immediately to the caller.

## Completion Contract

Return a concise summary containing:

- `context`: `${context}`
- `status`: `VALIDATION PASSED` or `VALIDATION FAILED`
- files changed during validation/fix loop
- checks run
- brief summary of any auto-fixes applied

If validation fails after exhausting the loop rules, return `VALIDATION FAILED: <reason>` after handling required prompt-skill escalation.
