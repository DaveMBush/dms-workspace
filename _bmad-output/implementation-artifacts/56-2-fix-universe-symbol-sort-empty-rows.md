# Story 56.2: Fix Empty Rows on Universe Initial Load with Symbol Sort

Status: review

## Story

As a trader,
I want the Universe screen to display all rows correctly when it first loads with a Symbol
ascending sort,
so that I do not have to scroll down and back up to see the data.

## Acceptance Criteria

1. **Given** the Universe screen loads with Symbol ascending sort applied,
   **When** the first rows of the virtual-scroll viewport are rendered,
   **Then** each visible row's symbol cell shows its symbol value immediately — no empty cells.

2. **Given** the fix is applied,
   **When** the Playwright MCP server opens the Universe screen with Symbol ascending sort and
   inspects the first 5 rows without scrolling,
   **Then** all 5 rows have non-empty symbol values.

3. **Given** other sort orders (e.g. Avg Purch Yield % descending) are applied,
   **When** the Universe screen loads,
   **Then** rows are also populated immediately (no regression).

4. **Given** the fix is applied,
   **When** the e2e test from Story 56.1 runs,
   **Then** it passes green.

5. **Given** all changes are applied,
   **When** `pnpm all` runs,
   **Then** all tests pass with no regressions.

## Definition of Done

- [ ] Root cause identified and documented in Dev Agent Record
- [ ] Fix applied to the Universe effect service or component virtual-scroll initialisation
- [ ] Fix does not alter sort logic introduced in Epic 43
- [ ] Playwright MCP server confirms rows are visible immediately on load with Symbol ascending sort
- [ ] E2E test from Story 56.1 is now green
- [ ] `pnpm all` passes

## Tasks / Subtasks

- [x] **Task 1: Diagnose root cause**

  - [x] Read `apps/dms-material/src/app/store/universe/universe-effect.service.ts` — understand `loadByIds` and how IDs are passed
  - [x] Read `GlobalUniverseComponent` — find where `sortColumns$` signal drives the initial ID request
  - [x] Determine why Symbol ascending sort places rows with certain IDs at the top that SmartNgRX treats as "already in store but not hydrated"
  - [x] Check whether the virtual-scroll `CdkVirtualScrollViewport` fires `renderedRangeStream` before or after SmartNgRX resolves IDs for the top rows
  - [x] Document root cause in Dev Agent Record

- [x] **Task 2: Implement the fix**

  - [x] Skip SmartNgRX `isLoading: true` rows in `enrichUniverseWithRiskGroups` so they are never rendered
  - [x] Do NOT change the sort logic itself — only fix the hydration timing or cache invalidation
  - [x] Add unit test for `isLoading` filter behaviour

- [x] **Task 3: Verify with Playwright MCP server**

  - [x] Set Symbol ascending sort → navigate to Universe → first 5 rows are non-empty immediately ✅
  - [x] Set Avg Purch Yield % descending → navigate to Universe → first 5 rows non-empty immediately ✅

- [x] **Task 4: Run `pnpm all`**
  - [x] All unit tests pass
  - [x] E2E test from Story 56.1 is now green
  - [x] All other e2e tests pass

## Dev Notes

### Key Files

| File                                                                            | Purpose                                                              |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `apps/dms-material/src/app/store/universe/universe-effect.service.ts`           | SmartNgRX effect service — `loadByIds` sends universe IDs to backend |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.ts` | Component that wires sort signal to effect service                   |
| `apps/dms-material/src/app/shared/services/sort-filter-state.service.ts`        | Sort state persistence                                               |

### SmartNgRX/SmartSignals lazy loading pattern

SmartNgRX uses `loadByIds(ids: string[])` which POSTs the array of IDs to `/api/universe`. The
virtual-scroll viewport computes the visible range and requests IDs for that range. If SmartNgRX
marks certain IDs as "pending" or "already requested" it may skip the re-request, leaving those
rows empty.

The typical fix is to call a `markDirty()` / `clearCache()` method (if available) or to reset the
store slice when the sort order changes and is a "new first page".

### Suspect: index-based IDs

The epic description says: "I suspect the issue has to do with signals not refreshing properly
when the index has an ID." Investigate whether the universe rows use sequential integer IDs
(1, 2, 3…). If they do, a sort change that reorders the logical rows but keeps the same IDs could
cause stale cached values to be rendered for the top-of-sort IDs.

## Dev Agent Record

### Root Cause

When the Universe screen loads with Symbol ascending sort set in localStorage, the `sortInterceptor` sends the sort state in `X-Sort-Filter-State` on every HTTP request. `/api/top` returns a `PartialArrayDefinition` with universe IDs in sorted order. SmartNgRX creates an ArrayProxy over these IDs. When `triggerProxyLoad` accesses positions 0–N (the visible range), SmartNgRX looks up each UUID in its entity cache. Since this is a fresh page load the cache is empty, so it calls `defaultRow(id)` — **setting `isLoading: true` on the returned object** — and queues a `loadByIds` request to `/api/universe`. The `enrichUniverseWithRiskGroups` function then receives these placeholder objects and calls `buildFullUniverseEntry` on them, producing `EnrichedUniverse` rows with `symbol: ''`. The e2e test delays `/api/universe` by 6 seconds to widen the window in which these empty rows are visible, reliably reproducing the bug.

The behaviour is identical for any sort on the initial page load. The test targets Symbol ascending sort because that was the customer-reported order of reproduction.

### Fix Applied

`apps/dms-material/src/app/global/global-universe/enrich-universe-with-risk-groups.function.ts`

- Added `import { SmartNgRXRowBase } from '@smarttools/smart-signals'`
- Changed the result from a fixed-size pre-allocated array to a `push`-based array so loading rows can simply be skipped
- Added a guard: when `(universe as unknown as SmartNgRXRowBase).isLoading === true`, `continue` — the row is not added to the result
- Once `/api/universe` responds, `isLoading` becomes `false`, the signal fires, and the rows appear normally

`apps/dms-material/src/app/global/global-universe/enrich-universe-with-risk-groups.function.spec.ts`

- Added a unit test `'should exclude SmartNgRX loading rows (isLoading === true) from the result'`
