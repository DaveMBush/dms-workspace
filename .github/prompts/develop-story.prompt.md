---
description: Fully autonomous story development from start to merge
argument-hint: story=AD.3
model: Claude Sonnet 4.6 (copilot)
---

# Autonomous Story Development Workflow

## PHASE 1: Pre-Development Validation

1. Verify story file exists at `_bmad-output/implementation-artifacts/${story}.md`
   - If not found: Call `.github/prompts/prompt.sh "Story file _bmad-output/implementation-artifacts/${story}.md not found"`
2. Verify story status is "Ready for Development" (not "Draft")
   - If Draft: Call `.github/prompts/prompt.sh "Story ${story} is still in Draft status"`
3. Verify git working directory is clean
   - If dirty: Call `.github/prompts/prompt.sh "Git working directory has uncommitted changes"`
4. Verify currently on main branch and it's up to date with remote
   - If issues: switch to main branch.
5. Check if GitHub issue already exists for this story (search by story ID in title)
6. Check if branch already exists for this story
   - If exists: Call `.github/prompts/prompt.sh "Branch for story ${story} already exists"`
7. Check if worktree already exists at `../dms/story-${story}`
   - If exists: Call `.github/prompts/prompt.sh "Worktree for story ${story} already exists at ../dms/story-${story}"`

## PHASE 2: Story Implementation

run #file:./code-story.prompt.md story=${story}

This will:

- Create GitHub issue (if not exists)
- Create branch and a git worktree at `../dms/story-${story}`
- Implement the story from within the worktree directory
- During implementation, use `mcp_context7_query-docs` for unfamiliar APIs and Playwright for UI checks

If `code-story.prompt.md` encounters issues, it must call `.github/prompts/prompt.sh` or handle internal retries as required.

**IMMEDIATELY PROCEED TO PHASE 3** once `code-story.prompt.md` returns — do not pause, do not ask for confirmation. cd to `../dms/story-${story}` and run `pnpm i` now, then begin Phase 3.

**IMPORTANT**: All subsequent phases (3 through 7) must run from within the worktree at `../dms/story-${story}`.

## Phase 3 Quality Validation

Delegate Phase 3 to a dedicated validation subagent:

```bash
run #file:./quality-validation.prompt.md context=story-${story}
```

This keeps the story workflow context small while the validation loop handles:

1. `pnpm all`
2. `pnpm e2e:dms-material:chromium`
3. `pnpm e2e:dms-material:firefox`
4. `pnpm dupcheck`
5. `pnpm format`
6. Code self-review of changed files only (`git diff --name-only origin/main...HEAD`) using `.github/instructions/code-review.md`

**CRITICAL**: The validation subagent must follow the shared quality-validation loop exactly. If ANY check fails and gets fixed, it restarts from step 1 and only returns when all checks pass in a single iteration.

If the validation subagent returns `VALIDATION FAILED`, call `.github/prompts/prompt.sh "Phase 3 validation failed for ${story}: <reason>"`.

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

**CRITICAL**: The QA review subagent must not return success until the gate passes. If it returns `QA FAILED`, call `.github/prompts/prompt.sh "QA review failed for ${story}: <reason>"`.

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

If commit-and-pr fails: Call `.github/prompts/prompt.sh "Failed to create PR: <error>"`

**IMMEDIATELY PROCEED TO PHASE 6** once `commit-and-pr.prompt.md` returns successfully — do not pause or wait for human input.

## PHASE 6: CodeRabbit Review Loop (delegated)

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

**CRITICAL**: The merge subagent must not return success until the PR is merged and cleanup is complete. If it returns `MERGE FAILED`, call `.github/prompts/prompt.sh "Final merge failed for ${story}: <reason>"`.

When it returns `MERGE COMPLETE`: the story workflow is complete.

## Error Recovery Strategy

- `"continue"`: Try alternatives, use Context7/Playwright, retry
- `"stop"`: Document state, commit as WIP, exit
- Custom instructions: Apply guidance, continue workflow

## Success Criteria

✅ All 7 phases complete without "stop" command = Story fully implemented, reviewed, and merged

## Notes

- This workflow is designed for zero human intervention on happy path
- Human involvement only via prompt.sh when decisions/help needed
- All quality gates maintained while maximizing autonomy
- MCP servers provide validation and documentation resources
- See bmad-workflow skill for detailed patterns and best practices
