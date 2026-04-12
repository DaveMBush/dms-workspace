---
description: Fully autonomous epic debug prompt
argument-hint: epic=AD story=AD.5
model: Claude Opus 4.6
---

load the #skill:prompt

# Autonomous Epic Bug Fix Workflow

Shell execution rule: every shell command in this workflow and its delegated steps must use the bash MCP server. Use `mcp_bash_run` for blocking commands and `mcp_bash_run_background` only for true background processes. This applies to `pnpm`, `git`, `gh`, and `bash`. Do not use `run_in_terminal` for shell execution.

## PHASE 1-2: Epic Validation And Debug Setup

Delegate epic validation and branch setup to a dedicated setup subagent:

```bash
run #file:./debug-setup.prompt.md epic=${epic} story=${story}
```

This keeps the debug workflow context small while the setup subagent handles:

1. epic existence and status checks
2. repository cleanliness and `main` branch validation
3. GitHub issue creation
4. debug branch creation and local checkout

**CRITICAL**: The setup subagent must not return success until the debug branch exists locally and is checked out. Capture the branch name it returns and use that exact branch name in PHASE 3.2. If it returns `SETUP FAILED`, use the prompt skill to ask: `Debug setup failed for ${story}: <reason>. Reply with stop or instructions.`

## PHASE 3: Implement Debug Fix

### 3.1 Collect Bug Description

Use the prompt skill to ask: `Please describe the bug to fix:`

**CRITICAL**: After invoking the prompt skill, do NOTHING until the user responds. Do NOT start servers, run manual tests, do code reviews, or perform any speculative work while waiting. The prompt skill blocks on `vscode_askQuestions` — your only job is to wait for the response and then act on it.

### 3.2 Delegate Fix and Validation to a Subagent

Once the bug description is collected, use `runSubagent` with agent `"dev"` to implement and validate the fix in a **fresh context**. Substitute the actual values for `${epic}`, the branch returned by PHASE 1-2 setup, and the collected bug description:

```
You are a developer agent implementing a bug fix. Before doing anything else, read ALL of these files:
1. `_bmad-output/project-context.md`
2. `_bmad-output/planning-artifacts/${epic}.md`
3. `_bmad/bmm/config.yaml`

Current branch: <branch name returned by debug-setup.prompt.md>
Bug to fix: <bug description from user>

Tasks:
1. Analyze the bug report and identify the root cause.
2. Implement the fix.
3. If relevant, use the Playwright MCP server to help see the problem and confirm the fix.
4. Delegate validation to a fresh subagent by running:
   - `run #file:./quality-validation.prompt.md context=debug-${story}`
   - This validation subagent must run the full loop from quality-validation.md, including code self-review of changed files only via `.github/instructions/code-review.md`
  - If the validation subagent returns `VALIDATION FAILED`, use the prompt skill to report the failure to the user
5. Return a summary of: files changed, what the fix was, and either
   "VALIDATION PASSED" or "VALIDATION FAILED: <reason>".

CRITICAL: You MUST use the prompt skill for ALL human interaction.
NEVER write questions or status messages to the chat window.
```

**WHY subagent**: Each bug fix starts with fully freshly loaded context — no risk of prior loop iterations summarizing away critical rules like the prompt-skill requirement.

**After subagent returns**: If the result contains `VALIDATION FAILED`, use the prompt skill to report the failure and halt. Otherwise proceed to Phase 5.

## PHASE 4: Quality Validation (with auto-fix)

**This phase runs inside the dedicated validation subagent spawned from PHASE 3.2** — listed here for visibility.

The validation subagent runs the Quality Validation Loop from bmad-workflow skill:

- Full validation steps (pnpm all, e2e tests, dupcheck, format, code self-review)
- Retry logic (10 attempts per step)
- MCP usage (Context7 for API errors, Playwright for UI issues)
- Critical loop structure (restart from step 1 if any check fails and gets fixed)

All checks must pass in a single iteration. The validation subagent returns to the Phase 3.2 implementation subagent only after validation passes.

## PHASE 5: Next Bug Decision

After current bug fix is validated, use the prompt skill to ask: `Bug fix validated. Fix another bug in this branch? Reply with continue, stop, or the next bug description.`

Handle the response:

- **"continue"** OR any affirmative: Make a second call for bug description, then spawn a subagent as described in PHASE 3.2
- **"stop"**: Proceed to Phase 6 (create PR with all fixes)
- **Custom text**: Use as the bug description and spawn a subagent as described in PHASE 3.2 (skip the separate Phase 3.1 prompt-skill call)

**Note**: All bugs fixed in Phase 5 loop will be in ONE PR for atomic review.

### PHASE 5 Context Refresh (REQUIRED before each new bug in this loop)

Before making any Phase 5 prompt-skill call or spawning the next subagent, **re-read all of the following files** to restore lost context in the main agent:

1. Re-read the bmad-workflow skill: `.github/skills/bmad-workflow/SKILL.md`
2. Re-read the human interaction protocol: `.github/skills/bmad-workflow/references/human-interaction.md`
3. Re-read the epic file: `docs/epics/${epic}.md`
4. Re-read the dev agent core config: `.bmad-core/core-config.yaml`

**WHY (context refresh)**: After multiple loop iterations the main agent's context window may be summarized, causing it to forget that it must use the prompt skill for the "fix another bug?" prompt. Re-reading keeps the main orchestration loop correct.

**WHY (subagent)**: Even with a refresh, the main agent still carries accumulated context from all prior bugs. The subagent in PHASE 3.2 gets a completely clean slate for each bug fix, eliminating any risk of its implementation or quality-validation work being affected by forgotten rules.

**REMINDER after re-reading**: You MUST use the prompt skill for ALL human interaction in this loop. NEVER write questions or status messages to the chat window.

## PHASE 6: Commit and PR Creation

Once all bugs are fixed and no more bug work requested, delegate PR creation and CodeRabbit handling to a dedicated subagent:

```bash
run #file:./debug-pr-lifecycle.prompt.md story=${story}
```

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

Delegate final merge and cleanup to a dedicated subagent:

```bash
run #file:./debug-merge-finalize.prompt.md story=${story}
```

This keeps the debug workflow context small while the merge subagent handles:

1. mergeability verification
2. conflict detection and rebase attempts
3. re-validation after conflict resolution
4. squash merge execution
5. issue-close verification and local cleanup

**CRITICAL**: The merge subagent must not return success until the PR is merged and cleanup is complete. If it returns `MERGE FAILED`, use the prompt skill to ask: `Debug merge failed for ${story}: <reason>. Reply with stop or instructions.`

## Error Recovery Strategy

**See "Error Recovery Strategy" in bmad-workflow skill for full details.**

## Success Criteria

✅ All 8 phases complete without "stop" command = All bugs fixed, reviewed, and merged
✅ Multiple bugs can be fixed in Phase 5 loop before PR creation
✅ One branch, one PR, one merge for all bugs in session

## Notes

- This workflow is designed for zero human intervention on happy path
- Human involvement only via the prompt skill when decisions/help are needed
- Maintains quality gates while maximizing autonomy
- See bmad-workflow skill for detailed patterns and best practices
