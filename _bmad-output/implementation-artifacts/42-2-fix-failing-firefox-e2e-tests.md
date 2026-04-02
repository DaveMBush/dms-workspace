# Story 42.2: Run and Fix Failing Firefox E2E Tests

Status: Approved

## Story

As a developer,
I want all Playwright e2e tests to pass in Firefox,
so that the implementation is browser-agnostic and fully satisfies all acceptance criteria.

## Acceptance Criteria

1. **Given** the full Playwright e2e suite with Chromium tests already passing (Story 42.1 complete), **When** `pnpm run e2e:dms-material:firefox` is executed, **Then** all tests pass with zero failures.
2. **Given** a test that passes in Chromium but fails in Firefox, **When** the root cause is investigated, **Then** the fix targets browser-compatibility in the implementation code, not the test.
3. **Given** all Firefox fixes applied, **When** `pnpm run e2e:dms-material:chromium` is re-run, **Then** it still passes (no Chromium regressions from the Firefox fixes).
4. **Given** all implementation fixes, **When** `pnpm all` runs, **Then** all unit tests continue to pass.

## Tasks / Subtasks

- [ ] Confirm Story 42.1 is done (Chromium tests all passing) before starting (AC: #1)
- [ ] Run `pnpm run e2e:dms-material:firefox` and capture all failures (AC: #1)
  - [ ] Record each failing test name and the error message
- [ ] Investigate and fix each Firefox failure (AC: #2)
  - [ ] For each failure, determine if it is browser-specific or a general bug
  - [ ] Apply fix to implementation code only — do not touch test files
  - [ ] If clarification needed, reference `_bmad-output/planning-artifacts/epics-2026-03-31.md`
  - [ ] Re-run `pnpm run e2e:dms-material:firefox` after each fix batch
- [ ] Re-run `pnpm run e2e:dms-material:chromium` to verify no regressions (AC: #3)
  - [ ] If Chromium regressions found, fix them and loop back through both browsers
- [ ] Run `pnpm all` and confirm no unit test regressions (AC: #4)

## Dev Notes

### Key Commands

- Run firefox e2e tests: `pnpm run e2e:dms-material:firefox`
- Run chromium e2e tests: `pnpm run e2e:dms-material:chromium`
- E2e test location: `apps/dms-material-e2e/`
- Reference for test intent: `_bmad-output/planning-artifacts/epics-2026-03-31.md`

### Rules

- **Do not modify test files** — tests are the source of truth
- Story 42.1 must be fully complete before this story begins
- After Firefox fixes, always re-run Chromium to catch regressions
- If fixes cause Chromium regressions, loop: fix → chromium → firefox → repeat

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-02.md]
- [Source: _bmad-output/planning-artifacts/epics-2026-03-31.md] (reference only)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
