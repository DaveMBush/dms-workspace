---
description: Fully autonomous epic development - all stories from start to merge
argument-hint: epic=AD
model: Claude Opus 4.6
---

# Autonomous Epic Development Workflow

Shell execution rule: every shell command in this workflow and its delegated steps must use the bash MCP server. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `pnpm`, `git`, `gh`, `bash`, and `.github/prompts/prompt.sh`. Do not use `run_in_terminal` for shell execution.

## CRITICAL: Each Phase In a subAgent

Each phase of the epic development process must be handled by a separate subAgent. This ensures modularity, better error handling, clear separation of concerns, and avoids loss of overall context

1. **Discover Stories for Epic ${epic}**

   - Search for all story files matching: `_bmad-output/implementation-artifacts/${epic}-*.md`
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
   - **IMMEDIATELY after the delegated workflow returns** (do not pause, do not wait for human input): read the minimal state file written by the story workflow. Resolve the path via `$(git rev-parse --git-common-dir)/tmp/story-${current_story}-meta.json`. If the file is missing or malformed, call `.github/prompts/prompt.sh "Missing or invalid meta file for ${current_story}. Repair or continue?"` via the bash MCP server and handle the response.
   - Append or update the epic aggregation file at `$(git rev-parse --git-common-dir)/tmp/epic-${epic}-stories.json` with the story's metadata. Each entry should include at minimum: `story`, `pr`, `branch`, `merged` (boolean), and `mergedAt` (timestamp if merged). Use this file for later reporting and for resuming orchestration without re-passing large prompt context.
   - **IMMEDIATELY continue to the next story in the ordered list** — no human confirmation required between stories.

3. **Handle Story Failures**
   - If story execution calls prompt.sh with "stop":
     - Document state
     - Call `.github/prompts/prompt.sh "Story ${story} failed and was stopped. Abort entire epic or skip this story and continue?"`
   - If custom instructions received: Apply and retry story

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

## Rate Limits

To avoid GitHub Copilot rate limiting:
- Always wait for at least 2 minutes between terminal calls, calls to MCP servers, or code updates.
- Prefer slow completion over fast failure.
