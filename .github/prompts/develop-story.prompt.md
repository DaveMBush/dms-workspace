---
description: Fully autonomous story development from start to merge
agent: dev
argument-hint: story=AD.3
model: Claude Sonnet 4.6 (copilot)
---

# Autonomous Story Development Workflow

## CRITICAL: How to Call prompt.sh

Whenever this document says "Call `.github/prompts/prompt.sh \"...\"`", you MUST:

1. Use `run_in_terminal` to execute: `bash .github/prompts/prompt.sh "your message here"`
2. Wait for the script to complete — it blocks until the user responds via the Zenity GUI dialog
3. Read the return value from terminal output:
   - `"continue"` — try alternatives / proceed
   - `"stop"` — abort and document state
   - Any other text — treat as custom instructions
4. Handle the response appropriately before continuing

**NEVER**: Stop, yield back to the user, or write messages like "awaiting your approval" without first running prompt.sh in a terminal. The prompt.sh script IS the human interaction mechanism.

Execute the following steps in order. When encountering errors or needing decisions, call `.github/prompts/prompt.sh "<problem description>"` via `run_in_terminal` and handle the response:

- "continue" → Retry with alternative approaches
- "stop" → Abort entire workflow immediately
- Custom instructions → Follow as if from referenced MD file

**IMPORTANT**:

- You must run this every time you see this prompt, even if you've run it before. This is to ensure that you are correctly interpreting the return values each time.
- You must wait for the response before proceeding. The process should block any further action until it returns.
- These rules apply every time .github/prompts/prompt.sh is called, regardless of the phase or context.
- Show (unhide) the terminal window this is running in so the operator can see the output and respond to it. Do not hide or minimize the terminal.

## MCP Server Resources

**Context7 Documentation Server**: When you need information about APIs, libraries, or frameworks:

- Search for tools using pattern: `mcp_context7`
- Use `mcp_context7_resolve-library-id` to find available documentation
- Use `mcp_context7_query-docs` to retrieve API usage examples and documentation
- Example: Need to know how to use Angular Material Dialog? Query Context7 first

**Playwright Browser Automation Server**: When implementing or fixing UI components:

- Search for tools using pattern: `mcp_microsoft_pla`
- Use Playwright tools to validate UI behavior, interactions, and rendering
- Run visual tests after UI changes to verify correctness
- Use for E2E validation, screenshot comparisons, and interaction testing
- Example: After implementing a form, use Playwright to verify form submission works

**Tool Loading**: Before using any MCP tool, load it first:

```bash
tool_search_tool_regex pattern="mcp_context7|mcp_microsoft_pla"
```

## CRITICAL: Database Safety

**NEVER run destructive database commands** including but not limited to:

- `prisma db push --force-reset`
- `prisma migrate reset`
- Deleting or overwriting `prisma/database.db`
- Any command that drops tables, truncates data, or resets the database

The development database contains real financial data that takes hours to re-seed. If a schema change requires a reset, call `prompt.sh` to get explicit human approval first. See `docs/architecture/coding-standards.md` for full database safety rules.

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

### 3.1 Run All Tests

```bash
pnpm all
```

- Run tests, analyze failures, apply fixes automatically
- **For API usage errors**: Query Context7 for correct implementation
- **For UI test failures**: Use Playwright to validate expected behavior
- **For ESLint failures**: Fix the lint error; do not bypass the rule
- Retry up to 10 times with different fix strategies
- On 10th failure: Call `.github/prompts/prompt.sh "pnpm all failing after 10 attempts with errors: <error summary>"`
- **If fixed**: After applying fixes, restart Phase 3 from step 3.1

### 3.2 Run E2E Tests

```bash
pnpm e2e:dms-material:chrome
pnpm e2e:dms-material:firefox
```

- E2E tests run sequentially and may take 10+ minutes
- Analyze failures (flaky tests, timing issues) and apply fixes
- Use Playwright for manual validation when needed
- Retry up to 10 times; on 10th failure call `.github/prompts/prompt.sh "E2E tests failing after 10 attempts with errors: <error summary>"`
  **If fixed**: After applying fixes, restart Phase 3 from step 3.

### 3.3 Check Duplicates

```bash
pnpm dupcheck
```

- Run check, identify duplicate code
- Refactor duplicates if straightforward
- Retry up to 10 times with different refactoring strategies
- On 10th failure: Call `.github/prompts/prompt.sh "Duplicate code detected after 10 refactoring attempts: <duplicate details>"`
- **If fixed**: After applying fixes, restart Phase 3 from step 3.1

### 3.4 Format Code

```bash
pnpm format
```

- Should rarely fail
- If fails: Call `.github/prompts/prompt.sh "pnpm format failed: <error>"`
- **If fixed**: After applying fixes, restart Phase 3 from step 3.1

### 3.4 Phase 3 Completion Check

- If ALL four checks (3.1, 3.2, 3.3, 3.4) pass in the same iteration: Proceed to Phase 4
- If any check fails and gets fixed: Return to step 3.1 and run all checks again
- If Phase 3 loop reaches 10 complete iterations: Call `.github/prompts/prompt.sh "Phase 3 validation loop reached 10 iterations without all checks passing"`

**Phase 3 MCP Usage**:

- Use Playwright to do spot checks on UI functionality after fixes
- Use Context7 to verify API usage is correct according to official docs

**Critical**: All Phase 3 checks must pass in a single iteration before proceeding to Phase 4.

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

```
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

When prompt.sh returns:

- **"continue"**:

  - Try alternative solution approaches
  - **Use Context7** to research correct approaches
  - **Use Playwright** to validate assumptions about UI behavior
  - Attempt fixes with different strategies
  - If still stuck after 5 more attempts: Call prompt.sh again with updated context

- **"stop"**:

  - Document current state in story Debug Log
  - Commit progress with "[WIP] Story ${story} - stopped at <phase>"
  - DO NOT merge
  - Report final state and exit

- **Custom instructions**:
  - Parse instructions as additional guidance
  - Apply guidance to current problem
  - Continue workflow from interruption point

## Success Criteria

✅ All 7 phases complete without "stop" command = Story fully implemented, reviewed, and merged

## Rate Limit Notes

- 5-minute wait after initial PR creation
- 5-minute wait after each CodeRabbit fix commit
- Protects against CodeRabbit API rate limiting
- Total workflow may take 50+ minutes if all CodeRabbit iterations used

## MCP Best Practices

**Context7 Usage**:

- Query BEFORE implementing unfamiliar APIs
- Verify deprecated patterns aren't being used
- Check for breaking changes in library versions
- Get code examples for complex integrations

**Playwright Usage**:

- Validate UI after every UI component change
- Test user interactions (clicks, form fills, navigation)
- Verify responsive behavior if relevant
- Take screenshots for visual regression checking
- Test error states and edge cases

**When to Load MCP Tools**:

- Load relevant tools at start of Phase 2 (implementation)
- Keep tools loaded throughout Phase 3-6 (testing/fixing)
- Pattern: `tool_search_tool_regex pattern="mcp_context7|mcp_microsoft_pla"`

## Notes

- This workflow is designed for zero human intervention on happy path
- Human involvement only via prompt.sh when decisions/help needed
- All git, issue, and PR operations are automated
- Maintains quality gates while maximizing autonomy
- Generous 10-attempt retry limits reduce false failures
- MCP servers provide additional validation and documentation resources
