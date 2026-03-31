# Story 36.1: Write Failing E2E Tests for Multi-Column Sort on Universe Screen

Status: Approved

## Story

As a developer,
I want Playwright e2e tests that capture the expected behaviour of multi-column sorting on the Universe Screen,
so that they fail against the current buggy implementation and pass once the bug is fixed.

## Acceptance Criteria

1. **Given** the Universe Screen loaded with ≥ 10 rows, **When** the investor sorts by a primary column (e.g. Ticker, ascending), **Then** the e2e test asserts the rows are ordered ascending by that column.
2. **Given** a primary sort already applied, **When** the investor shift-clicks a secondary sort column (e.g. Price), **Then** the test asserts that rows with identical primary-sort values are ordered by the secondary column — this test currently **fails** because the secondary sort has no effect.
3. **Given** the tests are written, **When** `pnpm e2e` runs against the current (buggy) codebase, **Then** the secondary-sort test fails (confirming it captures the real bug), and the primary-sort test passes.

## Definition of Done

- [ ] Playwright test file created/updated under `apps/dms-material-e2e/`
- [ ] Primary sort test passes against current code
- [ ] Secondary sort test fails against current code (it is a _failing_ test by design here)
- [ ] Tests are clearly named so they can be used as verification in Story 36.2
- [ ] `pnpm format` passes

## Tasks / Subtasks

- [ ] Identify the Universe Screen page object or test helpers in `apps/dms-material-e2e/` (AC: #1)
- [ ] Write a Playwright test that: loads Universe Screen, clicks a column header (e.g. Ticker), asserts rows are sorted ascending (AC: #1)
  - [ ] Confirm this test passes against the current codebase
- [ ] Write a Playwright test that: applies primary sort, shift-clicks a secondary column header, asserts rows with identical primary values are sorted by secondary — this is expected to fail (AC: #2)
  - [ ] Confirm this test fails against the current codebase (the bug is real)
- [ ] Use `test.fail()` or a clear test name convention to indicate the secondary sort test is intentionally failing (AC: #3)
- [ ] Run `pnpm format`

## Dev Notes

### Key Files

- `apps/dms-material-e2e/` — existing Playwright tests; follow naming and page-object conventions
- Universe Screen URL and column header selectors — check existing e2e tests for patterns
- The secondary sort is triggered via shift-click on a column header

### Approach

Use Playwright's `page.keyboard.down('Shift')` + `locator.click()` pattern to trigger multi-column sort. To verify secondary sort order, query two rows that share the same primary sort value and assert their secondary field order. Seed or use existing test data that guarantees duplicate values in the primary column. Mark the failing test clearly with a comment like `// Currently fails — secondary sort bug (fixed in Story 36.2)`.

## Dev Agent Record

### Agent Model Used

### Completion Notes

## File List
