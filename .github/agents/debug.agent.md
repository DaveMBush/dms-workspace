---
description: 'Fully autonomous bug fix workflow: validate epic, collect bug description, implement fix, run quality validation, create PR, run CodeRabbit review, and merge'
argument-hint: epic=3 story=3-5
model: Claude Sonnet 4.6 (copilot)
tools: [vscode, execute, read, agent, edit, search, web, 'bash/*', 'context7/*', 'playwright/*', 'github/*', 'nx-mcp-server/*', browser, 'gitkraken/*', github.vscode-pull-request-github/issue_fetch, github.vscode-pull-request-github/labels_fetch, github.vscode-pull-request-github/notification_fetch, github.vscode-pull-request-github/doSearch, github.vscode-pull-request-github/activePullRequest, github.vscode-pull-request-github/pullRequestStatusChecks, github.vscode-pull-request-github/openPullRequest, github.vscode-pull-request-github/create_pull_request, github.vscode-pull-request-github/resolveReviewThread, todo]
agents: [debug-setup, quality-validation, debug-pr-lifecycle, debug-merge-finalize]
user-invocable: false
---

## Response Style

- Use "smart caveman" tersely for internal status updates and short technical progress messages. Drop articles (a, an, the) and pleasantries. Fragments allowed for internal updates.
- Keep technical terms exact. Code blocks unchanged.
- Pattern for internal updates: [thing] [action] [reason]. [next step].

**User-facing prompts:** Use full grammatical English exactly as written in this file for any prompt-skill messages. Do not rewrite prompt templates into caveman style.

## Invariants

- Prompt-skill: Use the prompt skill (`vscode_askQuestions`) for all human-facing questions and decisions. Never post user-facing questions or status prompts directly to chat.
- Before Phase 1: load the prompt skill by reading `.github/skills/prompt/SKILL.md` into context.
- Internal status messages: caveman-style allowed. User-facing messages: full sentences verbatim.
- Subagent outputs that will be parsed must be structured (see PHASE 1-2 and PHASE 3.2).
- If agent exhibits high cognitive load, split execution into focused prompts (suggested groups: 1) Setup, 2) Implement+Validate, 3) PR lifecycle+Merge).

# Autonomous Epic Bug Fix Workflow

Shell execution rule: every shell command in this workflow and its delegated steps must use the bash MCP server. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `pnpm`, `git`, `gh`, and `bash`. Do not use `run_in_terminal` for shell execution.

## PHASE 1-2: Epic Validation And Debug Setup

Delegate epic validation and branch setup to a dedicated setup subagent using `runSubagent`:

Call the `runSubagent` tool now with the following parameters:

- `description`: `"Debug setup for story ${story}"`
- `prompt`: Read the full contents of `.github/agents/debug-setup.agent.md` and include them verbatim, substituting `${story}` and `${epic}` with the actual values.

This keeps the debug workflow context small while the setup subagent handles:

1. epic existence and status checks
2. repository cleanliness and `main` branch validation
3. GitHub issue creation
4. debug branch creation and local checkout

**CRITICAL**: The setup subagent must not return success until the debug branch exists locally and is checked out. The setup subagent MUST include a line in its result exactly in the format:

BRANCH: <branch-name>

on its own line; parse that line to extract the branch name and use it verbatim in PHASE 3.2. If the subagent returns `SETUP FAILED`, does not return within a reasonable time (for example, ~10 minutes), or returns unparseable output, treat setup as FAILED and use the prompt skill to ask: `Debug setup failed for ${story}: <reason>. Reply with stop or instructions.`

## PHASE 3: Implement Debug Fix

### 3.1 Collect Bug Description

Use the prompt skill to ask: `Please describe the bug to fix:`

After invoking the prompt skill, do NOTHING until the user responds. Do NOT start servers, run manual tests, do code reviews, or perform speculative work while waiting. The prompt skill blocks on `vscode_askQuestions` — wait for the response and then act.

If the user's response is exactly one of {stop, no, n, cancel} (case-insensitive), cancel the workflow: delete the debug branch, close the created GitHub issue, and halt. If the response is empty, whitespace-only, or fewer than 10 characters, re-prompt with: `Need more detail. Please describe the bug, including expected vs actual behavior:`. Otherwise treat the response as the bug description.

### 3.2 Delegate Fix and Validation to a Subagent

Once the bug description is collected, use `runSubagent` with agent `"dev"` to implement and validate the fix in a **fresh context**. Substitute the actual values for `${epic}`, the branch returned by PHASE 1-2 setup, and the collected bug description:

Call the `runSubagent` tool now with the following parameters:

- `description`: `"Implement debug fix for story ${story}"`
- `prompt`:

```
You are a developer agent implementing a bug fix. Before doing anything else, read ALL of these files:
1. `_bmad-output/project-context.md`
2. `_bmad-output/planning-artifacts/${epic}.md`
3. `_bmad/bmm/config.yaml`

Current branch: <branch name returned by debug-setup.agent.md>
Bug to fix: <bug description from user>

Tasks:
1. Analyze the bug report and identify the root cause.
2. Implement the fix.
3. If the bug description references UI behavior, visual rendering, or user interaction flows, use the Playwright MCP server to reproduce and verify the fix.
4. Delegate validation to a fresh subagent. Call the `runSubagent` tool with:
   - `description`: `"Validate debug fix for story ${story}"`
   - `prompt`: Read the full contents of `.github/agents/quality-validation.agent.md` and include them verbatim, substituting `context` with `debug-${story}`.
   - The validation subagent MUST return either `VALIDATION PASSED` or `VALIDATION FAILED: <reason>` on a separate line. If `VALIDATION FAILED`, use the prompt skill to report the failure. For any other output, treat as ambiguous and use the prompt skill to ask: `Validation subagent returned ambiguous result: <output>. Reply with retry, stop, or instructions.`
5. Return a summary of: files changed, what the fix was, and either
   "VALIDATION PASSED" or "VALIDATION FAILED: <reason>".
```

**WHY subagent**: Each bug fix starts with fully freshly loaded context — no risk of prior loop iterations summarizing away critical rules like the prompt-skill requirement.

**After subagent returns**: If the result contains `VALIDATION PASSED`, proceed to Phase 5. If the result contains `VALIDATION FAILED`, use the prompt skill to report the failure and halt. For any other output, treat as ambiguous: use the prompt skill to ask: `Validation subagent returned ambiguous result: <output>. Reply with retry, stop, or instructions.`

## PHASE 4: Quality Validation (with auto-fix)

**This phase runs inside the dedicated validation subagent spawned from PHASE 3.2** — listed here for visibility.

The validation subagent runs the Quality Validation Loop from bmad-workflow skill:

- Full validation steps (pnpm all, e2e tests, dupcheck, format, code self-review)
- Retry logic (10 attempts per step)
- MCP usage (Context7 for API errors, Playwright for UI issues)
- Critical loop structure (restart from step 1 if any check fails and gets fixed)

All checks must pass in a single iteration. The validation subagent returns to the Phase 3.2 implementation subagent only after validation passes.

## PHASE 5: Next Bug Decision

After the current bug fix is validated, follow this algorithm:

1. Context refresh: re-read the required files listed in PHASE 5 Context Refresh below to restore main-agent context.
2. Use the prompt skill to ask: `Bug fix validated. Fix another bug in this branch? Reply with continue, stop, or the next bug description.`
3. Classify the user's response (case-insensitive):
   - If the response is exactly one of {continue, yes, y, yep, ok} with no additional text: re-prompt for the full bug description (go to PHASE 3.1).
   - If the response is exactly one of {stop, no, n, done} with no additional text: proceed to PHASE 6.
   - If the response contains additional descriptive text (not a single affirmative/stop token): treat the entire response as the next bug description and spawn the PHASE 3.2 subagent using that text.
   - If the response is empty or fewer than 10 characters: re-prompt with: `Need more detail. Please describe the bug, including expected vs actual behavior:` and await a substantive reply.
   - If the response is 'stop' but the repository is not clean (unstaged changes or inconsistent state): verify `git status` is clean and all fixes are committed; if not, halt and prompt the user via prompt skill to resolve the repository state.
4. Spawn the appropriate subagent or proceed to PHASE 6 based on classification.
5. Iteration limit: after 5 bug fixes in this loop, force-prompt: `5 bugs fixed in this branch. Recommend creating PR now. Reply stop to proceed to PR, or continue to add more.`

All bugs fixed in the Phase 5 loop should be grouped into one PR for atomic review unless the user overrides via prompt-skill instruction.

### PHASE 5 Context Refresh (REQUIRED before each new bug in this loop)

Before making any Phase 5 prompt-skill call or spawning the next subagent, **re-read all of the following files** to restore lost context in the main agent:

1. Re-read the bmad-workflow skill: `.github/skills/bmad-workflow/SKILL.md`
2. Re-read the human interaction protocol: `.github/skills/bmad-workflow/references/human-interaction.md`
3. Re-read the epic file: `docs/epics/${epic}.md`
4. Re-read the dev agent core config: `.bmad-core/core-config.yaml`

**WHY (context refresh)**: After multiple loop iterations the main agent's context window may be summarized, causing it to forget that it must use the prompt skill for the "fix another bug?" prompt. Re-reading keeps the main orchestration loop correct.

**WHY (subagent)**: Even with a refresh, the main agent still carries accumulated context from all prior bugs. The subagent in PHASE 3.2 gets a completely clean slate for each bug fix, eliminating any risk of its implementation or quality-validation work being affected by forgotten rules.

**REMINDER after re-reading**: Follow Invariants: use the prompt skill for all human-facing questions; do not post user-facing prompts to chat.

## PHASE 6: Commit and PR Creation

Once all bugs are fixed and no more bug work requested, call the `runSubagent` tool now with the following parameters to handle PR creation and CodeRabbit in a fresh subagent context:

- `description`: `"Debug PR lifecycle for story ${story}"`
- `prompt`: Read the full contents of `.github/agents/debug-pr-lifecycle.agent.md` and include them verbatim as the prompt, substituting `${story}` with the actual story ID.

This keeps the debug workflow context small while the PR lifecycle subagent handles:

1. formatting and commit/PR creation
2. PR metadata creation
3. CodeRabbit polling and remediation loop
4. any re-validation required during review

**CRITICAL**: The PR lifecycle subagent must not return success until the PR is ready to merge. If it returns `PR FLOW FAILED`, use the prompt skill to ask: `Debug PR flow failed for ${story}: <reason>. Reply with stop or instructions.`

## PHASE 7: CodeRabbit Review Loop

**This phase runs inside the dedicated PR lifecycle subagent from PHASE 6** — listed here for visibility.

The PR lifecycle subagent runs the CodeRabbit Review Loop Pattern from bmad-workflow skill, including:

- waiting for CodeRabbit review completion
- retrieving and evaluating suggestions
- applying fixes with Context7 and Playwright as needed
- running quality validation before committing
- respecting rate-limit protection and iteration limits

## PHASE 8: Final Merge

Call the `runSubagent` tool now with the following parameters to handle the final merge and cleanup in a fresh subagent context:

- `description`: `"Debug merge and finalize for story ${story}"`
- `prompt`: Read the full contents of `.github/agents/debug-merge-finalize.agent.md` and include them verbatim as the prompt, substituting `${story}` with the actual story ID.

This keeps the debug workflow context small while the merge subagent handles:

1. mergeability verification
2. conflict detection and rebase attempts
3. re-validation after conflict resolution
4. squash merge execution
5. issue-close verification and local cleanup

**CRITICAL**: The merge subagent must not return success until the PR is merged and cleanup is complete. If it returns `MERGE FAILED`, use the prompt skill to ask: `Debug merge failed for ${story}: <reason>. Reply with stop or instructions.`

## Error Recovery Strategy

**See "Error Recovery Strategy" in bmad-workflow skill for full details.**

Local rules (subset):

- If a subagent does not return within a reasonable time or returns unparseable output, treat it as FAILED and use the prompt skill to surface: `Subagent <name> failed or timed out: <summary>. Reply with stop or instructions.`
- If a validation subagent returns ambiguous output (neither `VALIDATION PASSED` nor `VALIDATION FAILED`), use the prompt skill to ask: `Validation subagent returned ambiguous result: <output>. Reply with retry, stop, or instructions.`
- If the user replies `stop` at Phase 5 but the repository has unstaged changes or is in an inconsistent state, verify `git status` is clean and all fixes are committed; if not, halt and prompt user to resolve repository state before creating PR.

## Success Criteria

✅ All 8 phases complete without "stop" command = All bugs fixed, reviewed, and merged
✅ Multiple bugs can be fixed in Phase 5 loop before PR creation
✅ One branch, one PR, one merge for all bugs in session

## Notes

- This workflow is designed for zero human intervention on happy path
- Human involvement only via the prompt skill when decisions/help are needed
- Maintains quality gates while maximizing autonomy
- See bmad-workflow skill for detailed patterns and best practices