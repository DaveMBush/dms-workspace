# Story 30.1: Replace Rate-Limiting Directive in All Prompt and Instruction Files

Status: Approved

## Story

As a developer working with AI agents,
I want all prompt and instruction files to use the updated, explicit rate-limiting directive,
so that agents know precisely what actions require a 2-minute wait and rate-limit failures are reduced during long-running story implementations.

## Acceptance Criteria

1. **Given** all files under `.github/prompts/` and `.github/instructions/` that contain the old rate-limiting statement, **When** the replacement is applied, **Then** every occurrence of `- Always wait for at least 2 minutes between API calls.` is replaced with `- Always wait for at least 2 minutes between terminal calls, calls to MCP servers, or code updates.`
2. **Given** the surrounding block `To avoid GitHub Copilot rate limiting:` and `Prefer slow completion over fast failure.`, **When** the replacement is applied, **Then** those surrounding lines are preserved exactly — only the single bullet line changes.
3. **Given** all replacements are applied, **When** `grep -r "between API calls" .github/` runs, **Then** it returns zero results.
4. **Given** all replacements are applied, **When** `grep -r "between terminal calls, calls to MCP servers, or code updates" .github/` runs, **Then** it returns 17 results (one per affected file).
5. **Given** all changes, **When** `pnpm all` runs, **Then** it passes.

## Definition of Done

- [ ] All 17 files updated (see Task list)
- [ ] `grep -r "between API calls" .github/` returns zero results
- [ ] `pnpm all` passes
- [ ] Run `pnpm format`
- [ ] Repeat all if any fail

## Tasks / Subtasks

- [ ] Replace directive in `.github/prompts/gate.prompt.md` (AC: #1, #2)
  - [ ] Line 25: change `- Always wait for at least 2 minutes between API calls.` → `- Always wait for at least 2 minutes between terminal calls, calls to MCP servers, or code updates.`
- [ ] Replace directive in `.github/prompts/quality-validation.prompt.md` (AC: #1, #2)
  - [ ] Line 62
- [ ] Replace directive in `.github/prompts/develop-story.prompt.md` (AC: #1, #2)
  - [ ] Line 173
- [ ] Replace directive in `.github/prompts/code-story.prompt.md` (AC: #1, #2)
  - [ ] Line 34
- [ ] Replace directive in `.github/prompts/debug-pr-lifecycle.prompt.md` (AC: #1, #2)
  - [ ] Line 71
- [ ] Replace directive in `.github/prompts/update-epic.prompt.md` (AC: #1, #2)
  - [ ] Line 20
- [ ] Replace directive in `.github/prompts/debug-merge-finalize.prompt.md` (AC: #1, #2)
  - [ ] Line 82
- [ ] Replace directive in `.github/prompts/debug-setup.prompt.md` (AC: #1, #2)
  - [ ] Line 52
- [ ] Replace directive in `.github/prompts/develop-epic.prompt.md` (AC: #1, #2)
  - [ ] Line 75
- [ ] Replace directive in `.github/prompts/code-rabbit.prompt.md` (AC: #1, #2)
  - [ ] Line 69
- [ ] Replace directive in `.github/prompts/debug.prompt.md` (AC: #1, #2)
  - [ ] Line 196
- [ ] Replace directive in `.github/prompts/create-stories-for-epic.prompt.md` (AC: #1, #2)
  - [ ] Line 32
- [ ] Replace directive in `.github/prompts/merge-finalize.prompt.md` (AC: #1, #2)
  - [ ] Line 81
- [ ] Replace directive in `.github/prompts/commit-and-pr.prompt.md` (AC: #1, #2)
  - [ ] Line 59
- [ ] Replace directive in `.github/prompts/qa-review-loop.prompt.md` (AC: #1, #2)
  - [ ] Line 65
- [ ] Replace directive in `.github/instructions/shell-execution.md` (AC: #1, #2)
  - [ ] Line 201
- [ ] Replace directive in `.github/instructions/code-review.md` (AC: #1, #2)
  - [ ] Line 518
- [ ] Verify — run grep check (AC: #3, #4)
  - [ ] `grep -r "between API calls" .github/` → 0 results
  - [ ] `grep -r "between terminal calls" .github/` → 17 results
- [ ] Run `pnpm all` (AC: #5)

## Dev Notes

### Old Directive (exact string to replace)

```
- Always wait for at least 2 minutes between API calls.
```

### New Directive (exact string to use)

```
- Always wait for at least 2 minutes between terminal calls, calls to MCP servers, or code updates.
```

### Surrounding Block Pattern (preserved as-is in every file)

```
To avoid GitHub Copilot rate limiting:
- Always wait for at least 2 minutes between terminal calls, calls to MCP servers, or code updates.
- Prefer slow completion over fast failure.
```

### Affected Files (17 total, all under `.github/`)

```
.github/prompts/gate.prompt.md                          line 25
.github/prompts/quality-validation.prompt.md            line 62
.github/prompts/develop-story.prompt.md                 line 173
.github/prompts/code-story.prompt.md                    line 34
.github/prompts/debug-pr-lifecycle.prompt.md            line 71
.github/prompts/update-epic.prompt.md                   line 20
.github/prompts/debug-merge-finalize.prompt.md          line 82
.github/prompts/debug-setup.prompt.md                   line 52
.github/prompts/develop-epic.prompt.md                  line 75
.github/prompts/code-rabbit.prompt.md                   line 69
.github/prompts/debug.prompt.md                         line 196
.github/prompts/create-stories-for-epic.prompt.md       line 32
.github/prompts/merge-finalize.prompt.md                line 81
.github/prompts/commit-and-pr.prompt.md                 line 59
.github/prompts/qa-review-loop.prompt.md                line 65
.github/instructions/shell-execution.md                 line 201
.github/instructions/code-review.md                     line 518
```

### Important: Do NOT touch

- `.github/epic descriptions/epics-2026-03-30.md` — this file already has the NEW wording and also contains the old wording as documentation context. Do not edit it.

### No Code Changes Required

This story is purely a text substitution across markdown files. No TypeScript, HTML, SCSS, or JSON files are touched. The `pnpm all` gate is included as a safety net to confirm nothing breaks.

### References

[Source: _bmad-output/planning-artifacts/epics-2026-03-30.md — Epic 30]
[Source: .github/prompts/code-story.prompt.md — example file with the directive]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
