---
description: Fully autonomous epic debug prompt
agent: dev
argument-hint: epic=AD story=AD.5
model: Claude Sonnet 4.6 (copilot)
---

# Autonomous Epic Bug Fix Workflow

## CRITICAL: Human Interaction Rules

**NEVER stop, yield back to the user, or pause execution without first calling `prompt.sh`.**

When human input is needed:

1. Run the script in a terminal: `bash .github/prompts/prompt.sh "<your message>"`
2. Wait for the return value — the process BLOCKS until the user responds
3. Handle the response ("continue", "stop", or custom instructions)
4. Only THEN proceed or halt

Violating this rule by pausing without calling `prompt.sh` defeats the purpose of the autonomous workflow.

## PHASE 1: Epic Discovery and Validation

1. Load the epic ${epic}
   - If not found: Call `.github/prompts/prompt.sh "Epic file docs/epics/${epic}.md not found"`
2. Verify epic status is "Ready for Debugging" (not "Draft")
   - If Draft: Call `.github/prompts/prompt.sh "Epic ${epic} is still in Draft status"`
3. Verify git working directory is clean
   - If dirty: Call `.github/prompts/prompt.sh "Git working directory has uncommitted changes"`
4. Verify currently on main branch and it's up to date with remote
   - If issues: switch to main branch.

## PHASE 2: Create Debug Branch

1. Load the `tool_search_tool_regex` tool to access GitHub MCP tools:
   ```bash
   tool_search_tool_regex pattern="mcp_github"
   ```
2. Create a GitHub issue for ${story} using `mcp_github_issue_write`
   - Title: "[Debug] ${story} - <brief description>"
   - Body: Reference to epic and story details
3. Create a branch in GitHub for that issue using `mcp_github_create_branch`
   - Branch name: `debug/${story}-<issue-number>`
   - From: `main`
4. Checkout the branch locally:
   ```bash
   git fetch origin
   git checkout debug/${story}-<issue-number>
   ```

## PHASE 3: Implement Debug Fix

### 3.1 Prompt the user for a bug to fix using `.github/prompts/prompt.sh "Please describe the bug to fix:"` and wait for their response.

### 3.2 Analyze the bug report, identify the root cause and fix.

If relevant, use the Playwright MCP server to help you see the problem and confirm that you've fixed the problem.

## PHASE 4: Quality Validation (with auto-fix)

**CRITICAL LOOP STRUCTURE**: After fixing any errors in steps 4.1-4.4, you MUST re-run ALL steps from the beginning (4.1 → 4.2 → 4.3 → 4.4) until ALL four checks pass in a single iteration with no errors.

**Max Phase 4 Loop Iterations**: 10

For each step, attempt up to 10 times with automatic fixes between attempts:

### 4.1 Run All Tests

```bash
pnpm all
```

- Run tests, analyze failures, apply fixes automatically
- **For API usage errors**: Query Context7 for correct implementation
- **For UI test failures**: Use Playwright to validate expected behavior
- **For ESLint failures**: Fix the lint error, do not comment exclude the problem or otherwise circumvent fixing the problem.
- Retry up to 10 times with different fix strategies each time
- On 10th failure: Call `.github/prompts/prompt.sh "pnpm all failing after 10 attempts with errors: <error summary>"`
- **If fixed**: After applying fixes, restart Phase 4 from step 4.1

### 4.2 Run E2E Tests

```bash
pnpm e2e:dms-material
```

**Note**: E2E tests take over 10 minutes to complete because tests run sequentially one at a time to avoid database collisions. This is expected behavior.

- Run tests, analyze failures (flaky tests, timing issues, etc.)
- **For UI interaction failures**: Use Playwright to manually validate the flow
- **For unclear API behavior**: Query Context7 for expected behavior
- Apply fixes and retry up to 10 times
- On 10th failure: Call `.github/prompts/prompt.sh "E2E tests failing after 10 attempts with errors: <error summary>"`
- **If fixed**: After applying fixes, restart Phase 4 from step 4.1

### 4.3 Check Duplicates

```bash
pnpm dupcheck
```

- Run check, identify duplicate code
- Refactor duplicates if straightforward
- Retry up to 10 times with different refactoring strategies
- On 10th failure: Call `.github/prompts/prompt.sh "Duplicate code detected after 10 refactoring attempts: <duplicate details>"`
- **If fixed**: After applying fixes, restart Phase 4 from step 4.1

### 4.4 Format Code

```bash
pnpm format
```

- Should rarely fail
- If fails: Call `.github/prompts/prompt.sh "pnpm format failed: <error>"`
- **If fixed**: After applying fixes, restart Phase 4 from step 4.1

### Phase 4 Completion Check

- If ALL four checks (4.1, 4.2, 4.3, 4.4) pass in the same iteration: Proceed to Phase 5
- If any check fails and gets fixed: Return to step 4.1 and run all checks again
- If Phase 4 loop reaches 10 complete iterations: Call `.github/prompts/prompt.sh "Phase 4 validation loop reached 10 iterations without all checks passing"`

**Phase 4 MCP Usage**:

- Use Playwright to do spot checks on UI functionality after fixes
- Use Context7 to verify API usage is correct according to official docs

**Critical**: All Phase 4 checks must pass in a single iteration before proceeding to Phase 5.

## PHASE 5: Next Bug Decision

After current bug fix validated, ask if another bug to fix in same branch:

Call `.github/prompts/prompt.sh "Bug fix validated. Fix another bug in this branch?"` and handle the response:

- **"continue"**: Make a second call to get bug description:
  - Call `.github/prompts/prompt.sh "Please describe the bug to fix:"`
  - Use the response as the bug description and return to PHASE 3.1
- **"stop"**: Proceed to Phase 6 (create PR with all fixes)
- **Custom text** (user typed a bug description): Use that text as the bug description and return to PHASE 3.1

**Note**: All bugs fixed in Phase 5 loop will be in ONE PR for atomic review.

## PHASE 6: Commit and PR Creation

Once all bugs are fixed and no more bug work requested:

run #file:./commit-and-pr.prompt.md

This will:

- Format code one final time
- Commit changes with proper message linking GitHub issue
- Create PR with auto-generated description from story Change Log
- Link PR to GitHub issue for auto-close on merge

**Rate Limit Protection**: Wait 5 minutes after PR creation before checking CodeRabbit status

If commit-and-pr fails: Call `.github/prompts/prompt.sh "Failed to create PR: <error>"`

## PHASE 7: CodeRabbit Review Loop

**Max iterations: 10** (prevents infinite loops)

For each iteration:

### 7.1 Wait for CodeRabbit Review

- If first iteration: Already waited 5 minutes after PR creation
- **CRITICAL**: Before polling, use `tool_search_tool_regex pattern="mcp_github"` to load GitHub MCP tools if not already loaded
- **CRITICAL**: Use `mcp_github_pull_request_read` with `method: "get_review_comments"` to poll every 30 seconds
- **CRITICAL**: Wait for CodeRabbit to COMPLETE its review, not just start it
  - Review is complete when comment body does NOT contain "Currently processing" or "review in progress"
  - Review threads will be populated when complete
- Timeout: 10 minutes from when review starts processing
- If timeout: Call `.github/prompts/prompt.sh "CodeRabbit review timed out after 10 minutes"`

### 7.2 Retrieve and Evaluate Suggestions

- **CRITICAL**: Ensure GitHub MCP tools have been loaded via `tool_search_tool_regex` so `mcp_github_pull_request_read` is available
- **CRITICAL**: Retrieve inline review thread comments using `mcp_github_pull_request_read` with `method: "get_review_comments"` — do NOT use `github-pull-request_issue_fetch` which only returns issue-level comments and will MISS all inline file/line-level review suggestions
- If no suggestions from `get_review_comments`: Proceed to Phase 8
- If suggestions exist:
  - Categorize each: valid/invalid, in-scope/out-of-scope
  - **For API-related suggestions**: Query Context7 to verify best practices
  - **For UI-related suggestions**: Validate with Playwright if needed
  - For valid + in-scope: Plan fixes
  - For others: Document reasoning in PR comment

### 7.3 Apply Fixes

- Implement all valid, in-scope suggestions
- **Use Context7** for guidance on proper API implementations
- **Use Playwright** to validate UI fixes work as expected
- Retry up to 10 times per suggestion if implementation encounters issues
- If unable to implement after 10 attempts:
  - Call `.github/prompts/prompt.sh "Unable to implement CodeRabbit suggestion after 10 attempts: <suggestion details>"`
  - Handle response before proceeding

### 7.4 Quality Validation and Commit

- **CRITICAL**: Run ALL Phase 4 validations before committing:

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
  - Return to 7.1 (new iteration)

- If no changes possible or needed: Proceed to Phase 8

### 7.5 Iteration Limit Check

- If iteration 10 reached and still have suggestions:
  - Call `.github/prompts/prompt.sh "Reached 10 iterations of CodeRabbit feedback, still have suggestions: <summary>"`

## PHASE 8: Final Merge

### 8.1 Verify PR Mergeable

Check that PR has:

- ✅ All CI/CD checks passing
- ✅ No merge conflicts
- ✅ Issue linkage present (#<issue-number>)
- ✅ CodeRabbit approved or no blocking comments

**Optional Final Validation**:

- If story involves UI changes: Run quick Playwright validation of key flows
- If story involves new API usage: Quick Context7 check for deprecation warnings

If any check fails: Call `.github/prompts/prompt.sh "PR not ready to merge: <specific issues>"`

### 8.2 Merge PR

- By this point, all checks should be green and there should be no coderabbit blocking comments so you can merge without waiting for human approval. If you encounter any issues during merge (e.g. unexpected conflicts, GitHub API errors), call `.github/prompts/prompt.sh "PR merge failed: <error>"` so a human can intervene.
- Use "Squash and merge" strategy
- Verify merge successful
- If merge fails: Call `.github/prompts/prompt.sh "PR merge failed: <error>"`

### 8.3 Verify Post-Merge

- Check that linked GitHub issue auto-closed
- If issue not closed: Call `.github/prompts/prompt.sh "GitHub issue did not auto-close after PR merge"`

### 8.4 Local Cleanup

- Checkout main branch locally
- Pull latest changes
- Delete local story branch
- Verify clean state

### 8.5 Report Completion

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

**Workflow Complete** - All bugs fixed in this session have been merged.

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

✅ All 8 phases complete without "stop" command = All bugs fixed, reviewed, and merged
✅ Multiple bugs can be fixed in Phase 5 loop before PR creation
✅ One branch, one PR, one merge for all bugs in session

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

- Load GitHub tools at start of Phase 2: `tool_search_tool_regex pattern="mcp_github"`
- Load dev tools at start of Phase 3: `tool_search_tool_regex pattern="mcp_context7|mcp_microsoft_pla"`
- Keep tools loaded throughout remaining phases (no need to reload)

## Notes

- This workflow is designed for zero human intervention on happy path
- Human involvement only via prompt.sh when decisions/help needed
- All git, issue, and PR operations are automated
- Maintains quality gates while maximizing autonomy
- Generous 10-attempt retry limits reduce false failures
- MCP servers provide additional validation and documentation resources
