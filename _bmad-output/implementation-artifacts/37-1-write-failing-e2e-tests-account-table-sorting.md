# Story 37.1: Write Failing E2E Tests for Account Table Sorting

Status: review

## Story

As a developer,
I want Playwright e2e tests covering sort behaviour on the Open Positions, Closed Positions, and Dividend Deposits tables,
so that the tests fail against the current buggy state and can verify the fix.

## Acceptance Criteria

1. **Given** the Account panel Open Positions table loaded with ≥ 3 rows, **When** the investor clicks a sortable column header (e.g. Symbol), **Then** the test asserts the rows are ordered by that column — this test currently **fails** because the data is not sorted despite the icon appearing.
2. **Given** the same scenario on the Closed Positions table, **When** a column header is clicked, **Then** the test asserts sorted order — also currently fails.
3. **Given** the same scenario on the Dividend Deposits table, **When** a column header is clicked, **Then** the test asserts sorted order — also currently fails.
4. **Given** the tests are written, **When** `pnpm e2e` runs against the current codebase, **Then** all three sorting tests fail (confirming the bug is captured), and no existing tests break.

## Definition of Done

- [x] Playwright tests added for all three Account tables
- [x] All three sorting tests fail against current code
- [x] Tests use data fixtures with deterministic values
- [x] `pnpm format` passes

## Tasks / Subtasks

- [x] Locate the Account panel in the e2e tests and identify how to navigate to an account (AC: #1)
- [x] Write a Playwright test for Open Positions table: click a sortable column header, assert rows are ordered — expect this to fail (AC: #1)
- [x] Write a Playwright test for Closed Positions table: click a sortable column header, assert sorted order — expect this to fail (AC: #2)
- [x] Write a Playwright test for Dividend Deposits table: click a sortable column header, assert sorted order — expect this to fail (AC: #3)
- [x] Ensure test data fixtures provide deterministic values with known sort order (AC: #4)
- [x] Confirm all three tests fail against current code; confirm existing tests still pass (AC: #4)
- [x] Run `pnpm format`

## Dev Notes

### Key Files

- `apps/dms-material-e2e/` — existing Playwright tests; follow naming and page-object conventions
- Account panel navigation — check existing e2e tests for how to select an account
- Column header selectors for each Account table — inspect the BaseTable component's header rendering

### Approach

Follow the same pattern as Story 36.1 for the Universe Screen. Use consistent test data (fixtures or seeded data) so the expected sort order is deterministic. Mark the failing tests clearly. Each test should: navigate to the Account panel → select an account → load the relevant table → click column header → assert row order matches sort direction. The assertion will fail because of the known sort bug.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Completion Notes

- Created three Playwright e2e tests for Open Positions (Buy Date sort), Closed Positions (Sell Date sort), and Dividend Deposits (Amount sort)
- Created `seed-div-deposits-e2e-data.helper.ts` with deterministic `SEEDED_AMOUNTS = [50, 200, 100]`; reused existing open/sold positions seeders
- All three tests purposefully fail against current code because sort icon appears but rows stay in insertion order
- Fixed CodeRabbit actionable: added nested try/catch in seeder to delete orphaned account if deposit creation fails
- PR #868 merged to main at commit `a647f22`; issue #867 closed

## Change Log

- Added `apps/dms-material-e2e/src/account-table-sort.spec.ts` — three failing e2e tests
- Added `apps/dms-material-e2e/src/helpers/seed-div-deposits-e2e-data.helper.ts` — div deposits seeder

## File List

- apps/dms-material-e2e/src/account-table-sort.spec.ts (new)
- apps/dms-material-e2e/src/helpers/seed-div-deposits-e2e-data.helper.ts (new)
