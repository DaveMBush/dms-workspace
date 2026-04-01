---
description: Dedicated debug PR creation and CodeRabbit lifecycle runner
argument-hint: story=AD.5
model: Claude Opus 4.6
---

# Dedicated Debug PR Lifecycle Workflow

**IMPORTANT**: This workflow uses the bmad-workflow skill:

#skill:bmad-workflow

Run this prompt from the debug branch working directory that contains the validated bug fixes.

Shell execution rule: every shell command in this workflow must use the bash MCP server. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `pnpm`, `git`, `gh`, `bash`, and `.github/prompts/prompt.sh`.

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
2. Use the bash MCP server for every shell command in this workflow. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `pnpm`, `git`, `gh`, `bash`, and `.github/prompts/prompt.sh`.
3. Run:

```bash
run #file:./commit-and-pr.prompt.md story=${story}
```

4. Ensure PR metadata is written to `$(git rev-parse --git-common-dir)/tmp/story-${story}-meta.json`.
5. If commit-and-pr fails, call `.github/prompts/prompt.sh` through the bash MCP server with `timeout: 0` and stop.
6. Wait 5 minutes after PR creation for rate-limit protection.
7. Run the full CodeRabbit loop by calling:

```bash
run #file:./code-rabbit.prompt.md story=${story}
```

8. If CodeRabbit requires in-scope fixes, allow it to use the shared quality-validation prompt as needed.
9. Return as soon as the PR is ready to merge or the CodeRabbit loop fails.
10. For all human interaction, use `.github/prompts/prompt.sh` via the bash MCP server with `timeout: 0`.
11. Do not ask for confirmation on success; return control immediately to the caller.

## Completion Contract

Return a concise summary containing:

- `story`: `${story}`
- `status`: `PR READY TO MERGE` or `PR FLOW FAILED`
- PR number
- branch name
- whether CodeRabbit applied fixes
- whether re-validation was required

If PR creation or the CodeRabbit loop fails after required retries and escalations, return `PR FLOW FAILED: <reason>` after handling required `prompt.sh` escalation.

## Rate Limits

To avoid GitHub Copilot rate limiting:

**CRITICAL**: Always wait for at least 2 minutes between terminal calls, calls to MCP servers, or code updates.
- Prefer slow completion over fast failure.
