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
- Implement the story using \*develop-story command

**During Implementation**:

- **Unknown APIs**: Use Context7 to look up documentation before implementing
- **UI Components**: After implementing, validate with Playwright browser tests
- **API Integration**: Query Context7 for proper usage patterns and best practices

If code-story.prompt.md encounters issues, it should handle them internally or call prompt.sh.

## PHASE 3: Quality Validation (with auto-fix)

**CRITICAL LOOP STRUCTURE**: After fixing any errors in steps 3.1-3.4, you MUST re-run ALL steps from the beginning (3.1 → 3.2 → 3.3 → 3.4) until ALL four checks pass in a single iteration with no errors.

**Max Phase 3 Loop Iterations**: 10

For each step, attempt up to 10 times with automatic fixes between attempts:

### 3.1 Run All Tests

```bash
pnpm all
```

- Run tests, analyze failures, apply fixes automatically
- **For API usage errors**: Query Context7 for correct implementation
- **For UI test failures**: Use Playwright to validate expected behavior
- **For ESLint failures**: Fix the lint error, do not comment exclude the problem or otherwise circumvent fixing the problem.
- Retry up to 10 times with different fix strategies each time
- On 10th failure: Call `.github/prompts/prompt.sh "pnpm all failing after 10 attempts with errors: <error summary>"`
- **If fixed**: After applying fixes, restart Phase 3 from step 3.1

### 3.2 Run E2E Tests

```bash
pnpm e2e:dms-material
```

**Note**: E2E tests take over 10 minutes to complete because tests run sequentially one at a time to avoid database collisions. This is expected behavior.

- Run tests, analyze failures (flaky tests, timing issues, etc.)
- **For UI interaction failures**: Use Playwright to manually validate the flow
- **For unclear API behavior**: Query Context7 for expected behavior
- Apply fixes and retry up to 10 times
- On 10th failure: Call `.github/prompts/prompt.sh "E2E tests failing after 10 attempts with errors: <error summary>"`
- **If fixed**: After applying fixes, restart Phase 3 from step 3.1

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

### Phase 3 Completion Check

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

## PHASE 6: CodeRabbit Review Loop

**Max iterations: 10** (prevents infinite loops)

For each iteration:

### 6.1 Wait for CodeRabbit Review

- If first iteration: Already waited 5 minutes after PR creation
- **CRITICAL**: Before polling, call `activate_repository_inspection_tools` to ensure `mcp_github_pull_request_read` is available
- **CRITICAL**: Use `mcp_github_pull_request_read` with `method: "get_review_comments"` to poll every 30 seconds
- **CRITICAL**: Wait for CodeRabbit to COMPLETE its review, not just start it
  - Review is complete when comment body does NOT contain "Currently processing" or "review in progress"
  - Review threads will be populated when complete
- Timeout: 10 minutes from when review starts processing
- If timeout: Call `.github/prompts/prompt.sh "CodeRabbit review timed out after 10 minutes"`

### 6.2 Retrieve and Evaluate Suggestions

- **CRITICAL**: Ensure `activate_repository_inspection_tools` has been called so `mcp_github_pull_request_read` is available
- **CRITICAL**: Retrieve inline review thread comments using `mcp_github_pull_request_read` with `method: "get_review_comments"` — do NOT use `github-pull-request_issue_fetch` which only returns issue-level comments and will MISS all inline file/line-level review suggestions
- If no suggestions from `get_review_comments`: Proceed to Phase 7
- If suggestions exist:
  - Categorize each: valid/invalid, in-scope/out-of-scope
  - **For API-related suggestions**: Query Context7 to verify best practices
  - **For UI-related suggestions**: Validate with Playwright if needed
  - For valid + in-scope: Plan fixes
  - For others: Document reasoning in PR comment

### 6.3 Apply Fixes

- Implement all valid, in-scope suggestions
- **Use Context7** for guidance on proper API implementations
- **Use Playwright** to validate UI fixes work as expected
- Retry up to 10 times per suggestion if implementation encounters issues
- If unable to implement after 10 attempts:
  - Call `.github/prompts/prompt.sh "Unable to implement CodeRabbit suggestion after 10 attempts: <suggestion details>"`
  - Handle response before proceeding

### 6.4 Quality Validation and Commit

- **CRITICAL**: Run ALL Phase 3 validations before committing:

  - `pnpm all` - must pass
  - `pnpm e2e:dms-material` - must pass
  - `pnpm dupcheck` - must pass
  - `pnpm format` - must pass
  - If any validation fails: Fix issues and re-run ALL validations until they pass
  - Follow same retry/fix logic as Phase 3 (up to 10 attempts per validation)
  - If validations fail after 10 attempts: Call `.github/prompts/prompt.sh "Quality validation failed after applying CodeRabbit fixes: <error>"`

- Only after ALL validations pass:

  - Commit with message: "Apply CodeRabbit suggestions"
  - Push to branch
  - **Wait 5 minutes** (rate limit protection for CodeRabbit)
  - Return to 6.1 (new iteration)

- If no changes possible or needed: Proceed to Phase 7

### 6.5 Iteration Limit Check

- If iteration 10 reached and still have suggestions:
  - Call `.github/prompts/prompt.sh "Reached 10 iterations of CodeRabbit feedback, still have suggestions: <summary>"`

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
