---
description: 'Fully autonomous story development: pre-development validation, implementation, quality validation, QA review, PR creation, CodeRabbit review, and merge'
argument-hint: story=3-3
model: Claude Sonnet 4.6 High (copilot)
tools: [read, agent, todo, mcp_bash/*]
agents: [code-story, quality-validation, qa-review-loop, commit-and-pr, code-rabbit, merge-finalize]
user-invocable: false
---

load the #skill:prompt

# Autonomous Story Development Workflow

Shell execution rule: every shell command in this workflow and its delegated steps must use the bash MCP server. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `pnpm`, `git`, `gh`, and `bash`. Do not use `run_in_terminal` for shell execution.

## PHASE 1: Pre-Development Validation and Worktree Setup

1. Verify story file exists at `_bmad-output/implementation-artifacts/${story}*.md`
   - If not found: Use the prompt skill to ask: `Story file _bmad-output/implementation-artifacts/${story}.md not found. Reply with stop, continue, or instructions.`
2. Verify story status is "Ready for Development" (not "Draft")
   - If Draft: Use the prompt skill to ask: `Story ${story} is still in Draft status. Reply with stop, continue, or instructions.`
3. Verify git working directory is clean
   - If dirty: Use the prompt skill to ask: `Git working directory has uncommitted changes. Reply with stop, continue, or instructions.`
4. Verify currently on main branch and it's up to date with remote
   - If issues: switch to main branch.
5. Create GitHub issue for story `${story}` if one does not already exist. Use the story title and description from `_bmad-output/implementation-artifacts/${story}.md` as the issue body. Capture the issue number.
6. Check if branch already exists for this story
   - If exists: Use the prompt skill to ask: `Branch for story ${story} already exists. Reply with stop, continue, or instructions.`
7. Check if worktree already exists at `../dms/story-${story}`
   - If exists: Use the prompt skill to ask: `Worktree for story ${story} already exists at ../dms/story-${story}. Reply with stop, continue, or instructions.`
8. Create a branch in GitHub for the issue (e.g. `feat/story-${story}`).
9. Create a git worktree for the branch:
   ```
   mcp_bash_run({ command: "git worktree add ../dms/story-${story} <branch-name>", timeout: 60 })
   ```
10. Run `pnpm i` in the worktree:
    ```
    mcp_bash_run({ command: "pnpm i", cwd: "../dms/story-${story}", timeout: 0 })
    ```
11. Resolve the absolute worktree path and store as `WORKTREE_ABS_PATH`:
    ```
    mcp_bash_run({ command: "realpath ../dms/story-${story}", timeout: 30 })
    ```

## PHASE 2: Story Implementation

Call the `runSubagent` tool now with the following parameters to implement the story in a fresh subagent context:

- `description`: `"Implement story ${story}"`
- `prompt`: Prepend `WORKTREE_PATH: <WORKTREE_ABS_PATH>` and `Use this path as the cwd for all bash MCP calls and file edits.` then read the full contents of `.github/agents/code-story.agent.md` and append them verbatim, substituting `${story}` with the actual story ID.

If `code-story.agent.md` encounters issues, it must use the prompt skill or handle internal retries as required.

**IMMEDIATELY PROCEED TO PHASE 3** once `code-story.agent.md` returns — do not pause, do not ask for confirmation.

## Phase 3 Quality Validation

Call the `runSubagent` tool now with the following parameters to run the quality validation loop in a fresh subagent context:

- `description`: `"Validate story ${story}"`
- `prompt`: Prepend `WORKTREE_PATH: <WORKTREE_ABS_PATH>` and `Use this path as the cwd for all bash MCP calls.` then read the full contents of `.github/agents/quality-validation.agent.md` and append them verbatim, substituting `context` with `story-${story}`.

This keeps the story workflow context small while the validation loop handles:

1. `pnpm format`
2. `CI=1 pnpm all`
3. `pnpm dupcheck`
4. `pnpm e2e:dms-material:chromium`
5. `pnpm e2e:dms-material:firefox`
6. Make sure you kill the process running on port 3000 when the e2e tests are done using `mcp_bash_run` to avoid orphaned processes and port conflicts for subsequent stories. Do not use `run_in_terminal` for this.
7. Code self-review of changed files only (`git diff --name-only origin/main...HEAD`) using `.github/instructions/code-review.md`

**CRITICAL**: The e2e tests must run as the groups specified. Running tests individually that pass does not count as passing. If they can't run as a group, there is likely a setup issue that needs to be resolved before proceeding.

**CRITICAL**: The validation subagent must follow the shared quality-validation loop exactly. If ANY check fails and gets fixed, it restarts from step 1 and only returns when all checks pass in a single iteration.

**CRITICAL**: Do not ignore or skip any validation failures because they are not related to this story. All failures must be addressed and resolved before proceeding to the next phase regardless of where or when it originated. This ensures the overall quality and stability of the codebase is maintained. If a test fails it is either due to being missed in a previous story or because something we did in this story caused a regression. In either case, it must be fixed before proceeding.

**CRITICAL**: The validation subagent must **never** ask the user for permission to fix a failing test — not for unit tests, not for e2e tests, not for any check. All failures are fixed automatically and unconditionally. Do not use the prompt skill to ask whether a fix is appropriate. Just fix it.

If the validation subagent returns `VALIDATION FAILED`, use the prompt skill to ask: `Phase 3 validation failed for ${story}: <reason>. Reply with stop, continue, or instructions.`

## PHASE 4: QA Review

Call the `runSubagent` tool now with the following parameters to run the QA review loop in a fresh subagent context:

- `description`: `"QA review for story ${story}"`
- `prompt`: Prepend `WORKTREE_PATH: <WORKTREE_ABS_PATH>` and `Use this path as the cwd for all bash MCP calls.` then read the full contents of `.github/agents/qa-review-loop.agent.md` and append them verbatim, substituting `${story}` with the actual story ID.

This keeps the story workflow context small while the QA review subagent handles:

1. Running `gate.agent.md`
2. Interpreting PASS/FAIL results
3. Applying QA remediation automatically
4. Re-running validation through `quality-validation.agent.md`
5. Retrying the gate up to 10 times

**CRITICAL**: The QA review subagent must not return success until the gate passes. If it returns `QA FAILED`, use the prompt skill to ask: `QA review failed for ${story}: <reason>. Reply with stop, continue, or instructions.`

When it returns `QA PASSED`: IMMEDIATELY move to Phase 5.

## PHASE 5: Commit and PR Creation

Once all validations pass, call the `runSubagent` tool now with the following parameters:

- `description`: `"Commit and create PR for story ${story}"`
- `prompt`: Prepend `WORKTREE_PATH: <WORKTREE_ABS_PATH>` and `Use this path as the cwd for all bash MCP calls.` then read the full contents of `.github/agents/commit-and-pr.agent.md` and append them verbatim, substituting `${story}` with the actual story ID.

This will:

- Format code one final time
- Commit changes with proper message linking GitHub issue
- Create PR with auto-generated description from story Change Log
- Link PR to GitHub issue for auto-close on merge

**Rate Limit Protection**: Wait 5 minutes after PR creation before checking CodeRabbit status

If commit-and-pr fails: Use the prompt skill to ask: `Failed to create PR: <error>. Reply with stop, continue, or instructions.`

**IMMEDIATELY PROCEED TO PHASE 6** once `commit-and-pr.agent.md` returns successfully — do not pause or wait for human input.

## PHASE 6: CI Pipeline and CodeRabbit Review Loop (delegated)

Phase 6 has been delegated to a dedicated, resumable subagent. After Phase 5 completes the `commit-and-pr` step MUST write a minimal metadata file at `$(git rev-parse --git-common-dir)/tmp/story-${story}-meta.json` with at least:

```json
{
  "pr": "<pr_number>",
  "branch": "<branch-name>",
  "repo": "<owner>/<repo>",
  "worktreePath": "<absolute-path-to-worktree>",
  "attempt": 0,
  "maxIterations": 10
}
```

Then call the `runSubagent` tool now with the following parameters to handle the full CodeRabbit loop:

- `description`: `"CodeRabbit review for story ${story}"`
- `prompt`: Read the full contents of `.github/agents/code-rabbit.agent.md` and include them verbatim as the prompt, substituting `${story}` with the actual story ID.

The `code-rabbit` subagent will poll `mcp_github_pull_request_read method:get_review_comments`, classify suggestions, apply in-scope fixes, run Phase 3 validations, commit/push, and loop until the PR is ready to merge or max iterations are reached. It updates the `.git/tmp/story-${story}-meta.json` file as it proceeds so the process can be resumed safely.

Use the `code-rabbit.agent.md` subagent to keep the story prompt small, idempotent, and resumable.

**IMMEDIATELY PROCEED TO PHASE 7** once `code-rabbit.agent.md` returns — do not pause or wait for human input.

## PHASE 7: Final Merge

Delegate Phase 7 by calling the `runSubagent` tool now with the following parameters:

- `description`: `"Merge and finalize story ${story}"`
- `prompt`: Read the full contents of `.github/agents/merge-finalize.agent.md` and include them verbatim as the prompt, substituting `${story}` with the actual story ID.

This keeps the story workflow context small while the merge subagent handles:

1. PR mergeability verification
2. conflict detection and rebase attempts
3. re-validation after conflict resolution
4. squash merge execution
5. post-merge issue verification
6. local cleanup and final completion summary

**CRITICAL**: The merge subagent must not return success until the PR is merged and cleanup is complete. If it returns `MERGE FAILED`, use the prompt skill to ask: `Final merge failed for ${story}: <reason>. Reply with stop, continue, or instructions.`

When it returns `MERGE COMPLETE`: the story workflow is complete.

## Error Recovery Strategy

- `"continue"`: Try alternatives, use Context7/Playwright, retry
- `"stop"`: Document state, commit as WIP, exit
- Custom instructions: Apply guidance, continue workflow

## Success Criteria

✅ All 7 phases complete without "stop" command = Story fully implemented, reviewed, and merged

## Notes

- This workflow is designed for zero human intervention on happy path
- Human involvement only via the prompt skill when decisions/help are needed
- All quality gates maintained while maximizing autonomy
- MCP servers provide validation and documentation resources
- See bmad-workflow skill for detailed patterns and best practices
