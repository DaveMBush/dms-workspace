---
description: Dedicated quality validation loop runner
agent: dev
argument-hint: context=story-AD.3
model: Claude Sonnet 4.6 (copilot)
---

# Dedicated Quality Validation Workflow

**IMPORTANT**: This workflow uses the bmad-workflow skill:

#skill:bmad-workflow

Run this prompt from the repository/worktree that contains the code being validated.

## Purpose

This prompt exists to run the full quality validation loop in a **fresh subagent context** so long-running test/debug/fix cycles do not consume the parent workflow's context window.

## Required Startup Context

Before running the loop, read all of the following:

1. `.github/skills/bmad-workflow/SKILL.md`
2. `.github/skills/bmad-workflow/references/human-interaction.md`
3. `.github/skills/bmad-workflow/references/quality-validation.md`
4. `.github/instructions/code-review.md`
5. `.bmad-core/core-config.yaml`

## Execution Rules

1. Operate in the **current working directory** only.
2. Treat `${context}` only as a logging label for status messages and summaries.
3. Run the Quality Validation Loop exactly as defined in `.github/skills/bmad-workflow/references/quality-validation.md`.
4. Auto-fix failures and code-review findings when possible.
5. If any fix is applied, restart the loop from step 1.
6. For all human interaction, use `.github/prompts/prompt.sh` via `run_in_terminal` with `timeout: 0`.
7. Do not ask for confirmation when the loop completes successfully; return control immediately to the caller.

## Completion Contract

Return a concise summary containing:

- `context`: `${context}`
- `status`: `VALIDATION PASSED` or `VALIDATION FAILED`
- files changed during validation/fix loop
- checks run
- brief summary of any auto-fixes applied

If validation fails after exhausting the loop rules, return `VALIDATION FAILED: <reason>` after handling required `prompt.sh` escalation.
