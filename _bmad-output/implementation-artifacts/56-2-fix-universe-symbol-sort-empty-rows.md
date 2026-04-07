# Story 56.2: Fix Empty Rows on Universe Initial Load with Symbol Sort

Status: Approved

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

- [ ] **Task 1: Diagnose root cause**
  - [ ] Read `apps/dms-material/src/app/store/universe/universe-effect.service.ts` — understand `loadByIds` and how IDs are passed
  - [ ] Read `GlobalUniverseComponent` — find where `sortColumns$` signal drives the initial ID request
  - [ ] Determine why Symbol ascending sort places rows with certain IDs at the top that SmartNgRX treats as "already in store but not hydrated"
  - [ ] Check whether the virtual-scroll `CdkVirtualScrollViewport` fires `renderedRangeStream` before or after SmartNgRX resolves IDs for the top rows
  - [ ] Document root cause in Dev Agent Record

- [ ] **Task 2: Implement the fix**
  - [ ] If the issue is SmartNgRX not re-triggering IDs it considers cached: force a refresh of the top-of-viewport IDs on sort change
  - [ ] If the issue is timing (sort state applied after initial scroll range is computed): ensure sort is applied before the first `loadByIds` call
  - [ ] Do NOT change the sort logic itself — only fix the hydration timing or cache invalidation

- [ ] **Task 3: Verify with Playwright MCP server**
  - [ ] Set Symbol ascending sort → navigate to Universe → first 5 rows are non-empty immediately ✅
  - [ ] Set Avg Purch Yield % descending → navigate to Universe → first 5 rows non-empty immediately ✅

- [ ] **Task 4: Run `pnpm all`**
  - [ ] All unit tests pass
  - [ ] E2E test from Story 56.1 is now green
  - [ ] All other e2e tests pass

## Dev Notes

### Key Files

| File | Purpose |
|------|---------|
| `apps/dms-material/src/app/store/universe/universe-effect.service.ts` | SmartNgRX effect service — `loadByIds` sends universe IDs to backend |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.ts` | Component that wires sort signal to effect service |
| `apps/dms-material/src/app/shared/services/sort-filter-state.service.ts` | Sort state persistence |

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

> _(To be filled in by the implementing dev agent.)_

### Root Cause

_(Document the exact SmartSignals/component path that causes empty rows.)_

### Fix Applied

_(Describe the code change made.)_
