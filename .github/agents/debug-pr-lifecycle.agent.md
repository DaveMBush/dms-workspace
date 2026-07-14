---
description: 'Create commit and PR for a debug branch then run the full CodeRabbit review loop until the PR is ready to merge'
argument-hint: story=3-5
tools: [vscode, execute, read, agent, edit, search, web, 'context7/*', 'playwright/*', 'github/*', 'nx-mcp-server/*', browser, todo]
agents: [commit-and-pr, code-rabbit]
user-invocable: false
---

## Dedicated Debug PR Lifecycle Workflow

**IMPORTANT**: This workflow uses the `#skill:bmad-workflow-builder` skill:

Run this prompt from the debug branch working directory that contains the validated bug fixes.

Shell execution rule: every shell command in this workflow must use the bash MCP server. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `pnpm`, `git`, `gh`, and `bash`.

### Purpose

This prompt exists to run commit/PR creation and the CodeRabbit review loop in a **fresh subagent context** so the parent debug workflow does not accumulate PR metadata, review polling, and remediation history.

### Required Startup Context

Before doing anything else, read all of the following:

1. `_bmad-output/project-context.md`
2. `_bmad/bmm/config.yaml`
3. `.github/agents/commit-and-pr.agent.md`
4. `.github/agents/code-rabbit.agent.md`
5. `.github/agents/quality-validation.agent.md`

If any required file cannot be read, return `PR FLOW FAILED: missing required context file <path>` and halt before invoking any subagent.

### Execution Rules

1. Preconditions:
   - If `${story}` is empty or does not match pattern `<epic>-<story>` such as `3-5`, return `PR FLOW FAILED: invalid story argument` and halt.
   - Operate in the **current working directory** on the debug branch.
   - Before invoking `commit-and-pr`, run `git status --porcelain` and `git log origin/main..HEAD --oneline` via `mcp_bash_run`. If there are no working tree changes and no unpushed commits, return `PR FLOW FAILED: no changes to commit`.
   - Before invoking `commit-and-pr`, check `gh pr view --json number,state` for an existing PR on the current branch. If one exists and is open, skip `commit-and-pr` and proceed directly to the CodeRabbit loop using that PR.
2. Commit and PR creation:
   - If no open PR exists, call the `runSubagent` tool now with the following parameters for commit and PR creation:
     - `description`: `"Commit and PR creation for story ${story}"`
     - `prompt`: Read the full contents of `.github/agents/commit-and-pr.agent.md` and include them verbatim, substituting `${story}` with the actual story ID.
   - If `commit-and-pr` fails, ask for guidance with message `commit-and-pr failed: <reason>` and then halt execution.
   - Resolve `GIT_COMMON_DIR` via `mcp_bash_run` running `git rev-parse --git-common-dir`. Create the metadata directory via `mcp_bash_run` running `mkdir -p "$GIT_COMMON_DIR/tmp"` before verifying or writing metadata.
   - Ensure PR metadata is written to the metadata path resolved from that bash MCP call: `$GIT_COMMON_DIR/tmp/story-${story}-meta.json`. If metadata write fails or the file is still missing after `commit-and-pr`, return `PR FLOW FAILED: metadata write error`.
   - If a new PR was created, run `mcp_bash_run` with command `sleep 300` to wait 5 minutes before proceeding to the CodeRabbit step.
3. CodeRabbit loop:
   - Call the `runSubagent` tool now with the following parameters for the full CodeRabbit loop:
     - `description`: `"CodeRabbit review for story ${story}"`
     - `prompt`: Read the full contents of `.github/agents/code-rabbit.agent.md` and include them verbatim, substituting `${story}` with the actual story ID.
   - In-scope = changes touching files modified on this debug branch. Out-of-scope CodeRabbit suggestions should be logged but not applied. The `code-rabbit` subagent may invoke `quality-validation.agent.md` autonomously without parent confirmation.
   - Retry the CodeRabbit loop up to 2 times on transient failures such as network errors or rate limits. Do not retry on logic failures such as failed CI or merge conflicts.
   - Ready to merge = GitHub PR `mergeable=true` and no unresolved CodeRabbit comments and all required checks passing.
   - Return as soon as the PR is ready to merge or the CodeRabbit loop fails.
4. Human interaction:
   - Do not ask for confirmation on success; return control immediately to the caller.

### Completion Contract

Return a concise summary containing:

- `story`: `${story}`
- `status`: `PR READY TO MERGE` or `PR FLOW FAILED`
- PR number
- branch name
- whether CodeRabbit applied fixes
- whether re-validation was required

If PR creation or the CodeRabbit loop fails after required retries and escalations, return `PR FLOW FAILED: <reason>` after asking for guidance.
