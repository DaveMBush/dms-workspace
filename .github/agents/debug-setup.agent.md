---
description: 'Validate epic status, verify clean git state on main, create GitHub issue and debug branch, and return branch name to the parent debug workflow'
argument-hint: epic=3 story=3-5
model: Qwen3.6-27B-Claude-4.6-Opus-Deckard-Heretic-Uncensored-Thinking (customendpoint)
tools: [vscode, execute, read, agent, edit, search, web, 'context7/*', 'playwright/*', 'github/*', 'nx-mcp-server/*', browser, todo]
user-invocable: false
---

## Dedicated Debug Setup Workflow

Shell execution rule: all shell commands MUST use `mcp_bash_run` for blocking commands or `mcp_bash_run_background` for true background processes only. If bash MCP is unavailable, return `SETUP FAILED: bash MCP unavailable`.

### Purpose

This prompt exists to run epic validation, repository preflight checks, GitHub issue creation, and debug branch setup in a **fresh subagent context** so the parent debug workflow does not accumulate setup state.

### Required Startup Context

Before doing anything else, read all of the following:

1. `_bmad-output/project-context.md`
2. `_bmad/bmm/config.yaml`
3. `_bmad-output/planning-artifacts/${epic}.md`

If any required file is missing or unparseable, return `SETUP FAILED: missing context file <path>`.

### Execution Rules

1. Verify `${epic}` matches `^\d+$` and `${story}` matches `^\d+-\d+$`. Otherwise return `SETUP FAILED: invalid arguments`.
2. Verify the epic file exists and its YAML frontmatter field is exactly `status: Ready for Debugging`. If the status is not `Ready for Debugging`, return `SETUP FAILED: epic ${epic} status is <actual>, expected Ready for Debugging`.
3. Verify the git working directory is clean. If dirty, do NOT auto-stash. Return `SETUP FAILED: working directory not clean` and include the output of `git status`.
4. Only after rule 3 passes, verify the current branch is `main` and up to date with `origin/main`; if needed, switch, fetch, and fast-forward pull. If pull is non-fast-forward or produces conflicts, return `SETUP FAILED: main diverged from origin/main`.
5. Use `mcp_github_search_issues` and `mcp_github_issue_write` for issue lookup and creation in the repo defined by `project-context.md`. Before creating, search open issues for exact title `[Debug] Epic ${epic} Story ${story}`. If found, reuse that issue number instead of creating a duplicate. If not found, create an issue with:
   - Title: `[Debug] Epic ${epic} Story ${story}`
   - Body: reference `_bmad-output/planning-artifacts/${epic}.md`
   - Labels: `debug`, `epic-${epic}`
   - Assignees: none
     On GitHub auth or rate-limit error, return `SETUP FAILED: github <error>`. Retry this rule up to 2 times only for transient network or rate-limit failures.
6. Create the debug branch from `main` using exact pattern `debug/epic-${epic}-story-${story}-issue-<issue_number>`. If the branch exists remotely, fetch and check it out. If it exists locally and tracks the same remote/base, check it out. If it exists locally with a different base or conflicting remote state, return `SETUP FAILED: branch conflict`. Retry this rule up to 2 times only for transient network failures.
7. Return the created or reused issue number and branch name in the completion summary.
8. Do not ask for confirmation on success; return control immediately to the caller.

### Completion Contract

Return a concise summary containing:

- `epic`: `${epic}`
- `story`: `${story}`
- `status`: `SETUP COMPLETE` or `SETUP FAILED`
- created issue number
- created branch name

If setup fails after required retries and escalations, return `SETUP FAILED: <reason>`. Retry only rules 5 through 6 up to 2 times on transient failures. Do not retry rules 1 through 4.
