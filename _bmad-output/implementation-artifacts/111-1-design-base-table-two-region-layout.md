# Story 111.1: Investigate Base Table, Inventory Consumers, Design Two-Region Layout

Status: Approved

**Story Key:** `111-1-design-base-table-two-region-layout`
**Epic:** 111 — Eliminate Janky Scroll by Decoupling Sticky Header from Virtualized Body (Round 10)
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-23.md](../planning-artifacts/epics-2026-05-23.md) (Story 111.1)
**Type:** Investigation / Design
**Depends on:** none
**Enables:** Story 111.2, Story 111.3, Story 111.4

## Story

As a developer,
I want to locate the base table component, inventory every screen that consumes it, review the prior nine scrolling epics, and produce a concrete design for the two-region (separate header + virtualized body, shared fixed column widths, synchronized horizontal scroll) layout,
So that Story 111.2 implements the refactor against a clear, agreed design and Story 111.3 has a complete verification list.

## Epic Context

**Epic 111 Goal:** Nine prior epics (29, 31, 44, 60, 64, 87, 101, 105, 106) have attempted to fix sticky-header scroll jank with progressively more intricate CSS, layout, and state-management tweaks. Dave's investigation confirmed that **removing sticky headers eliminates the artifacts entirely**, and the wider community has converged on the same fix. This epic re-architects the base table to use a two-region layout: a separate header DOM region (no `position: sticky`) above a virtualized body, both sharing one fixed-width column model, with synchronized horizontal scroll when the body is wider than the viewport.

This story (111.1) is the **investigation/design** story. It locates the component, inventories every consumer, reviews prior epics, and produces the concrete design Story 111.2 will implement. **No production code is modified.**

## Acceptance Criteria

1. **AC1 — Base table located and current implementation documented.**
   **Given** the current codebase,
   **When** the developer locates the base table component,
   **Then** Dev Notes record (a) the component's file path and public API (inputs,
   outputs, content projection, column model), (b) the current header implementation
   including any `position: sticky` usage, (c) the current body implementation
   including `cdk-virtual-scroll-viewport` configuration.

2. **AC2 — Exhaustive consumer inventory.**
   **Given** the base table is reused across the app,
   **When** the developer greps every consumer,
   **Then** Dev Notes contain an exhaustive list of every screen / component that
   uses the base table — at minimum Universe, Open Positions, Sold Positions,
   Dividend Deposits, Screener — with file paths and a one-line note per consumer
   on any non-default usage (custom column widths, custom row template, etc.).

3. **AC3 — Prior-epic review summarised.**
   **Given** the prior scrolling epics (29, 31, 44, 60, 64, 87, 101, 105, 106),
   **When** the developer reviews each epic's actual fix,
   **Then** Dev Notes summarise what each round changed, why each round did not
   durably fix the artifacts, and confirm Dave's finding that removing sticky
   headers eliminates the artifacts.

4. **AC4 — Two-region design documented with concrete specifics.**
   **Given** the design constraints in this epic's Goal,
   **When** the developer drafts the two-region design,
   **Then** Dev Notes specify:
   - Header DOM structure and the rule that it must not use `position: sticky` (R7)
   - Body DOM structure preserving `cdk-virtual-scroll-viewport` vertical scrolling
   - Column model: column widths defined once, applied to both header cells and
     body cells (cite the existing column model location) (R8)
   - Horizontal-scroll strategy: single shared `overflow-x: auto` container vs.
     two scrollers with synchronized `scrollLeft`, with rationale for the chosen
     approach (R9)
   - Migration risk: any change to the base table's public API and how each
     consumer will be adapted

5. **AC5 — No production code changes; quality gate passes.**
   **Given** the investigation is complete,
   **When** `pnpm all` runs,
   **Then** all tests pass.

## Tasks / Subtasks

- [ ] **Task 1 — Locate and document the base table** (AC: #1)
  - [ ] Read
        [apps/dms-material/src/app/shared/components/base-table/base-table.component.ts](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.ts)
        — note all `input()`, `output()`, `ContentChild`, `viewChild` declarations.
  - [ ] Read
        [apps/dms-material/src/app/shared/components/base-table/base-table.component.scss](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.scss)
        — note every `position: sticky`, every `overflow` rule, every `contain`
        property, every `transform`. Record line numbers.
  - [ ] Note the prior-epics commentary block in
        `base-table.component.ts` lines ~34–98 — the SCROLLING REGRESSION HISTORY
        comment is the authoritative summary of why this refactor exists.
  - [ ] Identify the column model file (likely
        `apps/dms-material/src/app/shared/components/base-table/column-def.interface.ts`).
        Note the fields (`field`, `header`, `width?`, etc.).
  - [ ] Document the public API table in Dev Notes (inputs, outputs, slots).

- [ ] **Task 2 — Inventory every consumer** (AC: #2)
  - [ ] `grep -rln 'app-base-table\|BaseTableComponent' apps/dms-material/src` to
        produce the consumer list.
  - [ ] For each consumer record: file path, screen name, any custom column
        widths, any custom row template, any custom header template, and any
        interaction with the table API (e.g. `scrollToIndex`, `contextId`).
  - [ ] Expected baseline list (verify each):
    - Universe — [apps/dms-material/src/app/global/global-universe/global-universe.component.html](../../apps/dms-material/src/app/global/global-universe/global-universe.component.html)
    - Screener — `apps/dms-material/src/app/global/global-screener/`
    - Open Positions — account-panel-related component
    - Sold Positions — account-panel-related component
    - Dividend Deposits — account-panel-related component

- [ ] **Task 3 — Summarise prior scrolling epics** (AC: #3)
  - [ ] For each of Epics 29, 31, 44, 60, 64, 87, 101, 105, 106 record a single
        line: what was changed, why it did not durably fix the artifacts. Use
        the `SCROLLING REGRESSION HISTORY` comment in `base-table.component.ts`
        as the primary source.
  - [ ] Conclude with Dave's finding: removing sticky headers entirely
        eliminates the artifact class; community consensus agrees.

- [ ] **Task 4 — Document the two-region design** (AC: #4)
  - [ ] **Header DOM:** a single `<div class="header-row" role="row">` (or
        equivalent) containing `<div class="header-cell" role="columnheader">`
        children with explicit fixed `width` per column from the column model.
        No `position: sticky`. Sits in a parent that scrolls horizontally with
        the body.
  - [ ] **Body DOM:** the existing `<cdk-virtual-scroll-viewport>` for vertical
        scrolling only. Each rendered row uses the same per-column fixed
        widths.
  - [ ] **Shared column widths:** extend the existing column model (e.g.
        `ColumnDef.width: number`) so a single source of truth drives both
        regions. CSS uses `width:Npx` (or `flex: 0 0 Npx`) on both header and
        body cells.
  - [ ] **Horizontal scroll:** **Preferred (A)** — wrap both header region and
        body region in a single outer container with `overflow-x: auto`. The
        outer container becomes the horizontal scroller; header and body
        naturally scroll together because they are inside the same scrollport.
        The body's `cdk-virtual-scroll-viewport` remains `overflow-x: hidden;
        overflow-y: auto` so it only scrolls vertically.
        **Fallback (B)** — two separate scrollers with `scrollLeft` synced via
        event listener (use only if Approach A breaks virtual-scroll vertical
        behaviour).
  - [ ] **Public API impact:** document any required signature changes
        (e.g. `width` becoming required on `ColumnDef`, removal of any
        sticky-header config inputs). For each consumer, note one-line
        migration.

- [ ] **Task 5 — Quality gate** (AC: #5)
  - [ ] Confirm `git status` clean of production source changes. Run `pnpm all`.

## Dev Notes

### Architecture & Code Pointers

- **Base table TS:** [apps/dms-material/src/app/shared/components/base-table/base-table.component.ts](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.ts)
  — includes the SCROLLING REGRESSION HISTORY block (lines ~34–98) that
  authoritatively explains Epics 29/31/44/60/64/87/101/105/106 root causes.
- **Base table SCSS:** [apps/dms-material/src/app/shared/components/base-table/base-table.component.scss](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.scss)
  — current `position: sticky` rules.
- **Column model:** `apps/dms-material/src/app/shared/components/base-table/column-def.interface.ts`
  (verify exact path during Task 1).
- **Storybook story (if present):** `apps/dms-material/src/app/shared/components/base-table/base-table.stories.ts`
  (cite repo memory note [/memories/repo/storybook-notes.md](../../../memories/repo/storybook-notes.md)
  for conventions).
- **Existing spec:** `apps/dms-material/src/app/shared/components/base-table/base-table.component.spec.ts`.
- **Prior regression suites to keep passing:**
  - Epic 101 suite: `apps/dms-material-e2e/src/scrolling-*.spec.ts` (find by
    grep)
  - Epic 105/106 specs: `scrolling-regression-105.spec.ts`,
    `scrolling-regression-106-investigation.spec.ts`

### Design Sketch (two-region, single outer horizontal scroller)

```
┌── .base-table-root ───────────────────────────────────────────── (overflow-x: auto)
│  ┌── .base-table-header  ───────────────────────────────────────
│  │  ┌── cell w:120 ── ┐ ┌── cell w:80 ── ┐ ┌── cell w:200 ── ┐  …
│  └────────────────────────────────────────────────────────────
│  ┌── cdk-virtual-scroll-viewport (overflow-y: auto, overflow-x: hidden)
│  │  ┌── row ──────────────────────────────────────────────
│  │  │  ┌── cell w:120 ┐ ┌── cell w:80 ┐ ┌── cell w:200 ┐  …
│  │  └────────────────────────────────────────────────────
│  │  …
│  └──────────────────────────────────────────────────────────────
└─────────────────────────────────────────────────────────────────
```

- The outer container provides horizontal scroll for both header and body.
- The CDK virtual viewport handles vertical scroll only and never receives
  `position: sticky` on any descendant.
- Column widths come from `ColumnDef.width` and are applied identically to
  header and body cells via CSS variables or direct `[style.width.px]`
  binding.

### Strong-Candidate Hypothesis

Approach A (single outer horizontal scroller) will work because the CDK
virtual scroller's vertical-only configuration is unaffected by an
ancestor's horizontal `overflow-x: auto`. CDK uses transform-based
positioning along the Y axis; an ancestor's X-axis scroll does not interact
with that math. Verify in Story 111.2 with Playwright MCP measurement at
the first consumer screen.

### Testing Standards

- **No new tests in this story.** Stories 111.3 (per-screen sweep) and
  111.4 (regression suite) own verification & regression coverage.
- `pnpm all` must pass as a no-op gate.

### Project Structure Notes

- Repo memory: [/memories/repo/storybook-notes.md](../../../memories/repo/storybook-notes.md)
  on Storybook patterns; [/memories/repo/e2e-timing.md](../../../memories/repo/e2e-timing.md)
  on cross-browser timing.
- Project conventions per [_bmad-output/project-context.md](../project-context.md).

### Related Prior Work

- Epic 29 — rowHeight mismatch causing CDK height miscalculation
- Epic 31 — `contain: strict` on sticky header → jump on viewport recalculation
- Epic 44 — CSS transitions + extra CD cycles → recalculation during animation
- Epic 60 — `isLoading=true` row filtering shrank arrays
- Epic 64 — Epic 60 edge case (`excludeLoadingRows` re-introduced bug)
- Epic 87 — placeholder `symbol: ''` triggered blank-cell regression on account-panel screens
- Epic 101 — `contain: paint` on `.virtual-scroll-viewport` triggered transform/sticky resolver bug
- Epic 105 — spec measured `tr.mat-mdc-header-row` (static) instead of `th.mat-mdc-header-cell` (sticky); added `contextId` + `scrollToIndex(0)`
- Epic 106 — round-9 sweep across all 5 CDK virtual-scroll screens × Chromium × Firefox; 0 FAIL with Epic 105 fix; no new production change

### References

- Epic source: [_bmad-output/planning-artifacts/epics-2026-05-23.md](../planning-artifacts/epics-2026-05-23.md) — Story 111.1 section
- Base table component: [apps/dms-material/src/app/shared/components/base-table/base-table.component.ts](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.ts)
- Base table styles: [apps/dms-material/src/app/shared/components/base-table/base-table.component.scss](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.scss)
- Project context: [_bmad-output/project-context.md](../project-context.md)

## Definition of Done

- [ ] Base table component located and its current implementation documented
- [ ] Complete consumer inventory in Dev Notes
- [ ] Prior-epic review summarised in Dev Notes
- [ ] Two-region design documented (header DOM, body DOM, shared column widths, horizontal-scroll strategy)
- [ ] Any public-API changes called out, with per-consumer migration notes
- [ ] No production code changed; `pnpm all` passes

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent._

### Debug Log References

_To be filled by dev agent._

### Completion Notes List

_To be filled by dev agent._

### File List

_To be filled by dev agent._
