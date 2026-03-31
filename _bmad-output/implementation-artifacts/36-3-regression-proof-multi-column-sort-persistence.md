# Story 36.3: Regression-Proof Multi-Column Sort State Persistence

Status: Approved

## Story

As Dave (the investor),
I want the multi-column sort state on the Universe Screen to be preserved when I refresh the page,
so that I don't have to re-apply my preferred sort order after every navigation.

## Acceptance Criteria

1. **Given** the investor applies a multi-column sort on the Universe Screen, **When** the browser is refreshed, **Then** the sort state (including all secondary columns) is restored and the sort indicators are visible on the correct column headers.
2. **Given** the sort state is restored, **When** the data loads, **Then** the data is sorted in the same order as before refresh (server honoured).
3. **Given** this story depends on Stories 36.1 and 36.2 being complete, **When** the e2e tests from Story 36.1 are extended to cover refresh persistence, **Then** the refresh-persistence test passes.
4. **Given** all changes, **When** `pnpm all` runs, **Then** all tests pass.

## Definition of Done

- [ ] `SortFilterStateService.saveSortState` correctly persists `sortColumns` array
- [ ] `SortFilterStateService.loadSortState` correctly restores `sortColumns` array
- [ ] Sort indicator arrows visible on all sort columns after refresh
- [ ] E2e test for refresh persistence passes
- [ ] `pnpm all` passes
- [ ] `pnpm format` passes

## Tasks / Subtasks

- [ ] Check `SortFilterStateService` `saveSortState`/`loadSortState` for multi-column array serialisation support (AC: #1)
  - [ ] Verify that `sortColumns` array is correctly serialised to/from `localStorage` (or equivalent)
  - [ ] Ensure JSON stringify/parse is used (not toString which would lose structure)
- [ ] Fix any serialisation gaps so the full `sortColumns` array survives a page refresh (AC: #1, #2)
- [ ] Verify sort indicator UI reads restored sort state and applies visual indicators to all sort columns (AC: #1)
- [ ] Extend the e2e tests from Story 36.1 to add a refresh-persistence scenario (AC: #3)
  - [ ] Apply multi-column sort → refresh → assert sort indicators on both columns
  - [ ] Assert data is still sorted in the same order after refresh
- [ ] Run `pnpm all` and fix any failures
- [ ] Run `pnpm format`

## Dev Notes

### Key Files

- `apps/dms-material/src/app/shared/services/sort-filter-state.service.ts` — `saveSortState`/`loadSortState`; check if it serialises full `SortColumn[]` or just a single column
- `apps/dms-material/src/app/global/` — Universe Screen component that reads sort state on init
- `apps/dms-material-e2e/` — extend existing multi-column sort tests from Story 36.1

### Approach

Likely already works if `saveSortState` uses `JSON.stringify`. The key failure mode is if the service saves `sortColumns[0].field` as a string instead of saving the full array. Check the service implementation and add/update the unit tests. The e2e extension should use `page.reload()` to simulate refresh.

## Dev Agent Record

### Agent Model Used

### Completion Notes

## File List
