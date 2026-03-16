# Epic AX: Virtual Data Loading for Large Account Tables

## Epic Goal

For the three large account-level tables — Open Positions, Sold Positions, and Dividend Deposits — ensure that SmartNgRX/SmartSignals only fetches and processes data that is currently visible in the viewport. The rest of the application works with small, bounded datasets and does not need this treatment.

## Background & How SmartNgRX Virtual Arrays Work

SmartNgRX already provides the `PartialArrayDefinition` infrastructure for lazy ID loading. When a parent entity (e.g. `Account`) is loaded, a child field can return a `PartialArrayDefinition` instead of a complete array of IDs:

```typescript
// PartialArrayDefinition shape returned by the server
{
  startIndex: 0,       // first index this slice covers
  indexes: string[],   // IDs for that slice
  length: 123,         // total virtual-array size
}
```

SmartNgRX stores this as a `SmartArray`. When component code accesses `smartArray[i]` for index `i` whose ID is not yet in the store, SmartNgRX automatically calls `EffectService.loadByIndexes(parentId, childField, startIndex, length)` to retrieve the next chunk of IDs, then fetches the corresponding entities.

**The critical rule**: only access `smartArray[i]` for indices you actually need to render. Accessing every element of a 10,000-item array defeats the purpose. The correct loop pattern (taken directly from the SmartNgRX demo tree component) is:

```typescript
for (let i = 0; i < smartArray.length; i++) {
  if (i >= range.end) {
    // Skip remaining — increment result length without accessing items
    result.length += smartArray.length - i;
    break;
  }
  if (i >= range.start) {
    result.push(transform(smartArray[i])); // accesses item → triggers load if needed
  } else {
    result.length++; // placeholder — does NOT access item, does NOT trigger load
  }
}
```

The component needs to know `range.start` / `range.end` from the CDK virtual scroll viewport's `renderedRangeStream`.

## Current State

| Field         | PartialArrayDefinition on interface | Server returns partial array | Server `/indexes` endpoint | Component uses visible-window loop |
| ------------- | ----------------------------------- | ---------------------------- | -------------------------- | ---------------------------------- |
| `divDeposits` | ✅                                  | ✅                           | ✅                         | ❌ (loops all items)               |
| `openTrades`  | ❌                                  | ❌                           | ❌                         | ❌                                 |
| `soldTrades`  | ❌                                  | ❌                           | ❌                         | ❌                                 |

`AccountEffectsService.loadByIndexes` already exists (used by `divDeposits`). Server `/indexes` already handles `childField === 'divDeposits'`.

## Stories

### AX.1 — TDD: Expose rendered range from `BaseTableComponent`

**Goal:** Write tests for the `renderedRangeChange` output from `BaseTableComponent`.

**Test Coverage:**

- Test that `BaseTableComponent` subscribes to `viewport().renderedRangeStream` in `ngAfterViewInit`
- Test that the `renderedRangeChange` output emits when the rendered range changes
- Test that the range is debounced (100ms)
- Test cleanup with `takeUntilDestroyed`
- Mock the viewport and its `renderedRangeStream`

**Important:** At the end of this story, **disable all tests using `.skip()`** to allow CI to pass. Tests will be re-enabled in AX.2.

---

### AX.2 — Implement: Expose rendered range from `BaseTableComponent`

**Goal:** Let consumer components know which rows are currently in the CDK virtual scroll viewport so they can restrict their SmartArray access.

**Changes:**

- `BaseTableComponent` (`apps/dms-material/src/app/shared/components/base-table/`):
  - Inject `DestroyRef`
  - Implement `AfterViewInit`
  - In `ngAfterViewInit`, subscribe to `viewport().renderedRangeStream` (debounced 100 ms, `takeUntilDestroyed`)
  - Add `renderedRangeChange` signal output that emits `{ start: number; end: number }` whenever the rendered range changes
- No changes to template HTML required
- **Re-enable all tests** from AX.1 by removing `.skip()`

---

### AX.3 — TDD: Virtual data access for Dividend Deposits

**Goal:** Write tests for the Dividend Deposits component to verify it only accesses visible rows.

**Test Coverage:**

- Test that `DividendDepositsComponent` has `visibleRange` signal with default `{ start: 0, end: 50 }`
- Test that `onRangeChange` updates the `visibleRange` signal
- Test that `DividendDepositsComponentService.dividends` computed signal:
  - Returns a sparse array with correct total length
  - Only transforms items within the visible range
  - Uses placeholder length increments for items outside the visible range
  - Verifies the visible-window loop pattern is used

**Important:** At the end of this story, **disable all tests using `.skip()`** to allow CI to pass. Tests will be re-enabled in AX.4.

---

### AX.4 — Implement: Virtual data access for Dividend Deposits

**Goal:** Make the Dividend Deposits table only access (and therefore load from the server) the rows currently visible in the viewport.

**Pre-condition:** Infrastructure fully in place (see Current State table above).

**Changes:**

- `DividendDepositsComponent` (`dividend-deposits.component.ts`):
  - Add `visibleRange = signal<{ start: number; end: number }>({ start: 0, end: 50 })`
  - Add `onRangeChange(range: { start: number; end: number })` method that writes to `visibleRange`
  - Pass `visibleRange` to the service (inject as a signal or pass directly)
- `DividendDepositsComponentService.dividends` computed signal:
  - Accept (or inject) `visibleRange` signal
  - Replace the current 0..length loop with the visible-window loop pattern described above
  - Return a sparse array: pre-populated up to `range.start`, fully mapped for `range.start..range.end`, length padded to `divDepositsArray.length`
- `dividend-deposits.component.html`:
  - Add `(renderedRangeChange)="onRangeChange($event)"` on `<dms-base-table>`
- **Re-enable all tests** from AX.3 by removing `.skip()`

---

### AX.5 — TDD: Convert `openTrades` to `PartialArrayDefinition`

**Goal:** Write tests for converting `openTrades` to use `PartialArrayDefinition`.

**Test Coverage:**

- Test that `Account.openTrades` interface accepts `PartialArrayDefinition`
- Test that `accounts-definition.const.ts` default row has correct `PartialArrayDefinition` shape
- Test server `buildAccountResponse` returns `PartialArrayDefinition` with:
  - `startIndex: 0`
  - First 10 IDs in `indexes` array
  - Total count in `length`
- Test server `/indexes` endpoint with `childField === 'openTrades'`:
  - Returns correct slice of IDs based on `startIndex` and `length`
  - Applies correct ordering via `buildTradeOrderBy`
  - Filters for open trades (`sell_date: null`)
  - Returns correct total count

**Important:** At the end of this story, **disable all tests using `.skip()`** to allow CI to pass. Tests will be re-enabled in AX.6.

---

### AX.6 — Implement: Convert `openTrades` to `PartialArrayDefinition`

**Goal:** Return only the first slice of open-trade IDs (and total count) when loading an Account, so that SmartNgRX can lazily fetch additional IDs as the user scrolls.

**Changes:**

- `apps/dms-material/src/app/store/accounts/account.interface.ts`:
  - Change `openTrades: string[] | Trade[]` → `openTrades: PartialArrayDefinition | SmartArray<Account, Trade>`
- `apps/dms-material/src/app/store/accounts/accounts-definition.const.ts`:
  - Default row: change `openTrades: []` → `openTrades: { startIndex: 0, indexes: [], length: 0 }`
- `apps/server/src/app/routes/accounts/index.ts`:
  - In `buildAccountResponse`, change the `openTrades` value from a flat array of IDs to a `PartialArrayDefinition`:
    - Return the first 10 IDs from `openTradeIds`
    - Return `length: openTradeIds.length`
    - Server query already fetches all IDs via `getOpenTradeIds`; just slice for the initial chunk
- `apps/server/src/app/routes/accounts/indexes/index.ts`:
  - Add `childField === 'openTrades'` case
  - Query `prisma.trades` with `where: { accountId, sell_date: null }`, ordered by `buildTradeOrderBy`, with `skip`/`take`
  - Return `PartialArrayDefinition` with count via `prisma.trades.count`
- **Re-enable all tests** from AX.5 by removing `.skip()`

---

### AX.7 — TDD: Virtual data access for Open Positions

**Goal:** Write tests for the Open Positions component to verify it only accesses visible rows.

**Test Coverage:**

- Test that `OpenPositionsComponent` has `visibleRange` signal
- Test that `onRangeChange` updates the signal
- Test that `OpenPositionsComponentService.selectOpenPositions`:
  - Returns sparse array with correct total length
  - Only transforms items within visible range
  - Uses visible-window loop pattern

**Important:** At the end of this story, **disable all tests using `.skip()`** to allow CI to pass. Tests will be re-enabled in AX.8.

---

### AX.8 — Implement: Virtual data access for Open Positions

**Goal:** Make the Open Positions table only access (and load) the rows currently visible in the viewport.

**Pre-condition:** AX.2 and AX.6 complete.

**Changes:**

- `OpenPositionsComponent`:
  - Add `visibleRange = signal<{ start: number; end: number }>({ start: 0, end: 50 })`
  - Add `onRangeChange` handler; bind `(renderedRangeChange)` on `<dms-base-table>`
- `OpenPositionsComponentService.selectOpenPositions` computed signal:
  - Accept visible range
  - Replace the 0..length loop with the visible-window loop pattern
  - Items outside the range get sparse placeholder slots; items inside the range are transformed to `OpenPosition`
- Note: the server-side sort/filter is already applied before IDs are returned, so there is no client-side filtering to skip — the sparse array directly maps index → OpenPosition
- **Re-enable all tests** from AX.7 by removing `.skip()`

---

### AX.9 — TDD: Convert `soldTrades` to `PartialArrayDefinition`

**Goal:** Write tests for converting `soldTrades` to use `PartialArrayDefinition` (mirrors AX.5).

**Test Coverage:**

- Test `Account.soldTrades` interface accepts `PartialArrayDefinition`
- Test default row has correct `PartialArrayDefinition` shape
- Test server returns `PartialArrayDefinition` for `soldTrades`
- Test server `/indexes` endpoint with `childField === 'soldTrades'`:
  - Filters for sold trades (`sell_date !== null`)
  - Returns correct slice and total count

**Important:** At the end of this story, **disable all tests using `.skip()`** to allow CI to pass. Tests will be re-enabled in AX.10.

---

### AX.10 — Implement: Convert `soldTrades` to `PartialArrayDefinition`

**Goal:** Return only the first slice of sold-trade IDs when loading an Account (mirrors AX.6 for `soldTrades`).

**Changes:**

- `account.interface.ts`: `soldTrades: PartialArrayDefinition | SmartArray<Account, Trade>`
- `accounts-definition.const.ts` default row: `soldTrades: { startIndex: 0, indexes: [], length: 0 }`
- Server `buildAccountResponse`: return `PartialArrayDefinition` for `soldTrades`
- Server `/indexes` endpoint: add `childField === 'soldTrades'` case querying `prisma.trades` with `sell_date !== null`, ordered by `buildTradeOrderBy`
- **Re-enable all tests** from AX.9 by removing `.skip()`

---

### AX.11 — TDD: Virtual data access for Sold Positions

**Goal:** Write tests for the Sold Positions component (mirrors AX.7).

**Test Coverage:**

- Test `SoldPositionsComponent` has `visibleRange` signal
- Test `onRangeChange` updates the signal
- Test `SoldPositionsComponentService.selectSoldPositions` uses visible-window loop pattern

**Important:** At the end of this story, **disable all tests using `.skip()`** to allow CI to pass. Tests will be re-enabled in AX.12.

---

### AX.12 — Implement: Virtual data access for Sold Positions

**Goal:** Make the Sold Positions table only access visible rows (mirrors AX.8 for Sold Positions).

**Pre-condition:** AX.2 and AX.10 complete.

**Changes:**

- `SoldPositionsComponent`: visible range signal + `(renderedRangeChange)` binding
- `SoldPositionsComponentService.selectSoldPositions`: replace full loop with visible-window loop pattern; sparse array with total length for CDK scroll sizing
- **Re-enable all tests** from AX.11 by removing `.skip()`

---

### AX.13 — Bug Fix and Verification

**Goal:** Manually verify all three virtual scrolling implementations work correctly and fix any issues discovered.

**Verification Steps:**

- Test Dividend Deposits table with large dataset (100+ items):
  - Verify initial load only fetches visible rows
  - Verify scrolling triggers additional loads
  - Verify no performance degradation
  - Check browser DevTools Network tab for appropriate API calls
- Test Open Positions table similarly
- Test Sold Positions table similarly
- Verify sort/filter still work correctly with virtual scrolling
- Test browser back/forward navigation doesn't break virtual scrolling
- Fix any bugs discovered during verification

**Acceptance Criteria:**

- All three tables lazy-load data correctly
- No console errors
- Network requests show only visible data being fetched
- Scrolling is smooth with no jank
- All existing functionality (sort, filter, edit, delete) still works

---

### AX.14 — Comprehensive Unit Tests

**Goal:** Add comprehensive unit test coverage for the complete virtual scrolling implementation.

**Test Coverage:**

- Unit tests for `BaseTableComponent` `renderedRangeChange` output (stub viewport)
- Unit tests for updated computed signals in all three component services: verify that with a given `{ start, end }` range only the correct slice of items is returned and the total array length matches `smartArray.length`
- Unit tests for server `/indexes` endpoint: all three child fields (`divDeposits`, `openTrades`, `soldTrades`)
- Integration tests verifying the full flow from viewport change → range update → component re-render
- Edge case tests: empty arrays, single item, scrolling to end, scrolling to beginning

## Files Affected (summary)

| Layer                   | Files                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| Shared UI               | `base-table.component.ts`                                                                                      |
| Div Deposits            | `dividend-deposits.component.ts`, `dividend-deposits.component.html`, `dividend-deposits-component.service.ts` |
| Open Positions          | `open-positions.component.ts`, `open-positions.component.html`, `open-positions-component.service.ts`          |
| Sold Positions          | `sold-positions.component.ts`, `sold-positions.component.html`, `sold-positions-component.service.ts`          |
| Account store           | `account.interface.ts`, `accounts-definition.const.ts`                                                         |
| Server — accounts route | `apps/server/src/app/routes/accounts/index.ts`                                                                 |
| Server — indexes route  | `apps/server/src/app/routes/accounts/indexes/index.ts`                                                         |

## Dependencies

- Epic AW (server-side sort/filter state must be in place so the `/indexes` endpoint can apply the same ordering)

## Priority

Medium (meaningful performance gain for users with many trades or dividend deposits)

## Estimated Effort

3–4 days
