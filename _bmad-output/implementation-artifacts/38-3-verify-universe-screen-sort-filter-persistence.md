# Story 38.3: Verify Universe Screen Sort/Filter Persistence Still Works

Status: Approved

## Story

As a developer,
I want to confirm that the Universe Screen sort/filter state persistence tests exist, are passing, and have not been broken by the changes in Stories 38.1 and 38.2,
so that there is no regression to the already-working Universe Screen behaviour.

## Acceptance Criteria

1. **Given** the Playwright e2e suite, **When** `pnpm e2e` runs after Stories 38.1 and 38.2 are complete, **Then** any pre-existing e2e tests for Universe Screen sort/filter persistence continue to pass.
2. **Given** no e2e tests exist for Universe Screen sort/filter persistence (possible gap), **When** this story is worked, **Then** Playwright tests are added covering: sort indicator visible after refresh, filter value visible after refresh, data sorted/filtered accordingly after refresh.
3. **Given** all e2e changes, **When** `pnpm all` runs, **Then** all tests pass.

## Definition of Done

- [ ] Universe Screen sort persistence e2e test confirmed passing (or created if missing)
- [ ] Universe Screen filter persistence e2e test confirmed passing (or created if missing)
- [ ] `pnpm all` passes
- [ ] `pnpm format` passes

## Tasks / Subtasks

- [ ] Search `apps/dms-material-e2e/` for existing Universe Screen sort/filter persistence tests (AC: #1)
- [ ] If tests exist: run them and confirm they still pass after Stories 38.1/38.2 changes (AC: #1)
- [ ] If tests are missing: create Playwright tests for Universe Screen sort persistence after refresh (AC: #2)
  - [ ] Apply sort → `page.reload()` → assert sort indicator on correct column header
- [ ] If tests are missing: create Playwright tests for Universe Screen filter persistence after refresh (AC: #2)
  - [ ] Apply filter → `page.reload()` → assert filter input value preserved
- [ ] Run `pnpm all` and fix any failures (AC: #3)
- [ ] Run `pnpm format`

## Dev Notes

### Key Files

- `apps/dms-material-e2e/` — search for existing Universe Screen e2e tests related to sort and filter state
- `apps/dms-material/src/app/global/` — Universe Screen component for reference on what state is persisted

### Approach

This is a verification story. Start by running the existing e2e suite and checking for sort/filter persistence tests. If they exist and pass, the story may be very quick. If they're missing, write them using the same patterns as Story 38.1. The goal is to ensure the Account screen changes in 38.1/38.2 did not inadvertently break the Universe Screen's existing persistence logic.

## Dev Agent Record

### Agent Model Used

### Completion Notes

## File List
