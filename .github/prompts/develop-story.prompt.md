---
description: Fully autonomous story development from start to merge
argument-hint: story=AD.3
model: Claude Opus 4.6
---

load the #skill:prompt

# Autonomous Story Development Workflow

Shell execution rule: every shell command in this workflow and its delegated steps must use the bash MCP server. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `pnpm`, `git`, `gh`, and `bash`. Do not use `run_in_terminal` for shell execution.

## PHASE 1: Pre-Development Validation

1. Verify story file exists at `_bmad-output/implementation-artifacts/${story}.md`
   - If not found: Use the prompt skill to ask: `Story file _bmad-output/implementation-artifacts/${story}.md not found. Reply with stop, continue, or instructions.`
2. Verify story status is "Ready for Development" (not "Draft")
   - If Draft: Use the prompt skill to ask: `Story ${story} is still in Draft status. Reply with stop, continue, or instructions.`
3. Verify git working directory is clean
   - If dirty: Use the prompt skill to ask: `Git working directory has uncommitted changes. Reply with stop, continue, or instructions.`
4. Verify currently on main branch and it's up to date with remote
   - If issues: switch to main branch.
5. Check if GitHub issue already exists for this story (search by story ID in title)
6. Check if branch already exists for this story
   - If exists: Use the prompt skill to ask: `Branch for story ${story} already exists. Reply with stop, continue, or instructions.`
7. Check if worktree already exists at `../dms/story-${story}`
   - If exists: Use the prompt skill to ask: `Worktree for story ${story} already exists at ../dms/story-${story}. Reply with stop, continue, or instructions.`

## PHASE 2: Story Implementation

run #file:./code-story.prompt.md story=${story}

This will:

- Create GitHub issue (if not exists)
- Create branch and a git worktree at `../dms/story-${story}`
- Implement the story from within the worktree directory
- During implementation, use `mcp_context7_query-docs` for unfamiliar APIs and Playwright for UI checks

If `code-story.prompt.md` encounters issues, it must use the prompt skill or handle internal retries as required.

**IMMEDIATELY PROCEED TO PHASE 3** once `code-story.prompt.md` returns — do not pause, do not ask for confirmation. Use the bash MCP server to run `pnpm i` with `cwd` set to `../dms/story-${story}`, then begin Phase 3.

**IMPORTANT**: All subsequent phases (3 through 7) must run from within the worktree at `../dms/story-${story}`.

## Phase 3 Quality Validation

Delegate Phase 3 to a dedicated validation subagent:

```bash
run #file:./quality-validation.prompt.md context=story-${story}
```

This keeps the story workflow context small while the validation loop handles:

1. `CI=1 pnpm all`
2. `pnpm e2e:dms-material:chromium`
3. `pnpm e2e:dms-material:firefox`
4. `pnpm dupcheck`
5. `pnpm format`
6. Code self-review of changed files only (`git diff --name-only origin/main...HEAD`) using `.github/instructions/code-review.md`

**CRITICAL**: The validation subagent must follow the shared quality-validation loop exactly. If ANY check fails and gets fixed, it restarts from step 1 and only returns when all checks pass in a single iteration.

**CRITICAL**: Do not ignore or skip any validation failures because they are not related to this story. All failures must be addressed and resolved before proceeding to the next phase regardless of where or when it originated. This ensures the overall quality and stability of the codebase is maintained. If a test fails it is either due to being missed in a previous story or because something we did in this story caused a regression. In either case, it must be fixed before proceeding.

If the validation subagent returns `VALIDATION FAILED`, use the prompt skill to ask: `Phase 3 validation failed for ${story}: <reason>. Reply with stop, continue, or instructions.`

## PHASE 4: QA Review

Delegate Phase 4 to a dedicated QA review subagent:

```bash
run #file:./qa-review-loop.prompt.md story=${story}
```

This keeps the story workflow context small while the QA review subagent handles:

1. Running `gate.prompt.md`
2. Interpreting PASS/FAIL results
3. Applying QA remediation automatically
4. Re-running validation through `quality-validation.prompt.md`
5. Retrying the gate up to 10 times

**CRITICAL**: The QA review subagent must not return success until the gate passes. If it returns `QA FAILED`, use the prompt skill to ask: `QA review failed for ${story}: <reason>. Reply with stop, continue, or instructions.`

When it returns `QA PASSED`: IMMEDIATELY move to Phase 5.

## PHASE 5: Commit and PR Creation

Once all validations pass:

run #file:./commit-and-pr.prompt.md

This will:

- Format code one final time
- Commit changes with proper message linking GitHub issue
- Create PR with auto-generated description from story Change Log
- Link PR to GitHub issue for auto-close on merge

**Rate Limit Protection**: Wait 5 minutes after PR creation before checking CodeRabbit status

If commit-and-pr fails: Use the prompt skill to ask: `Failed to create PR: <error>. Reply with stop, continue, or instructions.`

**IMMEDIATELY PROCEED TO PHASE 6** once `commit-and-pr.prompt.md` returns successfully — do not pause or wait for human input.

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

Then call the subagent to handle the full CodeRabbit loop:

```bash
run #file:./code-rabbit.prompt.md story=${story}
```

The `code-rabbit` subagent will poll `mcp_github_pull_request_read method:get_review_comments`, classify suggestions, apply in-scope fixes, run Phase 3 validations, commit/push, and loop until the PR is ready to merge or max iterations are reached. It updates the `.git/tmp/story-${story}-meta.json` file as it proceeds so the process can be resumed safely.

Use the `code-rabbit.prompt.md` subagent to keep the story prompt small, idempotent, and resumable.

**IMMEDIATELY PROCEED TO PHASE 7** once `code-rabbit.prompt.md` returns — do not pause or wait for human input.

## PHASE 7: Final Merge

Delegate Phase 7 to a dedicated merge/finalize subagent:

```bash
run #file:./merge-finalize.prompt.md story=${story}
```

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
