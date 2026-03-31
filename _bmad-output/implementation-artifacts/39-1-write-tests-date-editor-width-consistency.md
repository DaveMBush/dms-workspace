# Story 39.1: Write Tests for Date Editor Width Consistency

Status: Approved

## Story

As a developer,
I want tests that capture the expected consistent width of the date editor — whether empty or filled — so that the fix can be TDD-verified.

## Acceptance Criteria

1. **Given** the date editor cell component rendered in isolation (Storybook or component harness), **When** the date input is empty, **Then** the test asserts the rendered width (or `min-width` CSS value) is equal to the width when the input contains a formatted date string.
2. **Given** the date editor rendered in a Playwright e2e context inside the Universe Screen, **When** a date cell is in edit mode with no value, **Then** the test asserts the input element's `offsetWidth` is ≥ the width of a filled date input (e.g. "2024-01-15" formatted).
3. **Given** these tests are written, **When** run against the current code, **Then** they fail (confirming they capture the bug).

## Definition of Done

- [ ] Playwright e2e test (or Vitest component test) written for empty date editor width
- [ ] Test fails against current code
- [ ] `pnpm format` passes

## Tasks / Subtasks

- [ ] Locate the date editor component in the codebase (AC: #1)
  - [ ] Find the inline cell editor used for date fields in the data table
- [ ] Write a Playwright e2e test that: opens a row with a date field → clicks to enter edit mode → measures `offsetWidth` of the empty date input → fills in a date → measures `offsetWidth` again → asserts both widths are equal (AC: #2)
- [ ] Confirm the test fails against the current code (the empty input is narrower) (AC: #3)
- [ ] Optionally add a Vitest component test if a component harness exists for the date editor (AC: #1)
- [ ] Run `pnpm format`

## Dev Notes

### Key Files

- `apps/dms-material/src/app/shared/components/` — look for a date-editor or date-cell-editor component
- `apps/dms-material-e2e/` — Playwright test suite for e2e test placement
- Universe Screen — a table with at least one date column (e.g. add/update date) to trigger the editor

### Approach

Use `page.evaluate(() => document.querySelector('input[type="date"]').offsetWidth)` to measure the width. Trigger edit mode by clicking a date cell. Measure width with empty value, then type a date and measure again. Assert `emptyWidth >= filledWidth`. This test should fail on the current code because the empty date input has no `min-width` set.

## Dev Agent Record

### Agent Model Used

### Completion Notes

## File List
