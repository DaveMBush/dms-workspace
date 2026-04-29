---
description: 'Create commit and PR for a debug branch then run the full CodeRabbit review loop until the PR is ready to merge'
argument-hint: story=AD.5
model: Claude Sonnet 4.6 High
tools: [read, agent, mcp_bash/*]
agents: [commit-and-pr, code-rabbit]
user-invocable: false
---

load the #skill:prompt

# Dedicated Debug PR Lifecycle Workflow

**IMPORTANT**: This workflow uses the bmad-workflow skill:

#skill:bmad-workflow

Run this prompt from the debug branch working directory that contains the validated bug fixes.

Shell execution rule: every shell command in this workflow must use the bash MCP server. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `pnpm`, `git`, `gh`, and `bash`.

## Purpose

This prompt exists to run commit/PR creation and the CodeRabbit review loop in a **fresh subagent context** so the parent debug workflow does not accumulate PR metadata, review polling, and remediation history.

## Required Startup Context

Before doing anything else, read all of the following:

1. `_bmad-output/project-context.md`
2. `_bmad/bmm/config.yaml`
3. `.github/agents/commit-and-pr.agent.md`
4. `.github/agents/code-rabbit.agent.md`
5. `.github/agents/quality-validation.agent.md`

## Execution Rules

1. Operate in the **current working directory** on the debug branch.
2. Use the bash MCP server for every shell command in this workflow. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `pnpm`, `git`, `gh`, and `bash`.
3. Call the `runSubagent` tool now with the following parameters for commit and PR creation:

   - `model`: `"Claude Sonnet 4.6 High (copilot)"`
   - `description`: `"Commit and PR creation for story ${story}"`
   - `prompt`: Read the full contents of `.github/agents/commit-and-pr.agent.md` and include them verbatim, substituting `${story}` with the actual story ID.

4. Ensure PR metadata is written to `$(git rev-parse --git-common-dir)/tmp/story-${story}-meta.json`.
5. If commit-and-pr fails, use the prompt skill to report the failure and stop.
6. Wait 5 minutes after PR creation for rate-limit protection.
7. Call the `runSubagent` tool now with the following parameters for the full CodeRabbit loop:

   - `model`: `"Claude Sonnet 4.6 High (copilot)"`
   - `description`: `"CodeRabbit review for story ${story}"`
   - `prompt`: Read the full contents of `.github/agents/code-rabbit.agent.md` and include them verbatim, substituting `${story}` with the actual story ID.

8. If CodeRabbit requires in-scope fixes, allow it to use the shared quality-validation prompt as needed.
9. Return as soon as the PR is ready to merge or the CodeRabbit loop fails.
10. For all human interaction, use the prompt skill so the question is shown in chat and execution waits for the user's answer.
11. Do not ask for confirmation on success; return control immediately to the caller.

## Completion Contract

Return a concise summary containing:

- `story`: `${story}`
- `status`: `PR READY TO MERGE` or `PR FLOW FAILED`
- PR number
- branch name
- whether CodeRabbit applied fixes
- whether re-validation was required

If PR creation or the CodeRabbit loop fails after required retries and escalations, return `PR FLOW FAILED: <reason>` after handling required prompt-skill escalation.
