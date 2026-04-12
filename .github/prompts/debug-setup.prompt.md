---
description: Dedicated debug setup and branch preparation runner
argument-hint: epic=AD story=AD.5
model: Claude Opus 4.6
---

load the #skill:prompt

# Dedicated Debug Setup Workflow

Shell execution rule: every shell command in this workflow must use the bash MCP server. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `pnpm`, `git`, `gh`, and `bash`.

## Purpose

This prompt exists to run epic validation, repository preflight checks, GitHub issue creation, and debug branch setup in a **fresh subagent context** so the parent debug workflow does not accumulate setup state.

## Required Startup Context

Before doing anything else, read all of the following:

1. `_bmad-output/project-context.md`
2. `_bmad/bmm/config.yaml`
3. `_bmad-output/planning-artifacts/${epic}.md`

## Execution Rules

1. Verify the epic file exists and is in `Ready for Debugging` status.
2. Verify the git working directory is clean.
3. Verify the current branch is `main` and up to date with remote; if needed, switch/fetch/pull.
4. Load GitHub MCP tools needed for issue/branch creation.
5. Create the GitHub issue for `${story}`.
6. Create the debug branch from `main`.
7. Check out the branch locally.
8. Return the created issue number and branch name in the completion summary.
9. Use the bash MCP server for every shell command in this workflow. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `git`, `gh`, and `bash`.
10. For all human interaction, use the prompt skill so the question is shown in chat and execution waits for the user's answer.
11. Do not ask for confirmation on success; return control immediately to the caller.

## Completion Contract

Return a concise summary containing:

- `epic`: `${epic}`
- `story`: `${story}`
- `status`: `SETUP COMPLETE` or `SETUP FAILED`
- created issue number
- created branch name

If setup fails after required retries and escalations, return `SETUP FAILED: <reason>` after handling required prompt-skill escalation.
