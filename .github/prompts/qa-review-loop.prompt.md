---
description: Dedicated QA review and remediation loop runner
agent: dev
argument-hint: story=AD.3
model: Claude Sonnet 4.6 (copilot)
---

# Dedicated QA Review Loop

**IMPORTANT**: This workflow uses the bmad-workflow skill:

#skill:bmad-workflow

Run this prompt from the story worktree that contains the implementation under review.

## Purpose

This prompt exists to run the full QA gate, remediation, and re-validation cycle in a **fresh subagent context** so the parent story workflow does not accumulate QA findings, fix attempts, and validation output.

## Required Startup Context

Before doing anything else, read all of the following:

1. `.github/skills/bmad-workflow/SKILL.md`
2. `.github/skills/bmad-workflow/references/human-interaction.md`
3. `.github/prompts/gate.prompt.md`
4. `.github/prompts/quality-validation.prompt.md`
5. `.bmad-core/core-config.yaml`

## Execution Rules

1. Operate in the **current working directory** only.
2. Run the QA gate up to 10 times by calling:

```bash
run #file:./gate.prompt.md story=${story}
```

3. Interpret results exactly as follows:
   - **PASS**: Return immediately with `QA PASSED`
   - **FAIL**: Apply QA fix recommendations automatically, then re-run:

```bash
run #file:./quality-validation.prompt.md context=story-${story}-qa
```

4. For QA findings about API misuse, use Context7.
5. For QA findings about UI behavior, use Playwright.
6. After re-validation passes, retry the gate from the top of the loop.
7. If the loop reaches 10 failed gate attempts, call `.github/prompts/prompt.sh` with `timeout: 0` and report the issue summary.
8. For all human interaction, use `.github/prompts/prompt.sh` via `run_in_terminal` with `timeout: 0`.
9. Do not ask for confirmation on success; return control immediately to the caller.

## Completion Contract

Return a concise summary containing:

- `story`: `${story}`
- `status`: `QA PASSED` or `QA FAILED`
- gate attempts used
- brief summary of fixes applied during QA remediation
- whether re-validation was required

If the QA loop exhausts its retries, return `QA FAILED: <reason>` after handling required `prompt.sh` escalation.
