---
description: Dedicated debug setup and branch preparation runner
agent: dev
argument-hint: epic=AD story=AD.5
model: Claude Sonnet 4.6 (copilot)
---

# Dedicated Debug Setup Workflow

**IMPORTANT**: This workflow uses the bmad-workflow skill:

#skill:bmad-workflow

## Purpose

This prompt exists to run epic validation, repository preflight checks, GitHub issue creation, and debug branch setup in a **fresh subagent context** so the parent debug workflow does not accumulate setup state.

## Required Startup Context

Before doing anything else, read all of the following:

1. `.github/skills/bmad-workflow/SKILL.md`
2. `.github/skills/bmad-workflow/references/human-interaction.md`
3. `.bmad-core/core-config.yaml`
4. `docs/epics/${epic}.md`

## Execution Rules

1. Verify the epic file exists and is in `Ready for Debugging` status.
2. Verify the git working directory is clean.
3. Verify the current branch is `main` and up to date with remote; if needed, switch/fetch/pull.
4. Load GitHub MCP tools needed for issue/branch creation.
5. Create the GitHub issue for `${story}`.
6. Create the debug branch from `main`.
7. Check out the branch locally.
8. Return the created issue number and branch name in the completion summary.
9. For all human interaction, use `.github/prompts/prompt.sh` via `run_in_terminal` with `timeout: 0`.
10. Do not ask for confirmation on success; return control immediately to the caller.

## Completion Contract

Return a concise summary containing:

- `epic`: `${epic}`
- `story`: `${story}`
- `status`: `SETUP COMPLETE` or `SETUP FAILED`
- created issue number
- created branch name

If setup fails after required retries and escalations, return `SETUP FAILED: <reason>` after handling required `prompt.sh` escalation.
