# Story 23.2: Resolve Duplication Exposed by jscpd Fix

Status: Approved

## Story

As a developer,
I want all real code duplication flagged after the jscpd config fix to be properly refactored,
so that the codebase has no copy-pasted logic and `pnpm dupcheck` exits clean.

## Acceptance Criteria

1. **Given** `pnpm dupcheck` is run after Story 23.1 is merged, **When** it reports duplicate blocks, **Then** those blocks are refactored into shared utilities, base classes, or Angular services (not re-suppressed in the config).
2. **Given** a refactored shared abstraction, **When** the affected feature components are reviewed, **Then** their behavior is unchanged and all existing tests still pass.
3. **Given** the completion of refactoring, **When** `pnpm dupcheck` is run, **Then** it exits with no duplication violations.
4. **Given** any new shared file created during refactoring, **When** the repository is reviewed, **Then** the new file has at least one test covering its primary logic if it contains non-trivial branch logic.

## Definition of Done

- [ ] All duplication flagged by `pnpm dupcheck` resolved via refactoring (no new suppression entries)
- [ ] All existing tests pass after refactoring
- [ ] `pnpm dupcheck` exits clean
- [ ] Run `pnpm all`
- [ ] Run `pnpm e2e:dms-material:chromium`
- [ ] Run `pnpm e2e:dms-material:firefox`
- [ ] Run `pnpm dupcheck`
- [ ] Run `pnpm format`
- [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Run baseline duplication report (AC: #1)
  - [ ] Execute `pnpm dupcheck` and capture full output
  - [ ] List every duplicate block: file paths, line ranges, estimated clone size
- [ ] Identify refactoring strategy per duplicate group (AC: #1)
  - [ ] Group clones by domain: screener vs universe vs summary vs server routes
  - [ ] For each group decide: shared service, shared util function, or shared base class
- [ ] Implement refactoring (AC: #1, #2)
  - [ ] Create shared abstractions in appropriate locations:
    - Frontend: `apps/dms-material/src/app/shared/` (utils or services)
    - Backend: `apps/server/src/shared/` or colocated in route directory
  - [ ] Update all clone sites to use the new shared code
  - [ ] Ensure Angular signal patterns are preserved (`inject()`, `input()`, `signal()`)
- [ ] Write tests for non-trivial shared logic (AC: #4)
  - [ ] Identify new shared files with branching logic
  - [ ] Add Vitest unit tests covering each branch
- [ ] Verify duplication is gone (AC: #3)
  - [ ] Run `pnpm dupcheck` and confirm no violations
  - [ ] Run `pnpm all` to confirm no regressions

## Dev Notes

### Key Files (likely candidates for duplication, based on domain analysis)

- `apps/dms-material/src/app/global/global-screener/` — screener table logic
- `apps/dms-material/src/app/global/global-universe/` — universe table logic
- `apps/dms-material/src/app/global/global-summary/` — summary logic
- `apps/dms-material/src/app/accounts/account-summary/` — account summary
- `apps/server/src/routes/trades/get-closed-trades/` — closed trades route
- `apps/server/src/routes/trades/get-open-trades/` — open trades route
- `apps/dms-material/src/app/shared/` — target location for new Angular shared utilities

### Architecture Constraints

- All Angular code must use zoneless patterns: `inject()` for DI, `input()`/`output()` for component I/O, `signal()` for mutable state, `OnPush` change detection.
- Do NOT use `new Service()` directly; use `inject()`.
- Backend shared utilities should go under `apps/server/src/shared/` or a new `utils/` directory co-located with the affected routes.

### Dependencies

- Depends on Story 23.1 (jscpd config fix must be merged first so that `pnpm dupcheck` reports real clones)

### References

[Source: .jscpd.json]
[Source: apps/dms-material/src/app/global/]
[Source: apps/server/src/routes/trades/]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
