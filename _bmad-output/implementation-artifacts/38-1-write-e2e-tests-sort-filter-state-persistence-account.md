# Story 38.1: Write E2E Tests for Sort/Filter State Persistence on Account Screens

Status: Approved

## Story

As a developer,
I want Playwright e2e tests that verify sort and filter state is reflected in the Account screen UI after a page refresh,
so that any regression in this behaviour is caught automatically.

## Acceptance Criteria

1. **Given** the investor applies a sort on the Open Positions table and navigates away and back (or refreshes), **When** the Account screen reloads, **Then** the sort indicator arrow is visible on the previously sorted column — if this is broken, the test fails.
2. **Given** the investor applies a filter on the Open Positions table and refreshes, **When** the Account screen reloads, **Then** the filter value is visible in the filter input — if this is broken, the test fails.
3. **Given** the same scenarios for Closed Positions and Dividend Deposits tables, **When** the tests run, **Then** they produce a clear pass/fail result for each table.
4. **Given** these tests reveal failures, **When** they are committed, **Then** the failures block Story 38.2 from being marked done (they serve as the acceptance bar for 38.2).

## Definition of Done

- [ ] Playwright tests written for sort persistence on all three Account tables
- [ ] Playwright tests written for filter persistence on all three Account tables
- [ ] Tests produce a clear indication of which tables have the bug (if any)
- [ ] `pnpm format` passes

## Tasks / Subtasks

- [ ] Write sort-persistence test for Open Positions: apply sort → refresh → assert sort indicator visible (AC: #1)
- [ ] Write filter-persistence test for Open Positions: apply filter → refresh → assert filter input value (AC: #2)
- [ ] Write sort-persistence test for Closed Positions (AC: #3)
- [ ] Write filter-persistence test for Closed Positions (AC: #3)
- [ ] Write sort-persistence test for Dividend Deposits (AC: #3)
- [ ] Write filter-persistence test for Dividend Deposits (AC: #3)
- [ ] Run tests; document which pass and which fail in the Completion Notes (AC: #4)
- [ ] Run `pnpm format`

## Dev Notes

### Key Files

- `apps/dms-material-e2e/` — existing Playwright tests; follow conventions for Account panel navigation
- Column header selectors and filter input selectors for each Account table

### Approach

Use `page.reload()` to simulate refresh. For sort persistence: check a CSS class or `aria-sort` attribute on the column header after reload. For filter persistence: check the filter input's `.value` property after reload. These tests intentionally expose whether the persistence is implemented. If all tests pass, Story 38.2 becomes a verification story; if they fail, 38.2 fixes the bugs these tests expose.

## Dev Agent Record

### Agent Model Used

### Completion Notes

## File List
