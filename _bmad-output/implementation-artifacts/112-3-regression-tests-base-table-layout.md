# Story 112.3: Tests and Regression Suite for Layout Regressions

Status: Approved

**Story Key:** `112-3-regression-tests-base-table-layout`
**Epic:** 112 — Fix Post-Refactor Layout Regressions in Two-Region Base Table
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-27.md](../planning-artifacts/epics-2026-05-27.md) (Story 112.3)
**Type:** Testing / Regression suite
**Depends on:** Story 112.2
**Enables:** nothing (final story in Epic 112)
**Requirements covered:** R1, R2, R3, R4

## Story

As a developer,
I want E2E tests that assert the vertical scrollbar position, the column fill behaviour, and the beyond-table background color on multiple viewport sizes across all consuming screens,
So that any future change that reintroduces any of these three regressions fails CI immediately.

## Epic Context

Story 112.2 applied the fixes. This story locks them in by adding a Playwright E2E regression suite that verifies each property (scrollbar edge, column fill, background color) programmatically and is included in `pnpm all` on both Chromium and Firefox.

## Acceptance Criteria

1. **AC1 — Scrollbar right-edge assertion on narrow viewport.** (R1)
   **Given** the Playwright E2E regression test,
   **When** the test exercises the Universe screen at a viewport narrower than the table and scrolls horizontally,
   **Then** the test asserts the scrollbar's right-edge position equals (within 2px) `window.innerWidth` at all tested horizontal scroll positions.

2. **AC2 — Container-width assertion on wide viewport.** (R2)
   **Given** the test exercises the Universe screen at a viewport wider than the table,
   **When** the table is rendered,
   **Then** the test asserts that the scrollable outer container's `clientWidth` equals the available container width, confirming the scrollbar is not prematurely truncated to the table content width.

3. **AC3 — Column fill assertion.** (R3)
   **Given** a screen whose total column width is less than the container width,
   **When** the test inspects the rendered column cells,
   **Then** the test asserts the sum of rendered column widths equals (within 2px) the container `clientWidth`.

4. **AC4 — Beyond-table background color assertion.** (R4)
   **Given** the same screen as AC3,
   **When** the test inspects the computed background color of the region to the right of the last column (if any uncovered region is measurable),
   **Then** the test asserts the computed background color matches the table cell background color (using `getComputedStyle`).

5. **AC5 — Chromium and Firefox.**
   **Given** Chromium and Firefox,
   **When** the suite runs in both,
   **Then** all assertions pass on both browsers.

6. **AC6 — Suite in `pnpm all`, not skipped.**
   **Given** the suite is committed,
   **When** CI runs,
   **Then** the suite is part of `pnpm all` and contains no `.skip` or `.only` annotations.

## Tasks / Subtasks

- [ ] **Task 1 — Create the regression test file** (AC: #1, #2, #3, #4)
  - [ ] Create a new Playwright spec file in
        `apps/dms-material-e2e/src/` (following the naming convention used by the
        Epic 111 regression suite from Story 111.4, e.g.
        `base-table-layout-regression.spec.ts`).
  - [ ] Add a `beforeEach` that logs in (if needed) and navigates to the Universe screen.

- [ ] **Task 2 — Scrollbar right-edge test (narrow viewport)** (AC: #1)
  - [ ] Set the viewport to a width narrower than the table (e.g. 800px).
  - [ ] Programmatically scroll the horizontal scroller to 50% of its `scrollWidth`.
  - [ ] Assert `scrollbarContainer.getBoundingClientRect().right` is within 2px of `page.viewportSize().width`.
  - [ ] Repeat at 100% scroll position.

- [ ] **Task 3 — Container-width test (wide viewport)** (AC: #2)
  - [ ] Set the viewport to a width wider than the table (e.g. 1800px).
  - [ ] Assert the scrollable outer container's `clientWidth` equals the viewport width (within 2px), confirming the scrollbar would appear at the far right.

- [ ] **Task 4 — Column fill test** (AC: #3)
  - [ ] Navigate to a screen whose columns total less than the test viewport width.
  - [ ] Use `page.evaluate` to sum `getBoundingClientRect().width` for all column header cells and compare to the container's `clientWidth`.
  - [ ] Assert difference is within 2px.

- [ ] **Task 5 — Background color test** (AC: #4)
  - [ ] Use `page.evaluate` and `getComputedStyle` to read the background color of: (a) a table body cell, and (b) the beyond-table region (e.g. the outer wrapper where no column is rendered).
  - [ ] Assert the two colors are equal.

- [ ] **Task 6 — Run on both browsers** (AC: #5)
  - [ ] Run `pnpm e2e:dms-material:chromium` and `pnpm e2e:dms-material:firefox` targeting the new spec file. Fix any failures before proceeding.

- [ ] **Task 7 — Quality gate** (AC: #6)
  - [ ] Confirm the new spec is not annotated `.skip` or `.only`.
  - [ ] Run `pnpm all` and confirm all tests pass.
