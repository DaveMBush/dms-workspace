---
description: Fully autonomous story development from start to merge
agent: dev
argument-hint: story=AD.3
model: Claude Sonnet 4.6 (copilot)
---

# Autonomous Story Development Workflow

**IMPORTANT**: This workflow uses the bmad-workflow skill. Read and apply:

- run #file:./bmad-workflow.SKILL.md

Key points from bmad-workflow skill:

- **Human Interaction**: Use `prompt.sh` with `timeout: 0` (no timeout)
- **Database Safety**: Never run destructive database commands
- **MCP Servers**: Load Context7 and Playwright tools before use
- **Quality Validation**: Run full validation loop (all tests, e2e, dupcheck, format)
- **CodeRabbit**: Follow review loop pattern with rate limiting

## PHASE 1: Pre-Development Validation

1. Verify story file exists at `docs/stories/${story}.md`
   - If not found: Call `.github/prompts/prompt.sh "Story file docs/stories/${story}.md not found"`
2. Verify story status is "Ready for Development" (not "Draft")
   - If Draft: Call `.github/prompts/prompt.sh "Story ${story} is still in Draft status"`
3. Verify git working directory is clean
   - If dirty: Call `.github/prompts/prompt.sh "Git working directory has uncommitted changes"`
4. Verify currently on main branch and it's up to date with remote
   - If issues: switch to main branch.
5. Check if GitHub issue already exists for this story (search by story ID in title)
6. Check if branch already exists for this story
   - If exists: Call `.github/prompts/prompt.sh "Branch for story ${story} already exists"`

## PHASE 2: Story Implementation

run #file:./code-story.prompt.md story=${story}

This will:

- Create GitHub issue (if not exists)
- Create and checkout branch
- Implement the story using the delegated implementation workflow
- During implementation, use `mcp_context7_query-docs` for unfamiliar APIs and Playwright for UI checks

If `code-story.prompt.md` encounters issues, it must call `.github/prompts/prompt.sh` or handle internal retries as required.

## Phase 3 Quality Validation

**Run the Quality Validation Loop from bmad-workflow skill** (see skill for full details):

All commands and retry logic are defined in the bmad-workflow skill. Summary:

1. `pnpm all` - Run all tests (10 retries, use Context7 for API errors)
2. `pnpm e2e:dms-material:chromium` and `firefox` - E2E tests (10 retries, use Playwright)
3. `pnpm dupcheck` - Check for duplicates (10 retries, refactor)
4. `pnpm format` - Format code

**CRITICAL**: If ANY check fails and gets fixed, restart from step 1. All checks must pass in a single iteration.

See "Quality Validation Loop" section in bmad-workflow skill for full instructions, retry logic, and MCP usage patterns.

## PHASE 4: QA Review

Run QA gate up to 10 times:

run #file:./gate.prompt.md story=${story}

- For each failed attempt:
  - Apply QA fix recommendations automatically
  - **Use Context7** if QA mentions incorrect API usage
  - **Use Playwright** if QA mentions UI/UX issues
  - Re-run ALL of Phase 3 (tests, e2e, dupcheck, format)
  - Retry gate review
- On 10th failure: Call `.github/prompts/prompt.sh "QA gate review failing after 10 attempts with issues: <issue summary>"`

**Critical**: Gate must pass before proceeding.

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

## PHASE 6: CodeRabbit Review Loop (delegated)

Phase 6 has been delegated to a dedicated, resumable subagent. After Phase 5 completes the `commit-and-pr` step MUST write a minimal metadata file at `.git/tmp/story-${story}-meta.json` with at least:

```json
{
  "pr": <pr_number>,
  "branch": "<branch-name>",
  "repo": "<owner>/<repo>",
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

## PHASE 7: Final Merge

### 7.1 Verify PR Mergeable

Check that PR has:

- ✅ All CI/CD checks passing
- ✅ No merge conflicts
- ✅ Issue linkage present (#<issue-number>)
- ✅ CodeRabbit approved or no blocking comments

**Optional Final Validation**:

- If story involves UI changes: Run quick Playwright validation of key flows
- If story involves new API usage: Quick Context7 check for deprecation warnings

If any check fails: Call `.github/prompts/prompt.sh "PR not ready to merge: <specific issues>"`

### 7.2 Merge PR

- By this point, all checks should be green and there should be no coderabbit blocking comments so you can merge without waiting for human approval. If you encounter any issues during merge (e.g. unexpected conflicts, GitHub API errors), call `.github/prompts/prompt.sh "PR merge failed: <error>"` so a human can intervene.
- Use "Squash and merge" strategy
- Verify merge successful
- If merge fails: Call `.github/prompts/prompt.sh "PR merge failed: <error>"`

### 7.3 Verify Post-Merge

- Check that linked GitHub issue auto-closed
- If issue not closed: Call `.github/prompts/prompt.sh "GitHub issue did not auto-close after PR merge"`

### 7.4 Local Cleanup

- Checkout main branch locally
- Pull latest changes
- Delete local story branch
- Verify clean state

### 7.5 Report Completion

Generate summary report:

```text
✅ Story ${story} Complete

- GitHub Issue: #<issue-number> (closed)
- Pull Request: #<pr-number> (merged)
- Files Changed: <count>
- Tests: All passing
- E2E Tests: All passing
- Code Quality: No duplicates
- Code Review: CodeRabbit approved
- MCP Tools Used: Context7 (<query count>), Playwright (<test count>)

Implementation complete and merged to main.
```

## Error Recovery Strategy

**See "Error Recovery Strategy" in bmad-workflow skill for full details.**

Summary:

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
