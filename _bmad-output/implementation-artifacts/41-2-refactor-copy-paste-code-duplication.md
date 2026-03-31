# Story 41.2: Refactor Copy-Paste Code Duplication (jscpd Violations)

Status: Approved

## Story

As a developer maintaining code quality,
I want all jscpd copy-paste violations identified in Story 41.1 to be refactored into shared utilities or services,
so that the codebase has zero copy-paste duplication at the 0% threshold.

## Acceptance Criteria

1. **Given** the jscpd violations list from Story 41.1, **When** each violation is refactored, **Then** the duplicated code is extracted to a shared function, utility, or service in an appropriate location (following existing project conventions).
2. **Given** `pnpm dupcheck` runs after all refactoring, **When** the result is checked, **Then** it passes with 0 violations (0% threshold).
3. **Given** all test suites, **When** `pnpm all` runs after each refactor batch, **Then** all tests continue to pass (no functionality broken by refactoring).
4. **Given** the refactoring only targets code identified in Story 41.1, **When** the diff is reviewed, **Then** no scope creep or unrelated changes are present.

## Definition of Done

- [ ] All jscpd violations from Story 41.1 audit resolved
- [ ] `pnpm dupcheck` passes at 0% threshold
- [ ] `pnpm all` passes
- [ ] `pnpm format` passes

## Tasks / Subtasks

- [ ] Read `duplication-audit.md` from Story 41.1 and collect all jscpd violations (AC: #1)
- [ ] For each violation: extract duplicated code block into an appropriately named shared utility/function/service (AC: #1)
  - [ ] Place in `apps/dms-material/src/app/shared/utils/` (frontend) or `apps/server/src/app/routes/common/` (server) following existing conventions
  - [ ] Update all callers to use the shared version
- [ ] Run `pnpm all` after each extraction to verify no regression (AC: #3)
- [ ] Run `pnpm dupcheck` after all violations are addressed and confirm 0 violations (AC: #2)
- [ ] Run `pnpm all` final check (AC: #3)
- [ ] Run `pnpm format`

## Dev Notes

### Key Files

- `_bmad-output/implementation-artifacts/duplication-audit.md` — Story 41.1 output; list of all jscpd violations
- `apps/dms-material/src/app/shared/utils/` — target for shared frontend utilities
- `apps/server/src/app/routes/common/` — target for shared server utilities

### Approach

Work through violations from smallest/simplest to largest/most complex. After each extraction, run `pnpm all` before moving to the next to catch any breakages immediately. The goal is zero jscpd violations with `pnpm dupcheck`. Keep changes surgical — refactor the identified duplicates only; do not restructure surrounding code.

## Dev Agent Record

### Agent Model Used

### Completion Notes

## File List
