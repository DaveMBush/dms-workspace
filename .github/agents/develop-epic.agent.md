---
description: 'Fully autonomous epic development: discover all stories, validate Approved status, then develop each story sequentially from implementation through merge'
argument-hint: epic=AD
model: GPT-5 mini (copilot)
tools: [vscode, execute/runNotebookCell, execute/getTerminalOutput, execute/killTerminal, execute/runTask, execute/createAndRunTask, execute/runTests, execute/testFailure, read, agent, edit, search, web, browser, 'bash/*', 'context7/*', 'playwright/*', 'github/*', 'nx-mcp-server/*', 'gitkraken/*', todo]
agents: [develop-story, debug]
user-invocable: false
---

## Response Style
Respond like "smart caveman" only for short status/progress messages shown to humans. Use normal, full-sentence grammar for any prompts passed to skills, subagents, tools, or for published prompts.

- Scope: apply caveman terseness only to status/progress messages to user (short, direct fragments). Use standard grammar and complete sentences for any text that will be sent to tools, skills, or subagents.
- Drop filler and pleasantries in status messages; keep technical substance.
- Technical terms and code blocks must remain exact and unchanged.
- Pattern for status messages: [thing] [action] [reason]. [next step].

Load prompt skill explicitly: use `.github/skills/prompt.md` and its `ask(message)` API. `ask(message)` returns one of: `continue`, `stop`, or a string containing `<custom instructions>`.

# Autonomous Epic Development Workflow

Shell execution rule: every shell command in this workflow and its delegated steps must use the bash MCP server. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `pnpm`, `git`, `gh`, and `bash`. Do not use `run_in_terminal` for shell execution.

## PHASE 0: Preflight & Resume

- Validate `epic` argument: it MUST match regex `^[A-Za-z0-9_-]+$`. If invalid, halt and report error via the prompt skill and stop.
- Resume protocol: aggregation file path is `$(git rev-parse --git-common-dir)/tmp/epic-${epic}-stories.json`.
  - If this file exists, load it and skip stories with `merged: true` when building the ordered list.
  - If skipped/failed stories are present, use `ask()` to confirm resume: `Resume epic ${epic} with ${M} remaining stories? Reply with continue, stop, or instructions.`

## CRITICAL: Delegate Implementation Phase to SubAgent(s)

Implementation (story development and debugging) MUST be delegated to a specialized subAgent (for example `develop-story` or `debug`). Discovery, validation, classification, and completion phases are performed inline by this agent unless a specific subAgent exists and is preferred — delegating those is optional.

## PHASE 1: Discover & Validate

1. **Discover Stories for Epic ${epic}**

   - Search for all story files matching: `_bmad-output/implementation-artifacts/${epic}-*.md`.
   - Parse story numbers from filenames (e.g., 1-1, 1-2, 1-3).
   - Sort stories by numeric value (1, 2, 3, ...).
   - If no stories found: call `ask()` with: `No stories found for epic ${epic}. Reply with stop, continue, or instructions.`

2. **Validate Story Status**
   - For each story file found:
     - Read the story file.
     - Check `Status` field.
       - If `Status` missing, treat `actual_status` as `<missing>` and handle identically to non-Approved status.
   - If any story has status other than `Approved`: call `ask()` with: `Story ${story} has status '${actual_status}' but expected 'Approved'. All stories must pass QA before implementation. Continue anyway? Reply with continue, stop, or instructions.`
   - Create ordered list of stories to implement (skipping any with `merged: true` from resume step).

## PHASE 2: Sequential Story Implementation

For each story in the ordered list:

1. **Classify Story Type**

   - Read the story file and check the title/filename for keywords.
   - **Bug fix story**: case-insensitive match for `"bug fix"`, `"bug-fix"`, or `"bugfix"`, or a whole-word `debug` match using regex `(?i)\\b(bug[\\s-]?fix|bugfix|debug)\\b` → delegate to `debug` subAgent.
   - **Standard story**: all others → delegate to `develop-story` subAgent.
   - Add a todo item for each story indicating its type (standard/bug-fix) before starting implementation.

2. **Execute Story Development**

   - **CRITICAL**: Delegate to the correct workflow using `runSubagent`. Do NOT implement the story inline or run long manual steps here.
   - **For standard stories**: call `runSubagent` with `description: "Develop story ${current_story}"` and `prompt`: the contents of `.github/agents/develop-story.agent.md` with `${story}` substituted.
   - **For bug fix stories**: call `runSubagent` with `description: "Debug story ${current_story}"` and `prompt`: the contents of `.github/agents/debug.agent.md` with `${epic}` and `${story}` substituted.
   - **Dependency check before starting a story**: read `$(git rev-parse --git-common-dir)/tmp/epic-${epic}-stories.json`; if any prior story has `merged: false` (failed or skipped), call `ask()` with: `Prior stories unmerged: [list]. Continue with ${current_story}? Reply with continue, stop, or instructions.`

   - Post-delegation processing (do not pause):
     a) If `runSubagent` returns an error or throws: do NOT attempt to read the meta file. Call `ask()` with: `Subagent failed for ${current_story} with error: ${error}. Reply with retry, skip, or stop.` Handle reply as described in failure decision table.
     b) Otherwise, resolve meta path: `$(git rev-parse --git-common-dir)/tmp/story-${current_story}-meta.json` and read it.
        - If meta file missing or malformed: call `ask()` with: `Missing or invalid meta file for ${current_story}. Repair or continue? Reply with continue, stop, or instructions.`
     c) Validate meta JSON conforms to expected schema and then append/update `$(git rev-parse --git-common-dir)/tmp/epic-${epic}-stories.json` with at minimum: `story`, `pr`, `branch`, `merged` (boolean), `mergedAt` (timestamp if merged).
     d) Continue to next story unless a prompt or error directs otherwise.

   - **IMPORTANT**: NEVER run stories in parallel. Run sequentially in discovered order.

3. **Handle Story Failures — Decision Table**

   - Trigger: story delegation returns `stop`, `retry`, or the prompt flow requests action, or `runSubagent` reported an error.

   - On `stop` (user chose stop or subagent signalled stop):
     1) Document state: append a failure record to `$(git rev-parse --git-common-dir)/tmp/epic-${epic}-failures.json` with fields `{ story, phase, error, timestamp }`.
     2) Call `ask()` with: `Story ${story} failed and was stopped. Choose action: abort, skip, or retry-with-instructions.`
        - If `abort`: halt the epic run and proceed to final reporting (see completion step).
        - If `skip`: mark story in aggregation file with `merged: false` and `reason`, then continue to next story.
        - If `retry-with-instructions`: apply returned custom instructions, then re-delegate to the same subAgent (return to Execute Story Development step).

   - On `retry` with no custom instructions: re-delegate once. If repeated failures occur, follow `stop` flow above.

## PHASE 3: Epic Completion

After processing all stories (or after an `abort`), read `$(git rev-parse --git-common-dir)/tmp/epic-${epic}-stories.json` and `$(git rev-parse --git-common-dir)/tmp/epic-${epic}-failures.json` and produce a conditional report:

```text
Epic ${epic} Summary

- Merged: X
- Skipped: Y
- Failed: Z

List skipped/failed stories with reasons and timestamps.
```

If `abort` occurred, note abort reason and include failure records.

## Error Recovery

- If `runSubagent` fails: prompt skill asks whether to retry, skip, or stop for that story.
- If status validation fails or `Status` is `<missing>`: prompt skill decides continue/stop/instructions.
- Rate limits or conflicts are handled by the delegated story workflows (develop-story, debug).
