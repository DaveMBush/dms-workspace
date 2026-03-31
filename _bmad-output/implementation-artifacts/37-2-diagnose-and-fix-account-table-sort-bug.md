# Story 37.2: Diagnose and Fix Account Table Sort Bug

Status: Approved

## Story

As Dave (the investor),
I want clicking a column header on the Account tables (Open Positions, Closed Positions, Dividend Deposits) to actually sort the data,
so that I can view my positions and dividends in a meaningful order.

## Acceptance Criteria

1. **Given** the failing e2e tests from Story 37.1, **When** the fix is applied, **Then** all three account-table sort e2e tests pass.
2. **Given** the Open Positions table, **When** the investor clicks a column header, **Then** the `x-table-state` header is sent with the correct sort field and direction on the subsequent data request, and the server returns sorted results.
3. **Given** the Closed Positions and Dividend Deposits tables, **When** a column header is clicked, **Then** same: sort state propagated to server and server returns sorted data.
4. **Given** the sort icon appears, **When** the data loads after clicking, **Then** the data order matches the sort direction (ascending on first click, descending on second).
5. **Given** all changes, **When** `pnpm all` runs, **Then** all tests (unit + e2e) pass.

## Definition of Done

- [ ] Root cause documented in story (e.g. sort state not wired to request, server ignoring header)
- [ ] Fix applied to all three Account tables
- [ ] All e2e tests from Story 37.1 pass
- [ ] `pnpm all` passes
- [ ] `pnpm format` passes

## Tasks / Subtasks

- [ ] Diagnose the sort bug for Account tables (AC: #2, #3)
  - [ ] Check if the Account table components wire `onSortChange` to the SmartNgRX store dispatch or HTTP request
  - [ ] Check if the server route for Account data reads the `x-table-state` header and builds an `orderBy` clause
  - [ ] Determine whether the sort icon state and the data request sort are disconnected
- [ ] Document the root cause in the Completion Notes of this story file
- [ ] Apply fix to all three Account table components and/or server routes (AC: #2, #3)
- [ ] Verify ascending/descending toggle works correctly (AC: #4)
- [ ] Add/update unit tests for the sort dispatch and server `orderBy` logic (AC: #5)
- [ ] Verify all e2e tests from Story 37.1 now pass (AC: #1)
- [ ] Run `pnpm all` and fix any failures
- [ ] Run `pnpm format`

## Dev Notes

### Key Files

- `apps/dms-material/src/app/accounts/` — Account panel components including Open Positions, Closed Positions, Dividend Deposits
- `apps/server/src/app/routes/` — Server routes for account data tables
- `BaseTableComponent` — shared table component; check if sort event is emitted correctly
- `SortFilterStateService` — check sort state save/load for account tables

### Approach

The likely root cause is that the Account table components do not wire the BaseTable's sort-change event through to the data store or HTTP request. The sort icon rendering may be purely cosmetic (driven by a local signal) while the actual data request ignores the sort. Compare the Account table sort wiring against the Universe Screen sort wiring to find the gap.

## Dev Agent Record

### Agent Model Used

### Completion Notes

## File List
