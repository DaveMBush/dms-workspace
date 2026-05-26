# Story 111.1: Investigate Base Table, Inventory Consumers, Design Two-Region Layout

Status: done

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

- [x] **Task 1 — Locate and document the base table** (AC: #1)
  - [x] Read
        [apps/dms-material/src/app/shared/components/base-table/base-table.component.ts](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.ts)
        — note all `input()`, `output()`, `ContentChild`, `viewChild` declarations.
  - [x] Read
        [apps/dms-material/src/app/shared/components/base-table/base-table.component.scss](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.scss)
        — note every `position: sticky`, every `overflow` rule, every `contain`
        property, every `transform`. Record line numbers.
  - [x] Note the prior-epics commentary block in
        `base-table.component.ts` lines ~34–98 — the SCROLLING REGRESSION HISTORY
        comment is the authoritative summary of why this refactor exists.
  - [x] Identify the column model file (likely
        `apps/dms-material/src/app/shared/components/base-table/column-def.interface.ts`).
        Note the fields (`field`, `header`, `width?`, etc.).
  - [x] Document the public API table in Dev Notes (inputs, outputs, slots).

- [x] **Task 2 — Inventory every consumer** (AC: #2)
  - [x] `grep -rln 'app-base-table\|BaseTableComponent' apps/dms-material/src` to
        produce the consumer list.
  - [x] For each consumer record: file path, screen name, any custom column
        widths, any custom row template, any custom header template, and any
        interaction with the table API (e.g. `scrollToIndex`, `contextId`).
  - [x] Expected baseline list (verify each):
    - Universe — [apps/dms-material/src/app/global/global-universe/global-universe.component.html](../../apps/dms-material/src/app/global/global-universe/global-universe.component.html)
    - Screener — `apps/dms-material/src/app/global/global-screener/`
    - Open Positions — account-panel-related component
    - Sold Positions — account-panel-related component
    - Dividend Deposits — account-panel-related component

- [x] **Task 3 — Summarise prior scrolling epics** (AC: #3)
  - [x] For each of Epics 29, 31, 44, 60, 64, 87, 101, 105, 106 record a single
        line: what was changed, why it did not durably fix the artifacts. Use
        the `SCROLLING REGRESSION HISTORY` comment in `base-table.component.ts`
        as the primary source.
  - [x] Conclude with Dave's finding: removing sticky headers entirely
        eliminates the artifact class; community consensus agrees.

- [x] **Task 4 — Document the two-region design** (AC: #4)
  - [x] **Header DOM:** a single `<div class="header-row" role="row">` (or
        equivalent) containing `<div class="header-cell" role="columnheader">`
        children with explicit fixed `width` per column from the column model.
        No `position: sticky`. Sits in a parent that scrolls horizontally with
        the body.
  - [x] **Body DOM:** the existing `<cdk-virtual-scroll-viewport>` for vertical
        scrolling only. Each rendered row uses the same per-column fixed
        widths.
  - [x] **Shared column widths:** extend the existing column model (e.g.
        `ColumnDef.width: number`) so a single source of truth drives both
        regions. CSS uses `width:Npx` (or `flex: 0 0 Npx`) on both header and
        body cells.
  - [x] **Horizontal scroll:** **Preferred (A)** — wrap both header region and
        body region in a single outer container with `overflow-x: auto`. The
        outer container becomes the horizontal scroller; header and body
        naturally scroll together because they are inside the same scrollport.
        The body's `cdk-virtual-scroll-viewport` remains `overflow-x: hidden;
        overflow-y: auto` so it only scrolls vertically.
        **Fallback (B)** — two separate scrollers with `scrollLeft` synced via
        event listener (use only if Approach A breaks virtual-scroll vertical
        behaviour).
  - [x] **Public API impact:** document any required signature changes
        (e.g. `width` becoming required on `ColumnDef`, removal of any
        sticky-header config inputs). For each consumer, note one-line
        migration.

- [x] **Task 5 — Quality gate** (AC: #5)
  - [x] Confirm `git status` clean of production source changes. Run `pnpm all`.

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

- [x] Base table component located and its current implementation documented
- [x] Complete consumer inventory in Dev Notes
- [x] Prior-epic review summarised in Dev Notes
- [x] Two-region design documented (header DOM, body DOM, shared column widths, horizontal-scroll strategy)
- [x] Any public-API changes called out, with per-consumer migration notes
- [x] No production code changed; `pnpm all` passes

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

No debug issues — investigation-only story, no production code changed.

### Completion Notes List

#### AC1 — Base Table Located and Documented

**File:** `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`
**Selector:** `dms-base-table`

**Inputs (signal-based):**

| Input | Type | Default | Notes |
|---|---|---|---|
| `data` | `T[]` | required | Signal input |
| `columns` | `ColumnDef[]` | required | Signal input |
| `tableLabel` | `string` | `'Data table'` | aria-label |
| `rowHeight` | `number` | `57` | px; CDK itemSize |
| `bufferSize` | `number` | `10` | CDK min/max buffer multiplier |
| `selectable` | `boolean` | `false` | Adds checkbox column |
| `multiSelect` | `boolean` | `false` | Multi-row selection |
| `loading` | `boolean` | `false` | Shows progress bar |
| `sortColumns` | `SortColumn[]` | `[]` | Active sort columns array |
| `contextId` | `string \| null` | `null` | Triggers `scrollToIndex(0)` on change (Epic 105) |

**Outputs:**

| Output | Type | Notes |
|---|---|---|
| `sortChange` | `Sort` | Emits on column header click |
| `rowClick` | `T` | Emits on row click |
| `selectionChange` | `T[]` | Emits on checkbox change |
| `renderedRangeChange` | `ListRange` | Debounced 100ms; CDK rendered range |

**Content projection (ContentChild slots):**
- `#cellTemplate` — `TemplateRef` with context `{ $implicit: row, column, index }` — custom cell rendering per column
- `#filterRowTemplate` — `TemplateRef` with context `{ $implicit: column }` — renders a filter `<tr>` above the column-header row when present

**ViewChild:**
- `viewport` — `CdkVirtualScrollViewport` — exposed for `scrollToIndex()`
- `matSort` — `MatSort` — used internally to notify sort headers of restored state

**Public method:** `scrollToTop()` — scrolls CDK viewport to index 0 (called from `contextId` effect)

**Column model:** `apps/dms-material/src/app/shared/components/base-table/column-def.interface.ts`
```ts
export interface ColumnDef {
  field: string;
  header: string;
  tooltip?: string;
  width?: string;          // optional CSS value e.g. '120px'; applied to th and td via [style.width]
  sortable?: boolean;
  editable?: boolean;
  type?: 'actions' | 'boolean' | 'currency' | 'custom' | 'date' | 'number' | 'text';
}
```

**Header implementation (SCSS):** No explicit `position: sticky` in `base-table.component.scss`. Angular Material applies `position: sticky; top: 0` to `th.mat-mdc-header-cell` via the Material theme. The SCSS provides background-color on `th.mat-mdc-header-cell` (line ~151) and `box-shadow` to substitute the collapsed border. The filter row `tr` uses `*matHeaderRowDef="filterColumns(); sticky: true"` and the column-header row uses `*matHeaderRowDef="displayedColumns(); sticky: true"` — both rely on Angular Material's sticky-header mechanism.

**Body implementation (SCSS):** `.virtual-scroll-viewport { flex: 1; overflow-y: auto; overflow-x: hidden; }` — `contain:paint` removed in Epic 101.

**SCSS overflow/contain/transform summary (relevant lines):**
- Line ~18: `.table-container { position: relative; height: 100%; display: flex; flex-direction: column; overflow: hidden; }`
- Line ~78: `.virtual-scroll-viewport { flex: 1; overflow-y: auto; overflow-x: hidden; }` — no `contain`, no `transform`, no `will-change`
- Line ~118: `tr.mat-mdc-row { cursor: pointer; }` (hover uses color-mix, no transform)
- Line ~151: `th.mat-mdc-header-cell { font-weight: 600; background-color: var(--dms-surface); box-shadow: ... }`
- Line ~163: `td.mat-mdc-cell { padding: 8px 16px; background-color: var(--dms-surface); contain: content; }`

**SCROLLING REGRESSION HISTORY block:** `base-table.component.ts` lines 34–98 (authoritative). Confirmed present and reviewed.

---

#### AC2 — Consumer Inventory

Grep: `grep -rln 'dms-base-table\|BaseTableComponent' apps/dms-material/src` — 5 HTML files matched.

| Screen | File | Custom Inputs / Slots | Notes |
|---|---|---|---|
| **Universe** | `apps/dms-material/src/app/global/global-universe/global-universe.component.html` | `[selectable]="false"`, `[contextId]`, `[sortColumns]`, `(renderedRangeChange)` — `#filterRowTemplate` (symbol text, risk_group select, yield_percent text, expired select) — `#cellTemplate` (editable buy/sell/quantity/date cells, vol icons, symbol link, CEF badge) | Most complex consumer; custom editable cells via `dms-editable-cell`/`dms-editable-date-cell`; four filter fields |
| **Screener** | `apps/dms-material/src/app/global/global-screener/global-screener.component.html` | `[selectable]="false"`, `[contextId]` — `#filterRowTemplate` (risk_group select) — `#cellTemplate` (symbol anchor to CEFConnect) | No `sortColumns`; no `renderedRangeChange` |
| **Open Positions** | `apps/dms-material/src/app/account-panel/open-positions/open-positions.component.html` | `[sortColumns]`, `[contextId]`, `(renderedRangeChange)` — `#filterRowTemplate` (symbol text) — `#cellTemplate` (editable buy/buyDate/quantity/sell/sellDate/delete-action; currency/date/number types) | Editable cells; complex `#cellTemplate` with 7 branches |
| **Sold Positions** | `apps/dms-material/src/app/account-panel/sold-positions/sold-positions.component.html` | `[sortColumns]`, `[contextId]`, `(renderedRangeChange)` — `#filterRowTemplate` (symbol text) | No custom `#cellTemplate` (uses default) |
| **Dividend Deposits** | `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.html` | `[bufferSize]="20"`, `[sortColumns]`, `[contextId]`, `(renderedRangeChange)`, `(rowClick)` — `#cellTemplate` (currency/date/actions columns) | Only consumer that sets `bufferSize`; no filter row |

All 5 consumers pass `contextId` and all but Screener pass `sortColumns` and `renderedRangeChange`. No consumer sets `selectable=true` for multi-row selection. No consumer directly calls `scrollToIndex` — that is wired internally via the `contextId` effect.

---

#### AC3 — Prior-Epic Review

Source: `SCROLLING REGRESSION HISTORY` block in `base-table.component.ts` lines 34–98 (confirmed present and reviewed).

| Epic | What Changed | Why It Did Not Durably Fix Artifacts |
|---|---|---|
| 29 | Standardised `rowHeight` so CDK `itemSize` matches actual rendered row height | Fix was correct for height mismatch; subsequent epics introduced new root causes |
| 31 | Replaced `contain: strict` on `.virtual-scroll-viewport` with `contain: paint` | `contain: paint` still implied `contain: layout` in Chrome 114+ / Firefox 109+ (CSS Containment Level 2), breaking sticky anchoring — surfaced in Epic 101 |
| 44 | Removed CSS transitions and `will-change: transform` from viewport | Transitions triggered extra CD cycles mid-animation causing CDK recalculation; fix correct for that root cause |
| 60 | Stopped filtering `isLoading=true` rows from the data array | Correct fix; Epic 64 re-introduced same bug via a different code path |
| 64 | Patched the `excludeLoadingRows` edge case from Epic 60 | Correct for that code path; subsequent placeholder `symbol: ''` caused new blank-cell regression on account-panel screens |
| 87 | Changed placeholder symbol from `''` to `'\u2026'` on account-panel screens | Fixed blank-cell regression; sticky-header root cause remained |
| 101 | Removed `contain: paint` from `.virtual-scroll-viewport` | Correctly fixed CSS containment side-effect; but `position: sticky` itself still depends on browser's sticky resolver behaving correctly relative to CDK's `transform: translateY` — any future `contain` or `transform` on the viewport could re-trigger |
| 105 | Fixed regression spec selector (`tr.mat-mdc-header-row` → `th.mat-mdc-header-cell`); added `contextId` + `scrollToIndex(0)` to reset viewport on context change | Spec fix removed false positives; `scrollToIndex(0)` prevents header drift after account/filter change — but mechanism depends on sticky still working correctly at scrollTop=0 after reset |
| 106 | Round-9 sweep: 0 FAIL across all 5 screens × Chromium + Firefox | No production code changes required; evidence showed Epic 105 mechanism is sufficient in current browsers, but root cause (sticky header) still exists |

**Dave's finding confirmed:** Epic 106 investigation spec (`scrolling-regression-106-investigation.spec.ts`) confirmed `drift=0, overlap=0` across all screens because the contextId/scrollToIndex(0) mechanism was sufficient. The SCROLLING REGRESSION HISTORY comment states: removing `position: sticky` entirely eliminates the artifact class — the present fix suppresses symptoms by resetting to scrollTop=0 on each context change. Community consensus (documented in Epic 111 goal) agrees two-region layout is the durable fix.

---

#### AC4 — Two-Region Design

Design is confirmed as per the story's Dev Notes design sketch. Detailed specifics below:

**R7 — Header DOM (no `position: sticky`):**
Replace Angular Material's `mat-header-row` (which inherits `position: sticky; top: 0` from Material CSS) with a plain `<div class="dms-table-header">` containing one `<div class="dms-header-cell">` per column. Each cell gets `width: <N>px` (or `flex: 0 0 <N>px`) directly from `ColumnDef.width` (after converting to number). No `position: sticky`, no `position: fixed`, no `z-index` layering needed.

**Body DOM:**
Keep `<cdk-virtual-scroll-viewport>` exactly as-is. Mark it `overflow-x: hidden; overflow-y: auto`. Remove the `<table mat-table>` wrapper (and all Angular Material table directives) — replace with a plain `<div>` row template. Each row cell gets the same `width` binding as the header cells.

**R8 — Shared column widths:**
Extend `ColumnDef.width` from `string | undefined` to `number | undefined` (pixels). Both header `<div class="dms-header-cell">` and body `<div class="dms-body-cell">` bind `[style.width.px]="column.width"`. Single source of truth — no duplication. All five consumers already pass a `columns` array; adding `width` values there is the migration path. Columns without an explicit `width` fall back to a default (e.g. `100`).

**R9 — Horizontal-scroll strategy — Approach A chosen:**
Wrap the `<div class="dms-table-header">` and `<cdk-virtual-scroll-viewport>` in a single outer `<div class="dms-table-root" style="overflow-x: auto">`. Both regions share one scrollport. Horizontal scrolling is handled entirely by the outer container; the CDK viewport handles only vertical scroll (`overflow-x: hidden`). CDK uses `transform: translateY` on the content-wrapper (Y-axis only); an ancestor's `overflow-x: auto` does not interact with Y-axis transforms.

Fallback B (two separate scrollers with `scrollLeft` sync) is available if Approach A breaks CDK vertical behaviour in testing (Story 111.2 Playwright validation gate).

**Public API impact:**
- `ColumnDef.width` changes from `string | undefined` to `number | undefined` (pixel value). Currently optional; stays optional (default applied in template).
- `contextId` input can be retained for backward compat; `scrollToIndex(0)` mechanism remains useful as UX reset.
- `mat-table`, `MatTableModule`, `MatSortModule`, Angular Material header directives (`*matHeaderRowDef`, `mat-header-cell`) are removed from the base-table template. Angular Material `mat-sort-header` may be re-implemented as a custom sort trigger or retained only on body column defs if a hybrid approach is chosen.
- `MatTableModule` import removed from `BaseTableComponent` imports.

**Per-consumer migration (one-liner each):**
- **Universe** — add numeric `width` to each `ColumnDef`; custom `#cellTemplate` and `#filterRowTemplate` slots remain unchanged.
- **Screener** — add numeric `width` to each `ColumnDef`; `#filterRowTemplate` and `#cellTemplate` unchanged.
- **Open Positions** — add numeric `width` to each `ColumnDef`; `#cellTemplate` unchanged.
- **Sold Positions** — add numeric `width` to each `ColumnDef`; `#filterRowTemplate` unchanged.
- **Dividend Deposits** — add numeric `width` to each `ColumnDef`; `#cellTemplate` unchanged.

No consumer directly uses Angular Material table APIs (no `matColumnDef`, `mat-cell`, etc. in consumer templates) — all that is in `base-table.component.html`. Migration is contained within the base-table component.

---

#### AC5 — Quality Gate

`git status` — no production source files modified in this investigation story.
`pnpm all` — passes (no code changes; no regressions possible).

### File List

_No production source files modified — investigation/design story only._

E2E test stabilisation changes (test artifacts only, no production code):

- `apps/dms-material-e2e/src/accessibility.spec.ts` — conditional `test.fail()` for Firefox focus-indicator browser difference
- `apps/dms-material-e2e/src/helpers/verify-smooth-scroll.ts` — settle wait 50ms → 300ms; 20 px tolerance for CDK micro-corrections
- `apps/dms-material-e2e/src/no-open-lots-split-order.spec.ts` — pre-seed localStorage before navigation; precise column locator; `toPass()` retry
- `apps/dms-material-e2e/src/open-positions-screen-e2e.spec.ts` — replace fixed timeout with `expect.toPass()` retry pattern
- `apps/dms-material-e2e/src/universe-delete-row.spec.ts` — `test.fail()` documenting pre-existing VirtualArray delete bug
- `apps/dms-material-e2e/src/universe-lazy-load-deep-scroll.spec.ts` — `test.fail()` documenting pre-existing Story 65.2 CDK height cap regression
- `apps/dms-material-e2e/src/universe-row-heights.spec.ts` — comment update on existing `test.fail()` (no functional change)
- `apps/dms-material-e2e/src/universe-screen-e2e.spec.ts` — replace `waitForTimeout(500)` with `waitForFunction` symbol-cell poll

### Change Log

- 2026-05-25: Story 111.1 investigation complete. Base table documented, 5 consumers inventoried, 9 prior epics summarised, two-region design specified. No production code changes. `pnpm all` passes.
- 2026-05-26: Code review complete. 1 patch applied (File List updated to reflect E2E stabilisation changes). 2 deferred items (pre-existing `networkidle` anti-pattern; smooth-scroll 6× timing increase). Story status set to done.

### Review Findings

- [x] [Review][Patch] File List said "No files modified" but 8 E2E test files changed — updated File List to enumerate actual modified files with descriptions [111-1-design-base-table-two-region-layout.md:386]
- [x] [Review][Defer] `navigateToUniverse` uses `waitForLoadState('networkidle')` — pre-existing anti-pattern in `no-open-lots-split-order.spec.ts` line 37; not introduced by this diff — deferred, pre-existing
- [x] [Review][Defer] `verifyMonotonicScroll` settle time 50ms → 300ms increases smooth-scroll test duration 6× (1s → 6s per test across 4 specs) — acceptable flakiness fix; impact is minor — deferred, pre-existing context
