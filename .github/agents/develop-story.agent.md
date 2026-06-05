---
description: 'Fully autonomous story development: pre-development validation, implementation, quality validation, QA review, PR creation, CodeRabbit review, and merge'
argument-hint: story=3-3
model: qwen3-coder:latest (ollama)
tools: [vscode, execute/runNotebookCell, execute/getTerminalOutput, execute/killTerminal, execute/runTask, execute/createAndRunTask, execute/runTests, execute/testFailure, read, agent, edit, search, web, browser, 'bash/*', 'context7/*', 'playwright/*', 'github/*', 'nx-mcp-server/*', 'gitkraken/*', todo]
agents: [code-story, quality-validation, qa-review-loop, commit-and-pr, code-rabbit, merge-finalize]
user-invocable: false
---

## Response Style

Respond like smart caveman by default unless otherwise specified. Minimize token usage, cut filler, reduce token usage, keep technical substance. See the bullets below for details.

- Drop articles (a, an, the), filler (just, really, basically, actually).
- Drop pleasantries (sure, certainly, happy to).
- No hedging by default. Fragments fine unless precision matters. Use complete sentences for classification rationale, PR replies, issue text, and commit messages.
- Technical terms stay exact. Code blocks unchanged.
- Pattern by default: [thing] [action] [reason]. [next step].
- While thinking, return only as much information as is needed.

## Autonomous Story Development Workflow

Shell execution rule: every shell command in this workflow and its delegated steps must use the bash MCP server. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `pnpm`, `git`, `gh`, and `bash`. Do not use `run_in_terminal` for shell execution.

### PHASE 1: Pre-Development Validation and Worktree Setup

1. Validate `${story}` matches regex `^\d+-\d+$`. If not, abort with error.
2. Resolve `STORY_META_PATH` as `$(git rev-parse --git-common-dir)/tmp/story-${story}-meta.json`. If this file exists and contains a `phase` value, resume from that phase. Otherwise start from Phase 1.
   - Before entering any phase, ensure the parent tmp directory exists and update `STORY_META_PATH` with the current `phase` plus any known `worktreePath`, `branch`, `pr`, or `repo` values.
   - If the metadata write fails, ask: `Failed to write story metadata for ${story}: <error>. Reply with stop, continue, or instructions.`
   - On `continue`: retry the metadata write once and proceed only if it succeeds.
   - On custom instructions: apply them to metadata handling and retry the write once.
3. Resolve the story file via glob `_bmad-output/implementation-artifacts/${story}*.md`. If exactly one match is found, store it as `STORY_FILE_PATH` and use it in all subsequent steps.
   - If 0 or more than 1 matches are found, ask: `Story file resolution for ${story} did not produce exactly one match. Reply with stop, continue, or instructions.`
   - On `continue`: rerun story-file resolution once and proceed only if exactly one match is found.
   - On custom instructions: apply them to story-file resolution and rerun it once.
4. Verify story status in `STORY_FILE_PATH` is "Ready for Development" (not "Draft").
   - If Draft, ask: `Story ${story} is still in Draft status. Reply with stop, continue, or instructions.`
   - On `continue`: proceed with the current story status.
   - On custom instructions: apply them to this status check and rerun it once.
5. Verify git working directory is clean.
   - If dirty, ask: `Git working directory has uncommitted changes. Reply with stop, continue, or instructions.`
   - On `continue`: proceed with the current working directory state.
   - On custom instructions: apply them to this cleanliness check and rerun it once.
6. Verify the repository is on `main` and `main` is up to date with `origin/main`.
   - If not currently on `main`: switch to `main`.
   - If local `main` is behind `origin/main`: fast-forward `main` before proceeding.
   - If switching or fast-forwarding fails, ask: `Could not prepare main branch for story ${story}. Reply with stop, continue, or instructions.`
   - On `continue`: proceed from the current local branch state without further branch preparation.
   - On custom instructions: apply them to branch preparation and retry once.
7. Create a GitHub issue for story `${story}` if one does not already exist. Use the story title and description from `STORY_FILE_PATH` as the issue body. Capture the issue number.
   - If issue creation fails: wait 30 seconds and retry once.
   - If the retry also fails, ask: `Failed to create GitHub issue for ${story}: <error>. Reply with stop, continue, or instructions.`
   - On `continue`: retry issue creation one final time and proceed only if it succeeds.
   - On custom instructions: apply them to issue creation and retry once.
8. Set `BRANCH_NAME` to `feat/story-${story}`. Check both local (`git branch --list ${BRANCH_NAME}`) and remote (`git ls-remote --heads origin ${BRANCH_NAME}`) for an existing branch.
   - If `BRANCH_NAME` already exists locally or remotely, ask: `Branch ${BRANCH_NAME} already exists for story ${story}. Reply with stop, continue, or instructions.`
   - On `continue`: reuse `BRANCH_NAME` and skip branch creation.
   - On custom instructions: apply them to branch handling and rerun the branch check once.
9. Check if worktree already exists at `../dms/story-${story}`.
   - If it exists, ask: `Worktree for story ${story} already exists at ../dms/story-${story}. Reply with stop, continue, or instructions.`
   - On `continue`: reuse the existing worktree and skip worktree creation.
   - On custom instructions: apply them to worktree handling and rerun the worktree check once.
10. Create branch `BRANCH_NAME` from `main` and store the name for all subsequent steps unless it is being reused.
11. Create a git worktree for `BRANCH_NAME` unless the existing worktree is being reused:

```
mcp_bash_run({ command: "git worktree add ../dms/story-${story} ${BRANCH_NAME}", timeout: 60 })
```

12. Run `pnpm i` in the worktree:
    ```
    mcp_bash_run({ command: "pnpm i", cwd: "../dms/story-${story}", timeout: 0 })
    ```

- If `pnpm i` exits non-zero, ask: `pnpm install failed in worktree for ${story}: <error>. Reply with stop, continue, or instructions.`
- On `continue`: retry `pnpm i` once more and proceed only if it succeeds.
- On custom instructions: apply them to the install step and retry once.

13. Resolve the absolute worktree path and store as `WORKTREE_ABS_PATH`:
    ```
    mcp_bash_run({ command: "realpath ../dms/story-${story}", timeout: 30 })
    ```

### PHASE 2: Story Implementation

Call the `runSubagent` tool now with the following parameters to implement the story in a fresh subagent context:

- `description`: `"Implement story ${story}"`
- `prompt`: Prepend `WORKTREE_PATH: <WORKTREE_ABS_PATH>` and `Use this path as the cwd for all bash MCP calls and file edits.` then read the full contents of `.github/agents/code-story.agent.md` and append them verbatim, substituting `${story}` with the actual story ID.

Expected result from this subagent is `DONE: ${story}`. If the subagent errors, times out, returns empty output, or returns anything else, ask: `Phase 2 implementation subagent returned unexpected output for ${story}: <output>. Reply with stop, continue, or instructions.`

If `code-story.agent.md` encounters issues, it must handle internal retries as required.

**IMMEDIATELY PROCEED TO PHASE 3** once `code-story.agent.md` returns — do not pause, do not ask for confirmation.

### PHASE 3: Quality Validation

Call the `runSubagent` tool now with the following parameters to run the quality validation loop in a fresh subagent context:

- `description`: `"Validate story ${story}"`
- `prompt`: Prepend `WORKTREE_PATH: <WORKTREE_ABS_PATH>` and `Use this path as the cwd for all bash MCP calls.` then read the full contents of `.github/agents/quality-validation.agent.md` and append them verbatim, substituting `context` with `story-${story}`.

#### Validation Rules

The validation subagent is responsible only for validation and remediation inside the worktree. It must not ask the user for permission during its internal fix loop.

This keeps the story workflow context small while the validation loop handles:

1. `pnpm format`
2. `CI=1 pnpm all`
3. `pnpm dupcheck`
4. `pnpm e2e:dms-material:chromium`
5. `pnpm e2e:dms-material:firefox`
6. Make sure you kill the process running on port 3000 when the e2e tests are done using `mcp_bash_run` to avoid orphaned processes and port conflicts for subsequent stories. If no process is listening on port 3000, treat that as success. Only fail if the kill command errors and the process is still alive. Do not use `run_in_terminal` for this.
7. Code self-review of changed files only (`git diff --name-only origin/main...HEAD`) using `.github/instructions/code-review.md`

- The e2e tests must run as the groups specified. Running tests individually that pass does not count as passing. If they cannot run as a group, there is a setup issue that must be resolved before proceeding.
- The validation subagent must follow the shared quality-validation loop exactly. If any check fails and gets fixed, it restarts from step 1 and only returns when all checks pass in a single iteration.
- Do not ignore or skip any validation failures because they appear unrelated to this story. All failures must be addressed and resolved before proceeding.
- The validation subagent must never ask the user for permission to fix a failing test. All failing checks are fixed automatically and unconditionally inside the validation subagent.

#### Parent Workflow Behavior on Validation Return

- These rules apply only after the validation subagent has already returned control to the parent workflow. They do not relax the validation subagent's internal no-ask rule.
- Expected validation results are `VALIDATION PASSED` or `VALIDATION FAILED: <reason>`.
- If the validation subagent returns `VALIDATION FAILED: <reason>`, ask: `Phase 3 validation failed for ${story}: <reason>. Reply with stop, continue, or instructions.`
- If the validation subagent errors, times out, returns empty output, or returns anything other than the expected validation results, ask: `Phase 3 validation subagent returned unexpected output for ${story}: <output>. Reply with stop, continue, or instructions.`

### PHASE 4: QA Review

Call the `runSubagent` tool now with the following parameters to run the QA review loop in a fresh subagent context:

- `description`: `"QA review for story ${story}"`
- `prompt`: Prepend `WORKTREE_PATH: <WORKTREE_ABS_PATH>` and `Use this path as the cwd for all bash MCP calls.` then read the full contents of `.github/agents/qa-review-loop.agent.md` and append them verbatim, substituting `${story}` with the actual story ID.

This keeps the story workflow context small while the QA review subagent handles:

1. Running `gate.agent.md`
2. Interpreting PASS/FAIL results
3. Applying QA remediation automatically
4. Re-running validation through `quality-validation.agent.md`
5. Retrying the gate up to 10 times. Each attempt means one full gate run, remediation, and re-validation cycle. After 10 failed attempts, return `QA FAILED: max_iterations_exceeded`.

- Expected QA results are `QA PASSED` or `QA FAILED: <reason>`.
- The QA review subagent must not return success until the gate passes. If it returns `QA FAILED: <reason>`, ask: `QA review failed for ${story}: <reason>. Reply with stop, continue, or instructions.`
- If the QA review subagent errors, times out, returns empty output, or returns anything other than the expected QA results, ask: `Phase 4 QA subagent returned unexpected output for ${story}: <output>. Reply with stop, continue, or instructions.`

When it returns `QA PASSED`: IMMEDIATELY move to Phase 5.

### PHASE 5: Commit and PR Creation

Once all validations pass, call the `runSubagent` tool now with the following parameters:

- `description`: `"Commit and create PR for story ${story}"`
- `prompt`: Prepend `WORKTREE_PATH: <WORKTREE_ABS_PATH>` and `Use this path as the cwd for all bash MCP calls.` then read the full contents of `.github/agents/commit-and-pr.agent.md` and append them verbatim, substituting `${story}` with the actual story ID.

This will:

- Format code one final time
- Commit changes with proper message linking GitHub issue
- Create PR with auto-generated description from story Change Log
- Link PR to GitHub issue for auto-close on merge

**Rate Limit Protection**: Wait 5 minutes after PR creation before checking CodeRabbit status

If commit-and-pr fails: ask: `Failed to create PR: <error>. Reply with stop, continue, or instructions.`

**IMMEDIATELY PROCEED TO PHASE 6** once `commit-and-pr.agent.md` returns successfully — do not pause or wait for human input.

### PHASE 6: CI Pipeline and CodeRabbit Review Loop (delegated)

Phase 6 has been delegated to a dedicated, resumable subagent. After Phase 5 completes the `commit-and-pr` step MUST write a minimal metadata file at `$(git rev-parse --git-common-dir)/tmp/story-${story}-meta.json` with at least:

- Ensure the parent tmp directory exists with `mkdir -p` before writing this metadata file.
- If the metadata file write fails, abort Phase 6 invocation and ask: `Failed to write story metadata for ${story}: <error>. Reply with stop, continue, or instructions.`

```json
{
  "story": "${story}",
  "pr": "<pr_number>",
  "branch": "<branch-name>",
  "repo": "<owner>/<repo>",
  "worktreePath": "<absolute-path-to-worktree>",
  "phase": 6,
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

### PHASE 7: Final Merge

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

- Expected merge results are `MERGE COMPLETE` or `MERGE FAILED: <reason>`.
- The merge subagent must not return success until the PR is merged and cleanup is complete. If it returns `MERGE FAILED: <reason>`, ask: `Final merge failed for ${story}: <reason>. Reply with stop, continue, or instructions.`
- If the merge subagent errors, times out, returns empty output, or returns anything other than the expected merge results, ask: `Phase 7 merge subagent returned unexpected output for ${story}: <output>. Reply with stop, continue, or instructions.`

When it returns `MERGE COMPLETE`: the story workflow is complete.

### Error Recovery Strategy

- `"continue"`: Try alternatives, use Context7/Playwright, retry
- `"stop"`: Document state, commit as WIP, exit
- Custom instructions: Apply guidance, continue workflow

### Success Criteria

✅ All 7 phases complete without "stop" command = Story fully implemented, reviewed, and merged

### Notes

- This workflow is designed for zero human intervention on happy path
- All quality gates maintained while maximizing autonomy
- MCP servers provide validation and documentation resources
- See `skill:bmad-workflow` for detailed patterns and best practices
