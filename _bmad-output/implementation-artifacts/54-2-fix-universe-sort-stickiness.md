# Story 54.2: Fix Universe Sort State Persistence Regression

Status: Approved

## Story

As a trader,
I want my chosen sort order on the Universe screen to be remembered when I navigate away and
return,
so that I can resume working with the data exactly as I left it.

## Acceptance Criteria

1. **Given** a user applies Symbol descending sort on the Universe screen,
   **When** the user navigates to any other route (e.g. Accounts) and returns to the Universe screen,
   **Then** the sort indicator shows Symbol descending and the data loads in that order.

2. **Given** a user applies a multi-column sort on the Universe screen,
   **When** the user navigates away and returns,
   **Then** all sort columns and directions are restored correctly.

3. **Given** the fix is applied,
   **When** the e2e test from Story 54.1 runs,
   **Then** it passes green.

4. **Given** all changes are applied,
   **When** `pnpm all` runs,
   **Then** all unit tests and e2e tests pass with no regressions.

## Definition of Done

- [ ] Root cause of sort stickiness regression identified and documented in the Dev Agent Record section below
- [ ] `SortFilterStateService.saveSortColumnsState()` is called at the correct point in the Universe component sort-change flow
- [ ] `loadSortColumnsState('universes')` correctly rehydrates the sort signal on component init
- [ ] Multi-column sort (Epic 43) continues to work correctly
- [ ] E2E test from Story 54.1 is now green
- [ ] `pnpm all` passes

## Tasks / Subtasks

- [ ] **Task 1: Reproduce regression and identify root cause**

  - [ ] Use Playwright MCP server to confirm bug is live (sort applied, navigate away, navigate back → sort lost)
  - [ ] Read `GlobalUniverseComponent` (`apps/dms-material/src/app/global/global-universe/global-universe.component.ts`) — locate where sort columns change handler calls `saveSortColumnsState`
  - [ ] Read `SortFilterStateService` (`apps/dms-material/src/app/shared/services/sort-filter-state.service.ts`) — confirm the save/load API
  - [ ] Compare current code with the git diff from Epic 43 to identify what changed
  - [ ] Document root cause in Dev Agent Record

- [ ] **Task 2: Fix the save path**

  - [ ] Ensure that whenever the sort columns signal changes in `GlobalUniverseComponent`, `saveSortColumnsState('universes', columns)` is called
  - [ ] If the sort-change callback was removed or bypassed in Epic 43, restore it without breaking multi-column sort

- [ ] **Task 3: Fix the load path if needed**

  - [ ] Confirm `loadSortColumnsState('universes')` is called during `ngOnInit` (or equivalent in zoneless/signal init)
  - [ ] Confirm the restored sort is applied to the SmartNgRX effect service before the first data load
  - [ ] If the timing is off (sort loaded after initial data fetch), fix the init order

- [ ] **Task 4: Verify with Playwright MCP server**

  - [ ] Apply Symbol descending, navigate away, navigate back → sort indicator persists ✅
  - [ ] Apply multi-column sort, navigate away, navigate back → all columns restored ✅

- [ ] **Task 5: Run `pnpm all`**
  - [ ] All unit tests pass
  - [ ] E2E test from Story 54.1 is now green
  - [ ] All other e2e tests pass

## Dev Notes

### Key Files

| File                                                                                            | Purpose                                                                                        |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`                 | Universe component — sort-change handler and ngOnInit sort restore                             |
| `apps/dms-material/src/app/shared/services/sort-filter-state.service.ts`                        | `saveSortColumnsState` + `loadSortColumnsState`                                                |
| `apps/dms-material/src/app/global/global-universe/restore-universe-filters.function.ts`         | Filter restore helper                                                                          |
| `apps/dms-material/src/app/global/global-universe/save-universe-filters-and-notify.function.ts` | Filter save helper                                                                             |
| `apps/dms-material-e2e/src/universe-sort-filter-persistence.spec.ts`                            | Related existing e2e tests (sort filter persistence for filters — different from sort columns) |
| `apps/dms-material-e2e/src/54-1-failing-e2e-universe-sort-stickiness.spec.ts` _(sic)_           | Story 54.1 test — must turn green                                                              |

### Save/Load API

```typescript
// Save (call when sortColumns$ signal changes)
saveSortColumnsState(table: string, columns: SortColumn[]): void

// Load (call in ngOnInit before first data load)
loadSortColumnsState(table: string): SortColumn[]
```

### localStorage key: `'dms-sort-filter-state'`

### Existing test as reference

`universe-sort-filter-persistence.spec.ts` tests filter persistence (risk_group, account, etc.).
The sort-stickiness test from Story 54.1 tests sort column persistence — the same service but
different method calls.

## Dev Agent Record

> _(To be filled in by the implementing dev agent.)_

### Root Cause

_(Document what changed in Epic 43 that broke the persistence.)_

### Fix Applied

_(Describe the code change made.)_
