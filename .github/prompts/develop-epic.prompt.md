---
description: Fully autonomous epic development - all stories from start to merge
agent: dev
argument-hint: epic=AD
model: Claude Opus 4.6 (copilot)
---

# Autonomous Epic Development Workflow

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

## CRITICAL: Human Interaction Rules

**NEVER stop, yield back to the user, or pause execution without first calling `prompt.sh`.**

When human input is needed:

1. Run the script in a terminal: `bash .github/prompts/prompt.sh "<your message>"`
2. Wait for the return value — the process BLOCKS until the user responds
3. Handle the response ("continue", "stop", or custom instructions)
4. Only THEN proceed or halt

Violating this rule by pausing without calling `prompt.sh` defeats the purpose of the autonomous workflow.

## CRITICAL: Database Safety

**NEVER run destructive database commands** including but not limited to:

- `prisma db push --force-reset`
- `prisma migrate reset`
- Deleting or overwriting `prisma/database.db`
- Any command that drops tables, truncates data, or resets the database

The development database contains real financial data that takes hours to re-seed. If a schema change requires a reset, call `prompt.sh` to get explicit human approval first. See `docs/architecture/coding-standards.md` for full database safety rules.

1. **Discover Stories for Epic ${epic}**

   - Search for all story files matching: `docs/stories/${epic}.*.md`
   - Parse story numbers from filenames (e.g., AD.1, AD.2, AD.3)
   - Sort stories by numeric value (1, 2, 3, ...)
   - If no stories found: Call `.github/prompts/prompt.sh "No stories found for epic ${epic}"`

2. **Validate Story Status**
   - For each story file found:
     - Read the story file
     - Check the `Status` field (should be "Approved")
     - If any story has status other than "Approved": Call `.github/prompts/prompt.sh "Story ${story} has status '${actual_status}' but expected 'Approved'. All stories must pass QA before epic implementation. Continue anyway?"`
   - Create ordered list of stories to implement

## PHASE 2: Sequential Story Implementation

For each story in the ordered list:

1. **Classify Story Type**

   - Read the story file and check the title/filename for keywords
   - **Bug fix story**: Title or filename contains "bug fix", "bug-fix", "bugfix", or "debug" → Use `debug.prompt.md`
   - **Standard story**: All other stories → Use `develop-story.prompt.md`
   - Add a todo item for each story indicating its type (standard/bug-fix) before starting implementation

2. **Execute Story Development**

   - **CRITICAL**: You MUST delegate to the correct workflow file below. Do NOT attempt to implement the story yourself inline. Do NOT start servers, run manual tests, do code reviews, or perform any implementation work outside of the delegated workflow. The workflow file contains the complete instructions — follow them exactly.
   - **For standard stories**: Run `run #file:./develop-story.prompt.md story=${current_story}`
   - **For bug fix stories**: Run `run #file:./debug.prompt.md epic=${epic} story=${current_story}`
   - Both workflows handle: validation, implementation, quality checks, PR creation, CodeRabbit review, and merge

3. **Handle Story Failures**
   - If story execution calls prompt.sh with "stop":
     - Document state
     - Call `.github/prompts/prompt.sh "Story ${story} failed and was stopped. Abort entire epic or skip this story and continue?"`
   - If custom instructions received: Apply and retry story

## PHASE 3: Pre-E2E Checkpoint

1. **Identify Last Story**

   - Last story = story with highest numeric value in the ordered list

2. **Pre-E2E Confirmation**

   - Before executing the last story:
     - **CRITICAL**: Run `bash .github/prompts/prompt.sh "Epic ${epic}: ${N-1} of ${N} stories complete. About to implement final story (${last_story}, typically e2e tests). Any corrections or additional instructions before proceeding?"` in a terminal via `run_in_terminal`
     - **CRITICAL**: Wait for the script to return — do NOT yield back to the user or stop — the script itself handles the interaction
     - **CRITICAL**: Do NOT write a message to the user saying "awaiting your approval" or similar — the zenity dialog IS the approval mechanism
   - Handle response:
     - "continue": Proceed with last story
     - "stop": Document state and exit
     - Custom instructions: Apply instructions, then proceed with last story

3. **Execute Final Story**
   - Use the same story type classification from Phase 2 to select the correct workflow:
     - **Standard story**: Run `develop-story.prompt.md`
     - **Bug fix story**: Run `debug.prompt.md`

## PHASE 4: Epic Completion

Report completion:

```text
✅ Epic ${epic} Complete

All ${N} stories implemented and merged to main.
```

## Error Recovery

- **Story fails**: prompt.sh decides abort epic / skip story / retry with help
- **Status validation fails**: prompt.sh decides whether to continue anyway
- **Rate limits or conflicts**: Individual stories handle via develop-story.prompt.md
