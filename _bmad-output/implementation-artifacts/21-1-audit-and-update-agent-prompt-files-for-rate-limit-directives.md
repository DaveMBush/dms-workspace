# Story 21.1: Audit and Update Agent Prompt Files for Rate-Limit Directives

Status: Review

## Story

As a developer,
I want all agent instruction files to include rate-limit guidance,
So that the AI agent completes long-running tasks without being interrupted by Copilot API rate limits.

## Acceptance Criteria

1. **Given** the workspace's `.github/instructions/` folder, `_bmad/` config files, and any `copilot-instructions.md`
   **When** I review each file for rate-limit guidance
   **Then** every file that governs agent behaviour includes a "Rate Limits" section (or equivalent inline instructions) that states:

   - Do not call the Copilot API more than once every 2 minutes if rate limiting is detected.
   - Insert a wait/pause step between API-dependent operations when processing multi-step tasks.
   - Prefer slow task completion over aborting a task mid-execution due to rate limits.

2. **Given** the rate-limit instructions are written
   **When** an LLM reads them
   **Then** the instructions are imperative, specific, and not vague — an LLM can follow them without ambiguity.

3. **Given** the file changes are made
   **When** I run `pnpm all`
   **Then** lint, build, and unit tests still pass (these are markdown files with no build impact).

## Definition of Done

- [x] All agent instruction/prompt files in `.github/instructions/` audited
- [x] All agent instruction/prompt files in `.github/prompts/` audited
- [x] `_bmad/` config yaml files audited
- [x] Any `copilot-instructions.md` file audited
- [x] Rate-limit directive added to every file that governs agent behaviour
- [x] Instructions are imperative, specific, and LLM-followable
- [x] `pnpm all` passes

## Tasks / Subtasks

- [x] Identify all agent-governance files to update (AC: 1)
  - [x] List `.github/instructions/*.md` — these are the primary instruction files
  - [x] List `.github/prompts/*.prompt.md` — prompt files that control agent behaviour
  - [x] Check `.github/instructions/` for any `copilot-instructions.md`
  - [x] Check `_bmad/bmm/config.yaml` and `_bmad/_config/` for any agent behaviour config
- [x] For each file that governs agent task execution, add rate-limit section (AC: 1, 2)
  - [x] For `.github/prompts/develop-story.prompt.md` — add "Rate Limits" section stating the pause/wait rules
  - [x] For `.github/prompts/quality-validation.prompt.md` — add same
  - [x] For `.github/prompts/debug.prompt.md` — add same
  - [x] For `.github/instructions/code-review.md` — add if applicable
  - [x] For any other instruction file that runs multi-step tasks
  - [x] Wording: "If GitHub Copilot rate limiting is detected or approached: (1) pause for at least 2 minutes before the next API call, (2) do not abort the task — resume from the last completed step after the pause, (3) prefer slow completion over fast failure."
- [x] Validate no build impact (AC: 3)
  - [x] Run `pnpm all`

## Dev Notes

### Files to Modify

- `.github/prompts/develop-story.prompt.md` [Source: .github/prompts/develop-story.prompt.md]
- `.github/prompts/quality-validation.prompt.md` [Source: .github/prompts/quality-validation.prompt.md]
- `.github/prompts/debug.prompt.md` [Source: .github/prompts/debug.prompt.md]
- Any additional `.github/instructions/*.md` files governing multi-step agent tasks [Source: .github/instructions/]

### Key Constraint (NFR-21-Reliability)

The rate-limit strategy must favour delay/wait between calls over hard count limits that would abort a mid-execution task. The instruction must be written as a conditional: "IF rate limiting is detected or approached, THEN pause..." not "NEVER make more than N calls."

### No Code Changes Required

This story involves only markdown prompt/instruction files. There are no TypeScript, SCSS, or HTML files to change. No migration, no schema change, no Angular component work.

### References

- [Source: .github/instructions/epics-2026-03-27.md#FR21] FR21 requirements
- [Source: _bmad-output/planning-artifacts/epics-2026-03-27.md#Epic-21] Epic 21 context

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- All 17 agent-governance files updated with consistent rate-limit directive
- Epics reference files and \_bmad config YAML files intentionally excluded (not agent execution files)
- No copilot-instructions.md found in workspace
- code-rabbit.prompt.md required special handling due to ```` prompt wrapper syntax

### File List

- `.github/prompts/code-story.prompt.md`
- `.github/prompts/develop-story.prompt.md`
- `.github/prompts/quality-validation.prompt.md`
- `.github/prompts/debug.prompt.md`
- `.github/prompts/gate.prompt.md`
- `.github/prompts/develop-epic.prompt.md`
- `.github/prompts/code-rabbit.prompt.md`
- `.github/prompts/commit-and-pr.prompt.md`
- `.github/prompts/create-stories-for-epic.prompt.md`
- `.github/prompts/debug-merge-finalize.prompt.md`
- `.github/prompts/debug-pr-lifecycle.prompt.md`
- `.github/prompts/debug-setup.prompt.md`
- `.github/prompts/merge-finalize.prompt.md`
- `.github/prompts/qa-review-loop.prompt.md`
- `.github/prompts/update-epic.prompt.md`
- `.github/instructions/shell-execution.md`
- `.github/instructions/code-review.md`

### Change Log

- Audited all `.github/instructions/` files: `code-review.md`, `shell-execution.md`, `epics-*.md`, `epics-next.md`
  - `code-review.md` and `shell-execution.md` govern agent behaviour — added Rate Limits section
  - `epics-*.md` and `epics-next.md` are reference/backlog docs — no directive needed
- Audited all 15 `.github/prompts/*.prompt.md` files — all govern agent workflow execution — added Rate Limits section to each
- Audited `_bmad/bmm/config.yaml` and `_bmad/_config/` YAML files — these are project metadata/config, not agent execution instructions — no directive needed
- Checked for `copilot-instructions.md` — none found in workspace
- Rate-limit directive wording: "If GitHub Copilot rate limiting is detected or approached: (1) pause for at least 2 minutes before the next API call, (2) do not abort the task — resume from the last completed step after the pause, (3) prefer slow completion over fast failure."
- Total files modified: 17 (15 prompt files + 2 instruction files)
