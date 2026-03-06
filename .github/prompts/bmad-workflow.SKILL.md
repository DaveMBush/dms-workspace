---
name: bmad-workflow
description: Common rules and patterns for BMAD (Business-Model-Agile-Development) autonomous workflows. Includes human interaction protocols, database safety, MCP server usage, quality validation loops, and CodeRabbit review patterns. Use this skill in all BMAD workflow prompts (develop-story, debug, develop-epic, code-rabbit).
---

# BMAD Workflow Common Rules

This skill contains shared rules and patterns used across all BMAD autonomous development workflows.

## CRITICAL: Human Interaction Protocol

**NEVER stop, yield back to the user, or pause execution without first calling `prompt.sh`.**

When human input is needed:

1. Use `run_in_terminal` to execute: `bash .github/prompts/prompt.sh "your message here"`
2. **CRITICAL**: Set `timeout: 0` (no timeout - wait indefinitely for human response)
3. **CRITICAL**: Set `isBackground: false` (blocking call)
4. Wait for the script to complete — it blocks until the user responds via the Zenity GUI dialog
5. Read the return value from terminal output:
   - `"continue"` — try alternatives / proceed
   - `"stop"` — abort and document state
   - Any other text — treat as custom instructions
6. Handle the response appropriately before continuing

**Example Tool Call:**

```typescript
run_in_terminal({
  command: 'bash .github/prompts/prompt.sh "Unable to merge PR: conflicts detected"',
  explanation: "Requesting human decision on merge conflicts",
  goal: "Get human guidance",
  isBackground: false,
  timeout: 0  // CRITICAL: No timeout - wait indefinitely
})
```

**NEVER**:
- Stop, yield back to the user, or write messages like "awaiting your approval" without first running prompt.sh
- Use a timeout other than 0 when calling prompt.sh
- Continue without handling the response from prompt.sh

The prompt.sh script IS the human interaction mechanism. The Zenity dialog handles all user interaction.

**IMPORTANT**:
- You must wait for the response before proceeding. The process should block any further action until it returns.
- These rules apply every time `.github/prompts/prompt.sh` is called, regardless of the phase or context.
- Do not hide or minimize the terminal window — the operator needs to see the dialog.

## CRITICAL: Database Safety

**NEVER run destructive database commands** including but not limited to:

- `prisma db push --force-reset`
- `prisma migrate reset`
- Deleting or overwriting `prisma/database.db`
- Any command that drops tables, truncates data, or resets the database

The development database contains real financial data that takes hours to re-seed. If a schema change requires a reset, call `prompt.sh` to get explicit human approval first.

See `docs/architecture/coding-standards.md` for full database safety rules.

## MCP Server Resources

### Context7 Documentation Server

When you need information about APIs, libraries, or frameworks:

1. **Load the tool first**: `tool_search_tool_regex pattern="mcp_context7"`
2. Use `mcp_context7_resolve-library-id` to find available documentation
3. Use `mcp_context7_query-docs` to retrieve API usage examples and documentation

**Example use cases:**
- Need to know how to use Angular Material Dialog? Query Context7 first
- Verifying correct API usage for unfamiliar libraries
- Checking for deprecation warnings or breaking changes
- Getting code examples for complex integrations

### Playwright Browser Automation Server

When implementing or fixing UI components:

1. **Load the tool first**: `tool_search_tool_regex pattern="mcp_microsoft_pla"`
2. Use Playwright tools to validate UI behavior, interactions, and rendering
3. Run visual tests after UI changes to verify correctness

**Example use cases:**
- Validating UI after every UI component change
- Testing user interactions (clicks, form fills, navigation)
- Verifying responsive behavior
- Taking screenshots for visual regression checking
- Testing error states and edge cases
- After implementing a form, use Playwright to verify form submission works

### Tool Loading Pattern

Before using any MCP tool, load it first:

```bash
# Load both Context7 and Playwright
tool_search_tool_regex pattern="mcp_context7|mcp_microsoft_pla"

# Or load individually
tool_search_tool_regex pattern="mcp_context7"
tool_search_tool_regex pattern="mcp_microsoft_pla"
```

## Quality Validation Loop

This validation loop is used in multiple phases across BMAD workflows. When running validations, you MUST re-run ALL steps from the beginning until ALL checks pass in a single iteration.

**Max Loop Iterations: 10**

**CRITICAL LOOP STRUCTURE**: After fixing any errors in steps below, you MUST re-run ALL steps from the beginning (step 1 → 2 → 3 → 4) until ALL four checks pass in a single iteration with no errors.

For each step, attempt up to 10 times with automatic fixes between attempts:

### Step 1: Run All Tests

```bash
pnpm all
```

- Run tests, analyze failures, apply fixes automatically
- **For API usage errors**: Query Context7 for correct implementation
- **For UI test failures**: Use Playwright to validate expected behavior
- **For ESLint failures**: Fix the lint error; do not comment exclude the problem or otherwise circumvent fixing the problem
- Retry up to 10 times with different fix strategies each time
- On 10th failure: Call `.github/prompts/prompt.sh "pnpm all failing after 10 attempts with errors: <error summary>"`
- **If fixed**: After applying fixes, restart validation loop from step 1

### Step 2: Run E2E Tests

```bash
pnpm e2e:dms-material:chromium
pnpm e2e:dms-material:firefox
```

**Note**: E2E tests take over 10 minutes to complete because tests run sequentially one at a time to avoid database collisions. This is expected behavior.

- Run tests, analyze failures (flaky tests, timing issues, etc.)
- **For UI interaction failures**: Use Playwright to manually validate the flow
- **For unclear API behavior**: Query Context7 for expected behavior
- Apply fixes and retry up to 10 times
- On 10th failure: Call `.github/prompts/prompt.sh "E2E tests failing after 10 attempts with errors: <error summary>"`
- **If fixed**: After applying fixes, restart validation loop from step 1

### Step 3: Check Duplicates

```bash
pnpm dupcheck
```

- Run check, identify duplicate code
- Refactor duplicates if straightforward
- Retry up to 10 times with different refactoring strategies
- On 10th failure: Call `.github/prompts/prompt.sh "Duplicate code detected after 10 refactoring attempts: <duplicate details>"`
- **If fixed**: After applying fixes, restart validation loop from step 1

### Step 4: Format Code

```bash
pnpm format
```

- Should rarely fail
- If fails: Call `.github/prompts/prompt.sh "pnpm format failed: <error>"`
- **If fixed**: After applying fixes, restart validation loop from step 1

### Validation Loop Completion

- If ALL four checks (1, 2, 3, 4) pass in the same iteration: Validation complete, proceed to next phase
- If any check fails and gets fixed: Return to step 1 and run all checks again
- If validation loop reaches 10 complete iterations: Call `.github/prompts/prompt.sh "Validation loop reached 10 iterations without all checks passing"`

**Critical**: All validation checks must pass in a single iteration before proceeding.

## CodeRabbit Review Loop Pattern

This pattern is used when handling CodeRabbit feedback on PRs.

**Max iterations: 10** (prevents infinite loops)

For each iteration:

### 1. Wait for CodeRabbit Review

- **CRITICAL**: Before polling, use `tool_search_tool_regex pattern="mcp_github"` to load GitHub MCP tools if not already loaded
- **CRITICAL**: Use `mcp_github_pull_request_read` with `method: "get_review_comments"` to poll every 30 seconds
- **CRITICAL**: Wait for CodeRabbit to COMPLETE its review, not just start it
  - Review is complete when comment body does NOT contain "Currently processing" or "review in progress"
  - Review threads will be populated when complete
- Timeout: 10 minutes from when review starts processing
- If timeout: Call `.github/prompts/prompt.sh "CodeRabbit review timed out after 10 minutes"`
- If first iteration: Wait 5 minutes after PR creation (rate limit protection)

### 2. Retrieve and Evaluate Suggestions

- **CRITICAL**: Ensure GitHub MCP tools have been loaded via `tool_search_tool_regex`
- **CRITICAL**: Retrieve inline review thread comments using `mcp_github_pull_request_read` with `method: "get_review_comments"`
  - Do NOT use `github-pull-request_issue_fetch` which only returns issue-level comments and will MISS all inline file/line-level review suggestions
- If no suggestions from `get_review_comments`: CodeRabbit review complete, exit loop
- If suggestions exist:
  - Categorize each: valid/invalid, in-scope/out-of-scope
  - **For API-related suggestions**: Query Context7 to verify best practices
  - **For UI-related suggestions**: Validate with Playwright if needed
  - For valid + in-scope: Plan fixes
  - For others: Document reasoning in PR comment

### 3. Apply Fixes

- Implement all valid, in-scope suggestions
- **Use Context7** for guidance on proper API implementations
- **Use Playwright** to validate UI fixes work as expected
- Retry up to 10 times per suggestion if implementation encounters issues
- If unable to implement after 10 attempts:
  - Call `.github/prompts/prompt.sh "Unable to implement CodeRabbit suggestion after 10 attempts: <suggestion details>"`
  - Handle response before proceeding

### 4. Validate and Commit

- **CRITICAL**: Run ALL quality validation steps (see "Quality Validation Loop" section above) before committing
  - All four checks (pnpm all, e2e tests, dupcheck, format) must pass
  - If any validation fails: Fix issues and re-run ALL validations until they pass
  - Follow same retry/fix logic (up to 10 attempts per validation)
  - If validations fail after 10 attempts: Call `.github/prompts/prompt.sh "Quality validation failed after applying CodeRabbit fixes: <error>"`

- Only after ALL validations pass:
  - Commit with message: "Apply CodeRabbit suggestions"
  - Push to branch
  - **Wait 5 minutes** (rate limit protection for CodeRabbit)
  - Return to step 1 (new iteration)

- If no changes possible or needed: Exit loop

### 5. Iteration Limit Check

- If iteration 10 reached and still have suggestions:
  - Call `.github/prompts/prompt.sh "Reached 10 iterations of CodeRabbit feedback, still have suggestions: <summary>"`

## Error Recovery Strategy

When `prompt.sh` returns different values:

### "continue"

- Try alternative solution approaches
- **Use Context7** to research correct approaches
- **Use Playwright** to validate assumptions about UI behavior
- Attempt fixes with different strategies
- If still stuck after 5 more attempts: Call `prompt.sh` again with updated context

### "stop"

- Document current state in story debug log or appropriate location
- Commit progress with "[WIP] Story ${story} - stopped at <phase>"
- DO NOT merge
- Report final state and exit workflow

### Custom instructions

- Parse instructions as additional guidance
- Apply guidance to current problem
- Continue workflow from interruption point
- Treat custom instructions as if they came from a referenced workflow file

## State File Management

For workflows that can be resumed (epic orchestration, CodeRabbit loops), maintain minimal state files:

### Story Metadata File

Location: `.git/tmp/story-${story}-meta.json`

Required fields:
```json
{
  "pr": 123,
  "branch": "feat/story-AD.3",
  "repo": "owner/repo",
  "attempt": 0,
  "maxIterations": 10,
  "merged": false,
  "mergedAt": null
}
```

### Epic Aggregation File

Location: `.git/tmp/epic-${epic}-stories.json`

Format:
```json
[
  {
    "story": "AD.1",
    "pr": 101,
    "branch": "feat/story-AD.1",
    "merged": true,
    "mergedAt": "2025-03-01T10:30:00Z"
  },
  {
    "story": "AD.2",
    "pr": 102,
    "branch": "feat/story-AD.2",
    "merged": true,
    "mergedAt": "2025-03-01T14:15:00Z"
  }
]
```

### State File Best Practices

- Write state files immediately after creating PRs or branches
- Update state files after each significant milestone
- Use state files to resume workflows without re-passing large prompt contexts
- If state file missing or malformed: Call `prompt.sh` to ask for repair instructions
- Make operations idempotent: re-running should re-read state and continue safely

## Rate Limit Protection

To avoid CodeRabbit API rate limiting:

- Wait 5 minutes after initial PR creation before checking CodeRabbit status
- Wait 5 minutes after each CodeRabbit fix commit before checking again
- Total workflow may take 50+ minutes if all CodeRabbit iterations are used

## Exit Code 130 Handling

Exit code 130 indicates process interruption (SIGINT), which can occur when:
- Agent infrastructure restarts/summarizes (NOT user action - most common)
- User presses Ctrl+C (deliberate user action - rare)

**Strategy**: When `prompt.sh` exits with code 130:

1. **RETRY** the same `prompt.sh` call up to 3 times (waiting 5 seconds between attempts)
2. Log each attempt: "prompt.sh interrupted (exit 130), retrying attempt N/3..."
3. If all 3 retries also exit 130: Treat as "stop" and log "All 3 prompt.sh retries failed with exit 130 — proceeding to next phase"

**Do NOT treat exit code 130 as an implicit "stop" on the first occurrence** — it most likely means the dialog was still open and the agent was restarted/summarized, not that the user chose to stop.

## Branch Naming Conventions

- Feature story: `feat/story-${story}`
- Bug fix story: `debug/${story}-<issue-number>`
- Always include GitHub issue number when available

## Commit Message Conventions

- Link to GitHub issue: Include `#<issue-number>` in commit message
- CodeRabbit fixes: "Apply CodeRabbit suggestions"
- WIP when stopped: "[WIP] Story ${story} - stopped at <phase>"
- Final commits: Use story title or clear description of changes

## Pull Request Guidelines

- Title: Reference story ID and brief description
- Body: Derive from story's "Change Log" section
  - Do NOT include literal escape sequences like `\n`
  - Write as regular Markdown (paragraphs or bullet lists)
  - Repeat testing steps under a "Testing" heading
- Link to GitHub issue: Include `#<issue-number>` so PR merge auto-closes issue
- Do not reference Claude, AI, or automated code generation in PR descriptions

## Common Workflow Phases

Most BMAD workflows follow this general structure:

1. **Discovery/Validation**: Verify files exist, status is correct, git is clean
2. **Implementation**: Create issue/branch, implement features, use MCP servers for guidance
3. **Quality Validation**: Run full validation loop (tests, e2e, dupcheck, format)
4. **QA Gate** (optional): Run QA review, apply fixes, re-validate
5. **Commit and PR**: Format code, commit, create PR, write state file
6. **CodeRabbit Review**: Loop through review suggestions, apply fixes, re-validate
7. **Merge**: Verify PR mergeable, merge with squash, verify issue closes
8. **Cleanup**: Checkout main, pull, delete branch, report completion

Phases may be delegated to subagents for modularity and better error handling.

## Subagent Delegation Pattern

For complex workflows (like epic development):

- Break workflow into distinct phases
- Delegate each phase to a specialized subagent
- Use state files to pass context between subagents (not large prompt contents)
- Each subagent should handle its own error recovery via `prompt.sh`
- Orchestrator reads state files to track progress and resume if needed

## Usage in Prompt Files

To use this skill in your BMAD workflow prompt:

```markdown
---
description: Your workflow description
agent: dev
argument-hint: story=AD.3
model: Claude Sonnet 4.6 (copilot)
---

# Your Workflow Title

Run using bmad-workflow skill:
run #skill:bmad-workflow

[Your workflow-specific instructions here]

## Phase 1: Implementation
- Follow human interaction protocol from bmad-workflow skill
- Use MCP servers as described in bmad-workflow skill
- Never run destructive database commands (see bmad-workflow skill)

## Phase 2: Validation
- Run quality validation loop from bmad-workflow skill
- On failures, use MCP servers for guidance

## Phase 3: CodeRabbit Review
- Follow CodeRabbit review loop pattern from bmad-workflow skill
```

Or reference specific sections:

```markdown
When human input needed: see "Human Interaction Protocol" in bmad-workflow skill

Before using APIs: see "MCP Server Resources" in bmad-workflow skill

Run validations: see "Quality Validation Loop" in bmad-workflow skill
```

## Tips for Workflow Developers

- Always call `prompt.sh` with `timeout: 0` in `run_in_terminal`
- Load MCP tools at the start of phases where they're needed
- Use Context7 for API questions BEFORE implementing
- Use Playwright for UI validation AFTER implementing
- Don't bypass validation loops — they ensure quality
- Document state in files, not in large prompt contexts
- Make operations idempotent for safe resumption
- Be generous with retry limits (10 attempts) to reduce false failures

## Version History

- 2025-03-06: Initial skill creation, extracted from debug.prompt.md, develop-story.prompt.md, develop-epic.prompt.md, code-rabbit.prompt.md
