# Story 42.1: Run and Fix Failing Chromium E2E Tests

Status: Approved

## Story

As a developer,
I want all Playwright e2e tests to pass in Chromium,
so that the implementation matches the acceptance criteria defined in previous sprints.

## Acceptance Criteria

1. **Given** the full Playwright e2e suite, **When** `pnpm run e2e:dms-material:chromium` is executed, **Then** all tests pass with zero failures.
2. **Given** a failing test, **When** the root cause is investigated, **Then** the fix is applied to the implementation code, not to the test.
3. **Given** a test whose intent is unclear, **When** clarification is needed, **Then** the corresponding epic/story in `_bmad-output/planning-artifacts/epics-2026-03-31.md` is consulted for context.
4. **Given** all implementation fixes, **When** `pnpm all` runs, **Then** all unit tests continue to pass (no regressions introduced by the fixes).

## Tasks / Subtasks

- [ ] Run `pnpm run e2e:dms-material:chromium` and capture all failures (AC: #1)
  - [ ] Record each failing test name and the error message
- [ ] Investigate and fix each failing test (AC: #2)
  - [ ] For each failure, locate the relevant implementation code
  - [ ] If clarification is needed, reference `_bmad-output/planning-artifacts/epics-2026-03-31.md` (AC: #3)
  - [ ] Apply fix to implementation code only — do not touch test files
  - [ ] Re-run `pnpm run e2e:dms-material:chromium` after each fix batch to confirm progress
- [ ] Confirm all Chromium tests pass (AC: #1)
- [ ] Run `pnpm all` and confirm no unit test regressions (AC: #4)

## Dev Notes

### Key Commands

- Run chromium e2e tests: `pnpm run e2e:dms-material:chromium`
- E2e test location: `apps/dms-material-e2e/`
- Reference for test intent: `_bmad-output/planning-artifacts/epics-2026-03-31.md`

### Rules

- **Do not modify test files** — tests are the source of truth
- Consult `epics-2026-03-31.md` ONLY for clarification; do not use it as a source of new work
- Fix implementation to satisfy tests, not the other way around

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-02.md]
- [Source: _bmad-output/planning-artifacts/epics-2026-03-31.md] (reference only)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
