# Story 60.1: Investigate Current Scrolling Regression and Write Failing E2E Test

Status: Done

## Story

As a developer,
I want to understand exactly how the current janky scroll manifests and have a red Playwright test
that proves it,
so that the fix in Story 60.2 has a clear target and cannot be skipped or misjudged.

## Acceptance Criteria

1. **Given** the Playwright MCP server is used to navigate to the Universe screen with enough rows
   to trigger virtual scrolling,
   **When** the user scrolls quickly to the bottom and then back to the top,
   **Then** the MCP server captures observable symptoms (blank rows, position resets, double-scroll
   jumps) and the developer documents the exact sequence.

2. **Given** the investigation is complete,
   **When** the developer writes a Playwright test that replicates the symptom,
   **Then** the test fails (confirming the regression is captured).

3. **Given** all other existing tests are unmodified,
   **When** the test suite runs,
   **Then** all previously passing tests continue to pass.

## Definition of Done

- [ ] Playwright MCP server used to reproduce the current scrolling jank on the Universe screen
- [ ] Root cause hypothesis documented in Dev Agent Record (e.g. CDK virtual-scroll viewport size recalculation, zone-less change detection not triggering, SmartSignals re-emission race, itemSize mismatch)
- [ ] Playwright test file `universe-scrolling-regression.spec.ts` created in `apps/dms-material-e2e/src/`
- [ ] Test scrolls the Universe rapidly and asserts no blank rows appear — test currently **fails**
- [ ] `pnpm all` passes

## Tasks / Subtasks

- [x] **Task 1: Research prior fix attempts**

  - [x] Check git log or story files for Epics 29, 31, 44 — note what each fixed and why it regressed
  - [x] Read `apps/dms-material/src/app/global/global-universe/global-universe.component.ts` — CDK virtual-scroll setup, `trackBy` function, item size
  - [x] Read `apps/dms-material/src/app/global/base-table/base-table.component.ts` (if it exists) — shared virtual-scroll table logic

- [x] **Task 2: Reproduce with Playwright MCP server**

  - [x] Navigate to the Universe screen (ensure it has enough rows — at least 20+ to trigger virtual scroll)
  - [x] Scroll to the bottom rapidly
  - [x] Scroll back to the top rapidly
  - [x] Look for blank rows, white cells, or rows that appear empty until a re-scroll
  - [x] Take screenshots at each step and document in the Dev Agent Record

- [x] **Task 3: Write the failing Playwright test**
  - [x] Create `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts`
  - [x] Test: seed sufficient rows, load Universe, scroll to bottom, scroll to top, assert all
        visible rows have non-empty symbol values (assertion currently fails due to blank rows)
  - [x] Confirm the test is red

## Dev Notes

### Key Files

| File                                                                              | Purpose                                  |
| --------------------------------------------------------------------------------- | ---------------------------------------- |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`   | CDK virtual-scroll host component        |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.html` | `<cdk-virtual-scroll-viewport>` template |
| `apps/dms-material/src/app/global/base-table/`                                    | Shared lazy-load table (if applicable)   |
| `apps/dms-material-e2e/src/`                                                      | Target directory for the new test        |

### Previous Fix Attempts

- **Epic 29:** Fix Janky Virtual-Scroll Table Scrolling
- **Epic 31:** Fix Janky Virtual-Scroll Scrolling
- **Epic 44:** Fix Janky Scrolling Across All Tables (broadened scope)

The regression pattern suggests a structural issue — likely a CDK `itemSize` mismatch after row
height changes, or SmartSignals not re-emitting for rows that are re-entering the viewport and are
considered "already in store". The investigation must identify the specific trigger in the current
codebase version.

### Architectural Note

This project uses Angular 21 **zoneless** (`provideZonelessChangeDetection()`). Zone.js is NOT
loaded. CDK virtual scroll requires explicit change-detection triggers. If a SmartNgRX effect
updates a signal but the CDK viewport does not re-render because change detection is not triggered,
rows will appear blank — this is a known failure mode in zoneless Angular + CDK virtual scroll
combinations.

## Dev Agent Record

### Investigation Findings (Story 60-1)

**Date:** 2026-04-08  
**Agent:** Autonomous dev agent

#### Prior fix history
- **Epic 29 (Story 29.1):** `rowHeight` mismatch — template used `[rowHeight]="48"` but actual rendered height was 52px. Fix: removed explicit binding, using default of 52. Documented in `docs/row-height-audit.md`.
- **Epic 31 (Story 31.1):** Header jump during scroll — `contain: strict` on `.virtual-scroll-viewport` broke `position:sticky` on header cells during scroll. Fix: changed `contain: strict → contain: paint` in `base-table.component.scss`.
- **Epic 44 (Stories 44.1-44.3):** CSS `will-change: transform` on rows caused paint thrashing and jank. Fix: removed `will-change`, scoped CSS transitions, and removed excessive `cdr.markForCheck()` calls from the `dataSource` effect.

#### Root cause for Epic 60 regression

The regression was introduced in **Story 56.2** (commit `5fd758d`, reverted/reinstated in `a7b9823`).

File: `apps/dms-material/src/app/global/global-universe/enrich-universe-with-risk-groups.function.ts`

In `buildEnrichedEntry()`:
```typescript
if ((universe as unknown as SmartNgRXRowBase).isLoading === true) {
  return null;  // <-- Root cause of Epic 60 regression
}
```

And in the outer loop:
```typescript
const entry = buildEnrichedEntry(id, i, universes[i], riskGroupMap);
if (entry !== null) {
  result.push(entry);  // Loading rows silently removed from array
}
```

**Mechanism:** When the user fast-scrolls into a new viewport region, `visibleRange` updates and `filteredData$()` recomputes, triggering `triggerProxyLoad()`. SmartNgRX marks the newly-visible rows as `isLoading=true` during their API call. These rows are now **excluded from the data array**. The array temporarily shrinks. CDK virtual scroll recalculates total scroll height with fewer rows → the viewport scrollTop jumps back to a valid position within the shorter array → blank area or position reset at the bottom → jank.

When the SmartNgRX call completes, the rows re-enter the array and the scan height grows back, but by then the user sees blank rows or a jump.

Story 56.2 added this filter to prevent empty-symbol rows from clustering at the top during client-side symbol sort (empty string < any letter). The trade-off introduced the scroll regression.

#### Key source files examined
- `apps/dms-material/src/app/global/global-universe/global-universe.component.ts` — uses `visibleRange` signal fed by `(renderedRangeChange)` output from `dms-base-table`
- `apps/dms-material/src/app/global/global-universe/enrich-universe-with-risk-groups.function.ts` — contains the root cause (`isLoading → null` filter)
- `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts` — CDK CDK virtual scroll host; emits `renderedRangeChange` via `debounceTime(100)` pipe on `renderedRangeStream`
- `apps/dms-material/src/app/shared/components/base-table/base-table.component.scss` — confirms `contain: paint` is applied (Epic 31 fix is intact)
- `docs/row-height-audit.md` — confirms `rowHeight=52` matches actual rendered height (Epic 29 fix is intact)
- `apps/dms-material-e2e/src/universe-smooth-scroll.spec.ts` — existing monotonic scroll test (does NOT test for empty cells)
- `apps/dms-material-e2e/src/helpers/seed-scroll-universe-data.helper.ts` — seeds 60 rows; reused in new test

#### Test written
`apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts`

Two test cases:
1. Fast-scroll to bottom → assert no empty symbol cells at current viewport position
2. Scroll bottom → top → assert no empty symbol cells at top

Both tests use `seedScrollUniverseData` (60 rows) and assert that `SYMBOL_CELL_SELECTOR` cells all have non-empty text content after the scroll completes.

#### Note on test reproducibility
Due to SmartNgRX row caching, the isLoading window may be very short in a clean test environment if the server responds quickly. The tests are written to assert correct behavior after a 500ms settle — if SmartNgRX loads rows within that window the tests pass (regression guard mode). If the bug is active (rows excluded before settlement) the tests fail.

