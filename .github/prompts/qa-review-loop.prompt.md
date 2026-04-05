---
description: Dedicated QA review and remediation loop runner
argument-hint: story=AD.3
model: Claude Opus 4.6
---

# Dedicated QA Review Loop

Run this prompt from the story worktree that contains the implementation under review.

Shell execution rule: every shell command in this workflow must use the bash MCP server. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `pnpm`, `git`, `gh`, `bash`, and `.github/prompts/prompt.sh`.

## Purpose

This prompt exists to run the full QA gate, remediation, and re-validation cycle in a **fresh subagent context** so the parent story workflow does not accumulate QA findings, fix attempts, and validation output.

## Required Startup Context

Before doing anything else, read all of the following:

1. `_bmad-output/project-context.md`
2. `.github/prompts/gate.prompt.md`
3. `.github/prompts/quality-validation.prompt.md`

## Execution Rules

1. Operate in the **current working directory** only.
2. Use the bash MCP server for every shell command in this workflow. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `pnpm`, `git`, `gh`, `bash`, and `.github/prompts/prompt.sh`.
3. Run the QA gate up to 10 times by calling:

```bash
run #file:./gate.prompt.md story=${story}
```

4. Interpret results exactly as follows:
   - **PASS**: Return immediately with `QA PASSED`
   - **FAIL**: Apply QA fix recommendations automatically, then re-run:

```bash
run #file:./quality-validation.prompt.md context=story-${story}-qa
```

5. For QA findings about API misuse, use Context7.
6. For QA findings about UI behavior, use Playwright.
7. After re-validation passes, retry the gate from the top of the loop.
8. If the loop reaches 10 failed gate attempts, run `.github/prompts/prompt.sh` through the bash MCP server with `timeout: 0` and report the issue summary.
9. For all human interaction, use `.github/prompts/prompt.sh` via the bash MCP server with `timeout: 0`.
10. Do not ask for confirmation on success; return control immediately to the caller.

## Completion Contract

Return a concise summary containing:

- `story`: `${story}`
- `status`: `QA PASSED` or `QA FAILED`
- gate attempts used
- brief summary of fixes applied during QA remediation
- whether re-validation was required

If the QA loop exhausts its retries, return `QA FAILED: <reason>` after handling required `prompt.sh` escalation.
