# CodeRabbit Review Loop Pattern

Used when handling CodeRabbit feedback on PRs.

**Max iterations: 10** (prevents infinite loops)

For each iteration:

## 1. Wait for CodeRabbit Review

- **CRITICAL**: Before polling, use `tool_search_tool_regex pattern="mcp_github"` to load GitHub MCP tools if not already loaded
- **CRITICAL**: Use `mcp_github_pull_request_read` with `method: "get_review_comments"` to poll every 30 seconds
- **CRITICAL**: Wait for CodeRabbit to COMPLETE its review, not just start it
  - Review is complete when comment body does NOT contain "Currently processing" or "review in progress"
  - Review threads will be populated when complete
- Timeout: 10 minutes from when review starts processing
- If timeout: Call `.github/prompts/prompt.sh "CodeRabbit review timed out after 10 minutes"`
- If first iteration: Wait 5 minutes after PR creation (rate limit protection)

## 2. Retrieve and Evaluate Suggestions

- **CRITICAL**: Retrieve inline review thread comments using `mcp_github_pull_request_read` with `method: "get_review_comments"`
  - Do NOT use `github-pull-request_issue_fetch` — it only returns issue-level comments and will MISS all inline file/line-level review suggestions
- If no suggestions from `get_review_comments`: CodeRabbit review complete, exit loop
- If suggestions exist:
  - Categorize each: valid/invalid, in-scope/out-of-scope
  - **For API-related suggestions**: Query Context7 to verify best practices
  - **For UI-related suggestions**: Validate with Playwright if needed
  - For valid + in-scope: Plan fixes
  - For others: Document reasoning in PR comment

## 3. Apply Fixes

- Implement all valid, in-scope suggestions
- **Use Context7** for guidance on proper API implementations
- **Use Playwright** to validate UI fixes work as expected
- Retry up to 10 times per suggestion if implementation encounters issues
- If unable to implement after 10 attempts:
  - Call `.github/prompts/prompt.sh "Unable to implement CodeRabbit suggestion after 10 attempts: <suggestion details>"`
  - Handle response before proceeding

## 4. Validate and Commit

- **CRITICAL**: Run ALL quality validation steps before committing
  - All four checks (pnpm all, e2e tests, dupcheck, format) must pass
  - Follow same retry/fix logic (up to 10 attempts per validation)
  - See [quality-validation.md](./quality-validation.md) for full loop details
  - If validations fail after 10 attempts: Call `.github/prompts/prompt.sh "Quality validation failed after applying CodeRabbit fixes: <error>"`
- Only after ALL validations pass:
  - Commit with message: "Apply CodeRabbit suggestions"
  - Push to branch
  - **Wait 5 minutes** (rate limit protection for CodeRabbit)
  - Return to step 1 (new iteration)
- If no changes possible or needed: Exit loop

## 5. Iteration Limit Check

- If iteration 10 reached and still have suggestions:
  - Call `.github/prompts/prompt.sh "Reached 10 iterations of CodeRabbit feedback, still have suggestions: <summary>"`
