# Story 111.2: Refactor Base Table to Two-Region Layout With Shared Fixed Columns

Status: Done

**Story Key:** `111-2-refactor-base-table-two-region`
**Epic:** 111 — Eliminate Janky Scroll by Decoupling Sticky Header from Virtualized Body (Round 10)
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-23.md](../planning-artifacts/epics-2026-05-23.md) (Story 111.2)
**Type:** Implementation (cross-cutting refactor)
**Depends on:** Story 111.1
**Enables:** Story 111.3, Story 111.4
**Requirements covered:** R7, R8, R9, R11

## Story

As a developer,
I want the base table component refactored to render the header and body as two separate regions sharing one fixed-width column model, with synchronized horizontal scrolling when needed,
So that sticky-header-based scroll jank is structurally eliminated everywhere the base table is used.

## Epic Context

Story 111.1 produced the design (two regions, shared fixed-width column model, single outer horizontal scroller preferred). This story executes it on the base table component and any per-consumer adaptations the design surfaces. Story 111.3 will then sweep every consuming screen; Story 111.4 will lock in regression coverage.

## Acceptance Criteria

1. **AC1 — Two distinct DOM regions; header is not sticky.** (R7)
   **Given** the design from Story 111.1,
   **When** the developer refactors the base table component,
   **Then** the header region and the virtualized body region are rendered as two
   distinct DOM regions, and the header does not use `position: sticky`. (Any
   `position: sticky` rules previously applied to header elements are removed from
   `base-table.component.scss`.)

2. **AC2 — Header and body share a single fixed column-width model.** (R8)
   **Given** the column model,
   **When** the developer applies it,
   **Then** header cells and body cells share a single source of fixed column
   widths and remain perfectly aligned in all states (loading, populated, empty,
   scrolled vertically, scrolled horizontally).

3. **AC3 — Synchronized horizontal scroll.** (R9)
   **Given** the body content is wider than the viewport,
   **When** Dave (or the test) scrolls horizontally,
   **Then** header and body scroll horizontally in lock-step — there is a single
   observable horizontal scroll position and no measurable lag between the two
   regions.

4. **AC4 — Public API changes documented.**
   **Given** the base table's public API,
   **When** the refactor is complete,
   **Then** any API change is documented in the component's docstring / Storybook
   story (if present), and Story 111.3 will exercise every consumer to confirm
   functional parity.

5. **AC5 — Smoke verification via Playwright MCP on at least one consumer.** (R11)
   **Given** the refactor,
   **When** vertical scrolling is exercised at all speeds in both browsers via the
   Playwright MCP server on at least one consumer screen,
   **Then** there is no header drift, flicker, header overlap, or
   header-scrolls-with-content artifact. (Full screen sweep is Story 111.3.)

6. **AC6 — Quality gate.**
   **Given** `pnpm all` runs,
   **Then** all tests pass.

## Tasks / Subtasks

- [x] **Task 1 — Re-read Story 111.1 design (gate)** (AC: #1, #2, #3)
  - [x] Open [_bmad-output/implementation-artifacts/111-1-design-base-table-two-region-layout.md](./111-1-design-base-table-two-region-layout.md)
        and quote the chosen DOM structure, column-model change, and
        horizontal-scroll strategy at the top of this story's Dev Agent Record.

- [x] **Task 2 — Refactor base table template** (AC: #1, #2)
  - [x] Rewrite
        [apps/dms-material/src/app/shared/components/base-table/base-table.component.html](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.html)
        (or template inline file) so:
    - An outer container (`overflow-x: auto`) wraps both regions.
    - The header region is a sibling of (not inside) the
      `cdk-virtual-scroll-viewport`.
    - Both regions iterate the same column array and use the per-column width
      (e.g. `[style.width.px]="col.width"`).
  - [x] Remove `mat-table`/`mat-header-row`/sticky-header markup if those were
        the previous header source. Use plain `<div>` rows + cells with ARIA
        roles (`role="table" | "row" | "columnheader" | "cell"`).

- [x] **Task 3 — Refactor base table styles** (AC: #1, #3)
  - [x] Edit
        [apps/dms-material/src/app/shared/components/base-table/base-table.component.scss](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.scss):
    - Remove every `position: sticky` rule that targeted header elements
      (lines ~41/58/70/172 area — verify in Story 111.1).
    - Set outer container `overflow-x: auto`.
    - Set `cdk-virtual-scroll-viewport` `overflow-x: hidden; overflow-y: auto`.
    - Apply per-cell `width: <px>` via inline style or CSS variables; no
      `flex-grow` that would let columns rubber-band differently between
      header and body.
    - Keep the no-`contain:paint` / no `contain:strict` constraints from
      Epic 101 (do not re-introduce them).

- [x] **Task 4 — Refactor base table TS** (AC: #2, #4)
  - [x] Update
        [apps/dms-material/src/app/shared/components/base-table/base-table.component.ts](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.ts):
    - Make `ColumnDef.width` required (or add a clear default in the component
      if any consumer relies on auto width — see Story 111.1 migration notes).
    - Keep `contextId` + `scrollToIndex(0)` mechanism from Epic 105 (it is
      orthogonal to the sticky-header removal and still useful for clean
      context-change scroll reset).
    - Update the `SCROLLING REGRESSION HISTORY` comment block to add an
      "Epic 111 (Round 10)" entry that explains the two-region rewrite and
      the rationale (cite this story's key in the comment).
    - Use signal-first idioms, `inject()`, OnPush. No new constructor injection.

- [x] **Task 5 — Update column definitions in consumers** (AC: #2, #4)
  - [x] For each consumer in the Story 111.1 inventory (Universe, Open
        Positions, Sold Positions, Dividend Deposits, Screener), ensure each
        column definition specifies a `width`. Use sensible defaults based on
        current rendered widths.
  - [x] Citation example: Universe columns live in
        [apps/dms-material/src/app/global/global-universe/global-universe.component.columns.ts](../../apps/dms-material/src/app/global/global-universe/global-universe.component.columns.ts)
        — extend each entry with `width: <px>`.

- [x] **Task 6 — Storybook stories** (AC: #4)
  - [x] Update
        [apps/dms-material/src/app/shared/components/base-table/base-table.stories.ts](../../apps/dms-material/src/app/shared/components/base-table/base-table.stories.ts)
        to reflect the new template/API.

- [x] **Task 7 — Smoke verification with Playwright MCP** (AC: #5)
  - [x] Drive the Universe screen via the Playwright MCP server in both
        Chromium and Firefox. Slow- and fast-scroll vertically. Confirm no
        header drift, flicker, or overlap. Capture before/after snapshots in
        Dev Notes.
  - [x] Also verify that if the table's combined column width exceeds the
        viewport, horizontal scrolling moves header and body in lock-step.

- [x] **Task 8 — Quality gate** (AC: #6)
  - [x] Run `pnpm all`. Record result. Update base-table unit spec if a
        test was asserting against the old DOM structure — adjust the
        assertion to match the new structure (NFR5: do not weaken — adjust
        precisely).

## Dev Notes

### Architecture & Code Pointers

- **Base table TS / template / SCSS:**
  [apps/dms-material/src/app/shared/components/base-table/](../../apps/dms-material/src/app/shared/components/base-table/).
- **Universe column defs:**
  [apps/dms-material/src/app/global/global-universe/global-universe.component.columns.ts](../../apps/dms-material/src/app/global/global-universe/global-universe.component.columns.ts).
- **CDK virtual scroll** must continue to be the body's scroll container for
  vertical scrolling. Do not nest the CDK viewport inside another
  vertical-scrolling element.

### Constraints (carried forward from prior epics)

- **No `position: sticky`** on the header (R7). Removing is the entire point.
- **No `contain: paint`** or `contain: strict` on the virtual viewport
  (Epic 101 root cause). Keep removed.
- **Preserve placeholder symbol `'\u2026'`** in service layers (Epic 87
  finding). Out of scope for changes here — do not touch.
- **Preserve `contextId` + `scrollToIndex(0)`** (Epic 105 mechanism). This is
  unrelated to sticky-header removal and still useful.
- **CDK requires stable array length** — do not filter `isLoading=true` rows
  (Epic 60/64). Do not change.

### Testing Standards

- Existing unit spec
  [apps/dms-material/src/app/shared/components/base-table/base-table.component.spec.ts](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.spec.ts)
  may need DOM-selector updates (the old `mat-header-row` may be replaced).
  Update specs to match the new DOM **without weakening assertions** (NFR5).
- New tests for two-region invariants are Story 111.4's responsibility.
- `pnpm all` must pass.

### Project Structure Notes

- Base table folder: [apps/dms-material/src/app/shared/components/base-table/](../../apps/dms-material/src/app/shared/components/base-table/).
- Consumer screens enumerated in Story 111.1.
- Project conventions per [_bmad-output/project-context.md](../project-context.md).

### References

- Epic source: [_bmad-output/planning-artifacts/epics-2026-05-23.md](../planning-artifacts/epics-2026-05-23.md) — Story 111.2 section
- Story 111.1 design: [111-1-design-base-table-two-region-layout.md](./111-1-design-base-table-two-region-layout.md)
- Base table TS: [apps/dms-material/src/app/shared/components/base-table/base-table.component.ts](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.ts)
- Base table SCSS: [apps/dms-material/src/app/shared/components/base-table/base-table.component.scss](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.scss)
- Base table spec: [apps/dms-material/src/app/shared/components/base-table/base-table.component.spec.ts](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.spec.ts)

## Definition of Done

- [x] Base table renders header and body as two distinct regions with no `position: sticky` on the header (R7)
- [x] Header and body share a single fixed-column-width model and are perfectly aligned (R8)
- [x] Horizontal scroll is synchronized between header and body (R9)
- [x] Any base-table API change documented
- [x] Smoke verification on at least one consumer screen via Playwright MCP shows no scrolling artifacts
- [x] `pnpm all` passes

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent._

### Debug Log References

_To be filled by dev agent._

### Completion Notes List

_To be filled by dev agent._

### File List

_To be filled by dev agent._
