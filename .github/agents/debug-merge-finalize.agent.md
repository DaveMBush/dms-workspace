---
description: 'Verify debug PR mergeability, resolve merge conflicts with rebase, squash-merge the PR, verify issue auto-close, and delete the local debug branch'
argument-hint: story=3-5
model: GPT-5.4 (copilot)
tools: [vscode, execute/runNotebookCell, execute/getTerminalOutput, execute/killTerminal, execute/runTask, execute/createAndRunTask, execute/runTests, execute/testFailure, read, agent, edit, search, web, browser, 'bash/*', 'context7/*', 'playwright/*', 'github/*', 'nx-mcp-server/*', 'gitkraken/*', todo]
agents: [quality-validation]
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

# Dedicated Debug Merge And Finalize Workflow

**IMPORTANT**: This workflow uses the bmad-workflow skill:

#skill:bmad-workflow

Run this prompt from the repository root after the debug PR is ready to merge.

Shell execution rule: every shell command in this workflow must use the bash MCP server. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `pnpm`, `git`, `gh`, and `bash`.

## Purpose

This prompt exists to run merge verification, merge execution, post-merge validation, and local cleanup for debug branches in a **fresh subagent context** so the parent debug workflow does not accumulate merge state.

## Required Startup Context

Before doing anything else, read all of the following:

1. `_bmad-output/project-context.md`
2. `_bmad/bmm/config.yaml`
3. `.github/agents/quality-validation.agent.md`
4. `$(git rev-parse --git-common-dir)/tmp/story-${story}-meta.json`

## Execution Rules

1. Operate in the **current repository** on the debug branch from the metadata file.
2. Use the bash MCP server for every shell command in this workflow. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `git`, `gh`, and `bash`.
3. Use the metadata file to recover PR number, branch name, and repo.
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
7. After any conflict fix, call the `runSubagent` tool with:

   - `description`: `"Validation for story ${story} after merge conflict resolution"`
   - `prompt`: Read the full contents of `.github/agents/quality-validation.agent.md` and include them verbatim, substituting `context` with `debug-${story}-merge`.

8. Verify PR `mergeable` state via GitHub tools until it is `true` or `false`.
9. If the changes include UI, run a quick Playwright sanity validation; if they include unfamiliar API usage, run a quick Context7 check.
10. Merge the PR using squash merge.
11. Verify linked issue auto-closes.
12. Perform local cleanup:
    - checkout `main`
    - pull `main`
    - delete the local debug branch
13. For all human interaction, use the prompt skill so the question is shown in chat and execution waits for the user's answer.
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

If merge/finalization fails after required retries and escalations, return `MERGE FAILED: <reason>` after handling required prompt-skill escalation.
