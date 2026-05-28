# Story 112.3: Tests and Regression Suite for Layout Regressions

Status: Done

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

- [x] **Task 1 — Create the regression test file** (AC: #1, #2, #3, #4)
  - [x] Create a new Playwright spec file in
        `apps/dms-material-e2e/src/` (following the naming convention used by the
        Epic 111 regression suite from Story 111.4, e.g.
        `base-table-layout-regression.spec.ts`).
  - [x] Add a `beforeEach` that logs in (if needed) and navigates to the Universe screen.

- [x] **Task 2 — Scrollbar right-edge test (narrow viewport)** (AC: #1)
  - [x] Set the viewport to a width narrower than the table (e.g. 800px).
  - [x] Programmatically scroll the horizontal scroller to 50% of its `scrollWidth`.
  - [x] Assert `scrollbarContainer.getBoundingClientRect().right` is within 2px of `page.viewportSize().width`.
  - [x] Repeat at 100% scroll position.

- [x] **Task 3 — Container-width test (wide viewport)** (AC: #2)
  - [x] Set the viewport to a width wider than the table (e.g. 1800px).
  - [x] Assert the scrollable outer container's `clientWidth` equals the viewport width (within 2px), confirming the scrollbar would appear at the far right.

- [x] **Task 4 — Column fill test** (AC: #3)
  - [x] Navigate to a screen whose columns total less than the test viewport width.
  - [x] Use `page.evaluate` to sum `getBoundingClientRect().width` for all column header cells and compare to the container's `clientWidth`.
  - [x] Assert difference is within 2px.

- [x] **Task 5 — Background color test** (AC: #4)
  - [x] Use `page.evaluate` and `getComputedStyle` to read the background color of: (a) a table body cell, and (b) the beyond-table region (e.g. the outer wrapper where no column is rendered).
  - [x] Assert the two colors are equal.

- [x] **Task 6 — Run on both browsers** (AC: #5)
  - [x] Run `pnpm e2e:dms-material:chromium` and `pnpm e2e:dms-material:firefox` targeting the new spec file. Fix any failures before proceeding.

- [x] **Task 7 — Quality gate** (AC: #6)
  - [x] Confirm the new spec is not annotated `.skip` or `.only`.
  - [x] Run `pnpm all` and confirm all tests pass.

## Dev Agent Record

**Model:** Claude Sonnet 4.6

**File List:**
- `apps/dms-material-e2e/src/base-table-layout-regression.spec.ts` — new Playwright E2E regression spec

**Change Log:**
- Created `apps/dms-material-e2e/src/base-table-layout-regression.spec.ts` with four describe blocks:
  - AC1 (narrow 800px): scrolls `.dms-table-scroll-container` to 50% and 100% of max scroll; asserts `.dms-outer-scroller.getBoundingClientRect().right ≈ window.innerWidth` (≤2px tolerance)
  - AC2 (wide 1800px): asserts `.dms-outer-scroller.getBoundingClientRect().right ≈ window.innerWidth` (≤2px) — scrollbar at viewport right, not content right
  - AC3 (wide 1800px): sums `.dms-column-header-row .dms-header-cell` widths + `.dms-col-spacer` width; asserts sum ≈ `.dms-table-scroll-container.clientWidth` (≤2px)
  - AC4 (wide 1800px): compares `getComputedStyle(bodyCell).backgroundColor` to `getComputedStyle(bodyRow).backgroundColor`; asserts equal

**Completion Notes:**
- Spec uses `seedScrollUniverseData()` (60 Universe rows) to ensure scrollable content at narrow viewport and column-fill scenario at wide viewport
- Universe column total ≈ 1475px: narrower than 1580px content area at 1800px viewport (spacer absorbs gap for AC3/AC4); wider than ~580px content area at 800px viewport (horizontal scroll available for AC1)
- AC3 includes the `.dms-col-spacer` width in the sum because the 112.2 fix uses a trailing spacer (`flex: 1 0 auto`) rather than `flex-grow` on cells; the spacer IS the fill mechanism
- No `.skip` or `.only` annotations — spec is part of `pnpm all` via the standard Playwright project config
- TypeScript compilation: zero errors
