# Story 112.2: Fix All Three Layout Regressions in the Base Table

Status: Approved

**Story Key:** `112-2-fix-base-table-layout-regressions`
**Epic:** 112 — Fix Post-Refactor Layout Regressions in Two-Region Base Table
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-27.md](../planning-artifacts/epics-2026-05-27.md) (Story 112.2)
**Type:** Implementation
**Depends on:** Story 112.1
**Enables:** Story 112.3
**Requirements covered:** R1, R2, R3, R4

## Story

As Dave,
I want the base table to keep the vertical scrollbar pinned to the right edge of the screen on any viewport width, to have columns that fill the available space when they are narrower than the container, and to show a consistent background color across the full table area,
So that the table looks and behaves as it did before the Epic 111 refactor — plus without the scrolling jank that Epic 111 fixed.

## Epic Context

Story 112.1 produced the root-cause analysis and fix design for all three regressions. This story executes those fixes in the base table component's HTML and SCSS, verifies the result via the Playwright MCP server on every consuming screen, and confirms the Epic 111 regression suite still passes.

## Acceptance Criteria

1. **AC1 — Vertical scrollbar pinned to right edge on narrow viewports.** (R1)
   **Given** a viewport narrower than the table,
   **When** Dave scrolls horizontally,
   **Then** the vertical scrollbar remains fixed at the right edge of the viewport — it does not scroll with the table content.

2. **AC2 — Vertical scrollbar at far right on wide viewports.** (R2)
   **Given** a viewport wider than the table,
   **When** the Universe screen (or any base-table-consuming screen) is open,
   **Then** the vertical scrollbar appears at the far right of the full available area, not immediately to the right of the last column.

3. **AC3 — Columns expand to fill available width.** (R3)
   **Given** a screen whose columns total less than the available container width,
   **When** the screen is rendered,
   **Then** the columns expand to fill the full available width, distributing any spare space.

4. **AC4 — Beyond-table area background matches cell background.** (R4)
   **Given** a screen whose columns total less than the available container width,
   **When** the area to the right of the last column is inspected,
   **Then** its background color matches the table cell background color — not the outer page or dark-mode background.

5. **AC5 — Epic 111 regression suite still passes.** (NFR5)
   **Given** the Epic 111 regression suite (Story 111.4),
   **When** it is re-run after these fixes,
   **Then** all assertions still pass — no sticky headers reintroduced, column alignment intact, horizontal scroll synchronized.

6. **AC6 — All consuming screens verified via Playwright MCP.** (NFR6)
   **Given** all consuming screens (Universe, Open Positions, Sold Positions, Dividend Deposits, Screener, and any others from the Story 111.1 inventory),
   **When** they are exercised via the Playwright MCP server after the fix,
   **Then** they continue to display correctly with no functional regression.

7. **AC7 — Quality gate.**
   **Given** `pnpm all` runs,
   **Then** all tests pass.

## Tasks / Subtasks

- [ ] **Task 1 — Re-read Story 112.1 design (gate)** (AC: #1, #2, #3, #4)
  - [ ] Open [_bmad-output/implementation-artifacts/112-1-investigate-base-table-layout-regressions.md](./112-1-investigate-base-table-layout-regressions.md) and quote the fix design for each of the three regressions at the top of this story's Dev Agent Record before touching any code.

- [ ] **Task 2 — Fix scrollbar positioning** (AC: #1, #2)
  - [ ] Modify
        [apps/dms-material/src/app/shared/components/base-table/base-table.component.html](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.html)
        per the Story 112.1 fix design: ensure `overflow-y: auto` (vertical scroll) is on a wrapper that spans the full available width, and `overflow-x: auto` (horizontal scroll) is on an inner container that holds the table content. The vertical scrollbar must be anchored to the outer full-width wrapper.
  - [ ] Modify
        [apps/dms-material/src/app/shared/components/base-table/base-table.component.scss](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.scss)
        to apply the width/overflow rules that achieve the above layout.
  - [ ] Verify via Playwright MCP at a narrow viewport (e.g. 800px) that the scrollbar stays fixed at the right edge during horizontal scrolling.
  - [ ] Verify via Playwright MCP at a wide viewport (e.g. 1800px) that the scrollbar appears at the far right of the available area.

- [ ] **Task 3 — Fix column expand-to-fill** (AC: #3)
  - [ ] Apply the CSS strategy from the Story 112.1 design (e.g. `width: 100%` + `table-layout: fixed` on the table element, or flexbox distribution) so columns fill available space when their total width is less than the container.
  - [ ] Confirm column widths from the column model are honoured as `min-width` so explicit column sizing is preserved when the table is wider than the container.
  - [ ] Verify via Playwright MCP that columns fill the available width on a wide viewport.

- [ ] **Task 4 — Fix beyond-table background color** (AC: #4)
  - [ ] Apply the CSS variable identified in Story 112.1 to the element responsible for the mismatched background color in the beyond-table region.
  - [ ] Verify via Playwright MCP in both light and dark modes that the beyond-table area is visually indistinguishable from the cell background.

- [ ] **Task 5 — Run Epic 111 regression suite** (AC: #5)
  - [ ] Run `pnpm e2e:dms-material:chromium` and `pnpm e2e:dms-material:firefox` targeting the Epic 111 regression test file(s) from Story 111.4.
  - [ ] Confirm all assertions pass. If any fail, fix before proceeding.

- [ ] **Task 6 — Verify all consuming screens via Playwright MCP** (AC: #6)
  - [ ] Using the consumer list from the Story 111.1 Dev Notes, open each screen in Playwright MCP and verify: sort works, scroll is smooth, column alignment is correct, background color is consistent.
  - [ ] Record per-screen pass/fail in Dev Notes.

- [ ] **Task 7 — Quality gate** (AC: #7)
  - [ ] Run `pnpm all` and confirm all tests pass.
