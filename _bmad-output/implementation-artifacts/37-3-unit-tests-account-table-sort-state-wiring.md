# Story 37.3: Unit Tests for Account Table Sort State Wiring

Status: Approved

## Story

As a developer,
I want unit tests for the sort-state wiring on the Account table components,
so that any future regression to the sort-dispatch logic is caught immediately at the unit test level.

## Acceptance Criteria

1. **Given** the `DividendDepositsComponent` (and corresponding Open/Closed Positions components), **When** `onSortChange(sortColumn)` is called, **Then** the unit test asserts that `SortFilterStateService.saveSortState` is called with the correct key and sort value.
2. **Given** the component initialises with a saved sort state, **When** the first data request is made, **Then** the unit test asserts the sort state is included in the table-state sent to the NgRx effect or data service.
3. **Given** all existing tests, **When** `pnpm all` runs, **Then** all tests (including the new unit tests) pass.

## Definition of Done

- [ ] Unit tests added for `saveSortState` call on sort change for all three Account table components
- [ ] Unit tests added for sort state hydration on component init
- [ ] `pnpm all` passes
- [ ] `pnpm format` passes

## Tasks / Subtasks

- [ ] Review the Account table component unit test files (if they exist) or create them (AC: #1)
- [ ] Add unit tests for `onSortChange` on `OpenPositionsComponent`: assert `SortFilterStateService.saveSortState` called with correct args (AC: #1)
- [ ] Add unit tests for `onSortChange` on `ClosedPositionsComponent`: same assertion (AC: #1)
- [ ] Add unit tests for `onSortChange` on `DividendDepositsComponent`: same assertion (AC: #1)
- [ ] Add unit tests for each component's `ngOnInit`/init effect: verify that saved sort state is loaded and included in the initial data request (AC: #2)
- [ ] Run `pnpm all` and fix any failures (AC: #3)
- [ ] Run `pnpm format`

## Dev Notes

### Key Files

- `apps/dms-material/src/app/accounts/` — component files for Open Positions (`open-positions.ts`), Closed Positions (`closed-positions.ts`), Dividend Deposits (`dividend-deposits.ts`)
- `SortFilterStateService` — the service to mock/spy in unit tests
- Existing unit test files for these components (or create new `.spec.ts` files following project conventions)

### Approach

Use `vi.spyOn(sortFilterStateService, 'saveSortState')` to assert the call. For the init test, spy on the store dispatch or HTTP service to verify the sort state is included in the first request parameters. Keep tests focused: one describe block per component, one `it` for sort-change and one `it` for init-state hydration.

## Dev Agent Record

### Agent Model Used

### Completion Notes

## File List
