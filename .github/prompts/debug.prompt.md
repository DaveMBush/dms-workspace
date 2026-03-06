---
description: Fully autonomous epic debug prompt
agent: dev
argument-hint: epic=AD story=AD.5
model: Claude Sonnet 4.6 (copilot)
---

# Autonomous Epic Bug Fix Workflow

**IMPORTANT**: This workflow uses the bmad-workflow skill. Read and apply:

- run #file:./bmad-workflow.SKILL.md

Key points from bmad-workflow skill:

- **Human Interaction**: Use `prompt.sh` with `timeout: 0` (no timeout)
- **Database Safety**: Never run destructive database commands
- **MCP Servers**: Load Context7 and Playwright tools before use
- **Quality Validation**: Run full validation loop (all tests, e2e, dupcheck, format)
- **CodeRabbit**: Follow review loop pattern with rate limiting

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

**CRITICAL**: After calling prompt.sh, do NOTHING until the user responds. Do NOT start servers, run manual tests, do code reviews, or perform any speculative work while waiting. The prompt.sh call BLOCKS — your only job is to wait for the response and then act on it.

### 3.2 Analyze the bug report, identify the root cause and fix.

If relevant, use the Playwright MCP server to help you see the problem and confirm that you've fixed the problem.

## PHASE 4: Quality Validation (with auto-fix)

**Run the Quality Validation Loop from bmad-workflow skill**.

See "Quality Validation Loop" section in bmad-workflow skill for:

- Full validation steps (pnpm all, e2e tests, dupcheck, format)
- Retry logic (10 attempts per step)
- MCP usage (Context7 for API errors, Playwright for UI issues)
- Critical loop structure (restart from step 1 if any check fails and gets fixed)

All checks must pass in a single iteration before proceeding to Phase 5.

### 4.1 Run All Tests

```bash
pnpm all
```

- Run tests, analyze failures, apply fixes automatically
- **For API usage errors**: Query Context7 for correct implementation
- **For UI test failures**: Use Playwright to validate expected behavior

## PHASE 5: Next Bug Decision

After current bug fix validated, ask if another bug to fix in same branch:

**CRITICAL**: Use `timeout: 0` when calling `prompt.sh`:

```typescript
run_in_terminal({
  command: 'bash .github/prompts/prompt.sh "Bug fix validated. Fix another bug in this branch?"',
  explanation: 'Asking if another bug should be fixed',
  goal: 'Get user decision',
  isBackground: false,
  timeout: 0, // CRITICAL: No timeout
});
```

Handle the response (see "Exit Code 130 Handling" in bmad-workflow skill for details):

- **"continue"** OR any affirmative: Make a second call for bug description
- **"stop"**: Proceed to Phase 6 (create PR with all fixes)
- **Exit code 130**: Retry up to 3 times before treating as "stop"
- **Custom text**: Use as bug description and return to PHASE 3.1

**Do NOT treat exit code 130 as an implicit "stop" on the first occurrence — it most likely means the dialog was still open and the agent was restarted/summarized, not that the user chose to stop.**

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

## PHASE 7: CodeRabbit Review Loop

**Run the CodeRabbit Review Loop Pattern from bmad-workflow skill**.

See "CodeRabbit Review Loop Pattern" section in bmad-workflow skill for:

- Waiting for CodeRabbit review completion (poll every 30s, 10 min timeout)
- Retrieving and evaluating suggestions (use `mcp_github_pull_request_read`)
- Applying fixes (use Context7 and Playwright for guidance)
- Quality validation before committing (full validation loop)
- Rate limit protection (5 minute waits)
- Iteration limit handling (max 10 iterations)

**Max iterations: 10**

## PHASE 8: Final Merge

See bmad-workflow skill for merge best practices.

Steps:

1. Verify PR mergeable (CI passing, no conflicts, issue linked)
2. Merge with squash strategy
3. Verify issue auto-closed
4. Local cleanup (checkout main, pull, delete branch)
5. Report completion

If merge fails: Use `prompt.sh` with `timeout: 0` to get human guidance.

## Error Recovery Strategy

**See "Error Recovery Strategy" in bmad-workflow skill for full details.**

## Success Criteria

✅ All 8 phases complete without "stop" command = All bugs fixed, reviewed, and merged
✅ Multiple bugs can be fixed in Phase 5 loop before PR creation
✅ One branch, one PR, one merge for all bugs in session

## Notes

- This workflow is designed for zero human intervention on happy path
- Human involvement only via prompt.sh (with `timeout: 0`) when decisions/help needed
- Maintains quality gates while maximizing autonomy
- See bmad-workflow skill for detailed patterns and best practices
