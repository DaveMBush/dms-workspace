---
description: 'QA review and remediation loop: run the gate up to 10 times, auto-apply fixes using Context7 and Playwright, re-validate after each fix until the gate passes'
argument-hint: story=3-3
model: GPT-5.4 (copilot)
tools: [vscode, execute/runNotebookCell, execute/getTerminalOutput, execute/killTerminal, execute/runTask, execute/createAndRunTask, execute/runTests, execute/testFailure, read, agent, edit, search, web, browser, 'bash/*', 'context7/*', 'playwright/*', 'github/*', 'nx-mcp-server/*', 'gitkraken/*', todo]
agents: [gate, quality-validation]
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

# Dedicated QA Review Loop

Run this prompt from the story worktree that contains the implementation under review.

Shell execution rule: every shell command in this workflow must use the bash MCP server. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `pnpm`, `git`, `gh`, and `bash`.

## Purpose

This prompt exists to run the full QA gate, remediation, and re-validation cycle in a **fresh subagent context** so the parent story workflow does not accumulate QA findings, fix attempts, and validation output.

## Required Startup Context

Before doing anything else, read all of the following:

1. `_bmad-output/project-context.md`
2. `.github/agents/gate.agent.md`
3. `.github/agents/quality-validation.agent.md`

## Execution Rules

1. If a `WORKTREE_PATH:` line appears at the top of this prompt, use that value as the `cwd` for all bash MCP calls. Otherwise use the current working directory.
2. Use the bash MCP server for every shell command in this workflow. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `pnpm`, `git`, `gh`, and `bash`.
3. Run the QA gate up to 10 times. For each attempt, call the `runSubagent` tool with:

   - `description`: `"QA gate for story ${story}"`
   - `prompt`: Prepend `WORKTREE_PATH: <WORKTREE_PATH>` and `Use this path as the cwd for all bash MCP calls.` then read the full contents of `.github/agents/gate.agent.md` and append them verbatim, substituting `${story}` with the actual story ID.

4. Interpret results exactly as follows:

   - **PASS**: Return immediately with `QA PASSED`
   - **FAIL**: Apply QA fix recommendations automatically, then call the `runSubagent` tool with:
     - `description`: `"Validation for story ${story} after QA fixes"`
     - `prompt`: Prepend `WORKTREE_PATH: <WORKTREE_PATH>` and `Use this path as the cwd for all bash MCP calls.` then read the full contents of `.github/agents/quality-validation.agent.md` and append them verbatim, substituting `context` with `story-${story}-qa`.

5. For QA findings about API misuse, use Context7.
6. For QA findings about UI behavior, use Playwright.
7. After re-validation passes, retry the gate from the top of the loop.
8. If the loop reaches 10 failed gate attempts, use the prompt skill to report the issue summary and ask how to proceed.
9. For all human interaction, use the prompt skill so the question is shown in chat and execution waits for the user's answer.
10. Do not ask for confirmation on success; return control immediately to the caller.

## Completion Contract

Return a concise summary containing:

- `story`: `${story}`
- `status`: `QA PASSED` or `QA FAILED`
- gate attempts used
- brief summary of fixes applied during QA remediation
- whether re-validation was required

If the QA loop exhausts its retries, return `QA FAILED: <reason>` after handling required prompt-skill escalation.
