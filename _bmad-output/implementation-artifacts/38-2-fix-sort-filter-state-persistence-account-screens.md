# Story 38.2: Fix Sort/Filter State Persistence for Account Screens

Status: Approved

## Story

As Dave (the investor),
I want my sort and filter settings on the Account tables to be remembered when I navigate away and return (or refresh),
so that I don't have to reapply my preferred view settings every time I open an Account screen.

## Acceptance Criteria

1. **Given** the failing tests from Story 38.1 (if any), **When** the fix is implemented, **Then** all sort/filter persistence tests pass for all three Account tables.
2. **Given** a sort state saved in `SortFilterStateService` for Open Positions, **When** the `OpenPositionsComponent` initialises, **Then** it reads the saved state and the sort icon is rendered on the correct column header before the first user interaction.
3. **Given** a filter state saved in `SortFilterStateService` for any Account table, **When** the component initialises, **Then** the filter input displays the saved value and the data is pre-filtered accordingly.
4. **Given** no existing sort/filter state (first visit or cleared state), **When** the Account screen loads, **Then** the tables render in their default order with no filters applied (no regression from current default behaviour).
5. **Given** all changes, **When** `pnpm all` runs, **Then** all tests pass.

## Definition of Done

- [ ] Sort/filter state read on init for Open Positions, Closed Positions, Dividend Deposits
- [ ] Sort icons and filter inputs hydrated from saved state on component init
- [ ] All e2e tests from Story 38.1 pass
- [ ] `pnpm all` passes
- [ ] `pnpm format` passes

## Tasks / Subtasks

- [ ] Read Story 38.1 test results to determine which persistence gaps actually exist (AC: #1)
- [ ] For each Account table component lacking sort persistence on init: add `SortFilterStateService.loadSortState()` call in the component's init logic and wire result to the sort signal/state (AC: #2)
- [ ] For each Account table component lacking filter persistence on init: add `SortFilterStateService.loadFilterState()` call and wire result to the filter input model (AC: #3)
- [ ] Ensure default (no saved state) path renders tables normally (AC: #4)
- [ ] Update existing unit tests to cover the init-hydration path (AC: #5)
- [ ] Verify all e2e tests from Story 38.1 pass (AC: #1)
- [ ] Run `pnpm all` and fix any failures (AC: #5)
- [ ] Run `pnpm format`

## Dev Notes

### Key Files

- `apps/dms-material/src/app/accounts/` — component files for all three Account tables
- `apps/dms-material/src/app/shared/services/sort-filter-state.service.ts` — `loadSortState`/`loadFilterState`
- Compare with the Universe Screen component init to see how it hydrates sort/filter state

### Approach

Mirror the Universe Screen's init pattern on all three Account table components. If `SortFilterStateService` uses a keyed API (`loadSortState(tableKey: string)`), ensure each Account table uses a unique, stable key (e.g. `'open-positions'`, `'closed-positions'`, `'dividend-deposits'`). If the service doesn't already support filter state persistence, this story may require extending the service.

## Dev Agent Record

### Agent Model Used

### Completion Notes

## File List
