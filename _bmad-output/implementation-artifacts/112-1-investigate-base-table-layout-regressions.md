# Story 112.1: Investigate the Three Layout Regressions From the Epic 111 Two-Region Refactor

Status: Approved

**Story Key:** `112-1-investigate-base-table-layout-regressions`
**Epic:** 112 — Fix Post-Refactor Layout Regressions in Two-Region Base Table
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-27.md](../planning-artifacts/epics-2026-05-27.md) (Story 112.1)
**Type:** Investigation / Design
**Depends on:** none
**Enables:** Story 112.2, Story 112.3

## Story

As a developer,
I want to reproduce each of the three layout regressions introduced by the Epic 111 two-region refactor, trace their root causes in the base table component's HTML and SCSS, and produce a concrete fix design for each,
So that Story 112.2 applies the right fixes in the right places.

## Epic Context

**Epic 112 Goal:** The Epic 111 two-region refactor eliminated sticky-header scroll jank but introduced three observable layout regressions. On narrow viewports the vertical scrollbar moves with the table content instead of staying fixed at the screen's right edge. On wide viewports the scrollbar appears next to the table content rather than at the far right of the available space. Before Epic 111 the columns spread to fill the available width; now they are content-sized, and the uncovered area to the right uses a visually jarring background color.

This story (112.1) is the **investigation/design** story. It reproduces all three regressions via the Playwright MCP server, traces their root causes in the post-Epic-111 base table SCSS and HTML, and documents a concrete fix design for each. **No production code is modified.**

## Acceptance Criteria

1. **AC1 — All three regressions reproduced via Playwright MCP.**
   **Given** the three reported regressions,
   **When** the developer opens each scenario via the Playwright MCP server (narrow viewport + horizontal scroll; wide viewport; columns narrower than container),
   **Then** Dev Notes confirm each regression is reproducible and record a screenshot or DOM observation proving it.

2. **AC2 — Root cause of scrollbar positioning traced.**
   **Given** the base table component's HTML template and SCSS after the Epic 111 refactor,
   **When** the developer traces the overflow and sizing rules applied to the outer container, the horizontal scroller, and the body region,
   **Then** Dev Notes identify (a) which element bears `overflow-y: auto` and why that causes the scrollbar to move with content on narrow viewports (R1 / R2), citing the specific file and line number.

3. **AC3 — Root cause of column-fill regression traced.**
   **Given** the column model and layout changes from Epic 111,
   **When** the developer identifies which rule prevents columns from expanding to fill the container,
   **Then** Dev Notes cite the exact CSS property and element responsible (R3).

4. **AC4 — Beyond-table background mismatch traced.**
   **Given** the beyond-table background color mismatch,
   **When** the developer inspects the computed styles of the empty area to the right of the table content,
   **Then** Dev Notes identify which element's background produces the mismatch and which CSS variable or color value should instead be applied to match the cell background (R4).

5. **AC5 — Concrete fix design documented.**
   **Given** the root causes are identified,
   **When** the developer drafts the fix design,
   **Then** Dev Notes specify: (a) the exact element and property change that pins the scrollbar to the full-width outer container, (b) the exact CSS strategy for columns to fill available space, and (c) the CSS variable or color assignment for the beyond-table region.

6. **AC6 — No production code changes; quality gate passes.**
   **Given** the investigation is complete,
   **When** `pnpm all` runs,
   **Then** all tests pass.

## Tasks / Subtasks

- [ ] **Task 1 — Reproduce all three regressions via Playwright MCP** (AC: #1)
  - [ ] Open the Universe screen at a viewport narrower than the table (e.g. 800px wide). Apply a horizontal scroll. Observe and record whether the vertical scrollbar drifts.
  - [ ] Open the Universe screen at a viewport wider than the table (e.g. 1800px wide). Observe and record the vertical scrollbar position relative to the right edge of the available area.
  - [ ] Open any screen whose columns total less than the viewport width. Observe whether columns fill available space and record the background color of any uncovered area to the right of the last column.
  - [ ] Record Playwright MCP screenshots or DOM snapshots for each scenario in Dev Notes.

- [ ] **Task 2 — Trace the scrollbar positioning root cause** (AC: #2)
  - [ ] Read
        [apps/dms-material/src/app/shared/components/base-table/base-table.component.html](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.html)
        — note the outer wrapper, the horizontal scroll container, and the `cdk-virtual-scroll-viewport` element. Identify which element bears `overflow-y: auto` (or `scroll`).
  - [ ] Read
        [apps/dms-material/src/app/shared/components/base-table/base-table.component.scss](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.scss)
        — locate all `overflow`, `width`, and `max-width` rules. Note which rule constrains the container width to the table content width rather than to the available viewport width.
  - [ ] Record the element + CSS rule responsible for scrollbar drift in Dev Notes with file + line citation.

- [ ] **Task 3 — Trace the column-fill regression root cause** (AC: #3)
  - [ ] Identify whether column widths are set via `[style.width.px]`, `[style.minWidth.px]`, or a CSS class on header and body cells. Note whether any flex or `table-layout: fixed` stretch is applied.
  - [ ] Confirm the absence of any rule that would distribute spare space to columns (e.g. `flex: 1`, `table-layout: fixed` with `width: 100%`, or `min-width` + auto-width fill).
  - [ ] Record the missing rule(s) in Dev Notes.

- [ ] **Task 4 — Trace the beyond-table background mismatch** (AC: #4)
  - [ ] Inspect the computed `background-color` of the element to the right of the last column via browser DevTools (via Playwright MCP `evaluate`). Record the value.
  - [ ] Inspect the computed `background-color` of a table cell. Record the value.
  - [ ] Identify the CSS variable (e.g. `--mat-table-background-color`, `--mat-sys-surface`, or similar Angular Material token) used by table cells and record it.

- [ ] **Task 5 — Draft fix design** (AC: #5)
  - [ ] Describe the outer-wrapper change needed to make the scrollbar pin to the viewport right edge (e.g. adding a full-width wrapper with `overflow-y: auto` outside the horizontal-scroll container).
  - [ ] Describe the column-fill CSS strategy (e.g. keep `min-width` per column for explicit minimums but set `width: 100%` + `table-layout: fixed` on the table, or switch body/header cells to `flex: 1` with a `min-width`).
  - [ ] Specify the CSS variable or rule to apply to the beyond-table region.

- [ ] **Task 6 — Quality gate** (AC: #6)
  - [ ] Run `pnpm all` and confirm all tests pass. No production code was changed.
