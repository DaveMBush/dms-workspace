# Story 47.1 Investigation Notes: Lazy Loading Bulk-Fetch Root Cause

## Summary

The lazy loading bulk-fetch issue is **not** a server-side problem — the server already returns `PartialArrayDefinition` (first 50 rows) correctly. The bug is in **multiple client-side component services that iterate through ALL indices of a SmartSignals `VirtualArray`/`ArrayProxy`** on every Angular signal recomputation, triggering a single batched bulk request for all remaining rows.

---

## SmartSignals Virtual Array Mechanism

### How VirtualArray Works

When the server returns a `PartialArrayDefinition` (e.g., `{ startIndex: 0, indexes: ['id1'...50 ids], length: 200 }`), SmartSignals creates a `VirtualArray` Proxy:

- `rawArray` = the 50 loaded IDs
- `length` = 200 (total row count from server)

When code accesses `virtualArray[i]` for `i >= 50`:

1. The Proxy detects `rawArray[i] === undefined`
2. Calls `dispatchLoadByIndexes(parentId, childField, i)` — queues index `i` via RxJS Subject
3. Sets `rawArray[i] = 'indexNoOp-${i}'` to prevent duplicate dispatches
4. Returns placeholder string `'index-${i}'`

### The `bufferIndexes` Batch Mechanism

The `bufferIndexes()` RxJS operator in `LoadByIndexesSignals.loadByIndexesDispatcher()` (in `@smarttools/smart-signals` fesm2022 bundle) collects buffered index requests and fires a **SINGLE** network call:

```
min = Math.min(...bufferedIndexes)
max = Math.max(...bufferedIndexes)
effectService.loadByIndexes(parentId, childField, min, max - min + 1)
```

**Consequence:** If code accesses indices 50, 51, 52, ..., 199 synchronously (in one Angular render cycle), the buffer emits ONCE with `startIndex=50, length=150` — fetching ALL remaining rows in a single request.

---

## Root Cause Locations (Client-Side)

### Location 1: `universe.service.ts`

**File:** `apps/dms-material/src/app/global/global-universe/services/universe.service.ts`

```typescript
// In the effect — runs every time selectUniverses() changes:
for (let i = 0; i < universes.length; i++) {
  // universes.length = 200 (total)
  universesArray.push(universes[i]); // accesses index 50-199!
}

// In the computed signal — also runs every recomputation:
for (let i = 0; i < current.length; i++) {
  // current.length = 200
  currentArray.push(current[i]); // accesses index 50-199!
}
```

`universes` (and `current`) is the SmartSignals `ArrayProxy` returned by `selectUniverses()`. Both the `effect` and `computed` iterate through ALL `length` items, triggering `dispatchLoadByIndexes` for each unloaded index (50..N). The `bufferIndexes` batch then sends ONE `POST /api/top/indexes` request for `startIndex=50, length=total-50`.

### Location 2: `build-universe-map.function.ts`

**File:** `apps/dms-material/src/app/shared/build-universe-map.function.ts`

```typescript
export const buildUniverseMap = computed(function computeUniverseMap() {
  const universes = selectUniverses(); // ArrayProxy, length=200
  for (let j = 0; j < universes.length; j++) {
    // iterates ALL 200 items!
    const universe = universes[j];
    universeMap.set(universe.id, universe);
  }
});
```

`buildUniverseMap` is called from `dividend-deposits-component.service.ts` and `open-positions-component.service.ts`. Each call iterates through all universes, accessing every index and triggering batch `loadByIndexes` if any are unloaded.

### Location 3: `dividend-deposits-component.service.ts`

**File:** `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits-component.service.ts`

```typescript
readonly dividends = computed(() => {
  const divDepositsArray = this.currentAccount().divDeposits as DivDeposit[];
  const totalLength = divDepositsArray.length;  // total row count (e.g. 200)
  // Comment says: "Dense array: populate all items to avoid sparse-array/CDK buffer mismatch"
  for (let i = 0; i < totalLength; i++) {
    const d = divDepositsArray[i];              // accesses index 50-199!
    result.push({...});
  }
});
```

`divDepositsArray` is an `ArrayProxy` for the account's `divDeposits` field. `totalLength = divDepositsArray.length` is the TOTAL row count (from `PartialArrayDefinition.length`). The loop accesses all indices, triggering bulk `loadByIndexes(parentId, 'divDeposits', 50, total-50)`.

**Ironically, the comment "Dense array: populate all items to avoid sparse-array/CDK buffer mismatch" IS THE BUG.** The attempt to populate all items defeats the lazy-loading architecture.

### Location 4: `open-positions-component.service.ts`

**File:** `apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts`

```typescript
selectOpenPositions = computed(() => {
  const trades = this.trades(); // openTrades as ArrayProxy, length=200
  for (let i = 0; i < trades.length; i++) {
    // iterates ALL items!
    const trade = trades[i];
    if (!this.isClosed(trade, universe!)) {
      openIndices.push(i);
    }
  }
});
```

Same pattern — iterating `trades.length` (total row count) via a for-loop on the `ArrayProxy`.

### Location 5: `base-table.component.ts` (Secondary)

**File:** `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`

```typescript
dataSource = computed(() => {
  const rows = [...this.data()];  // SPREAD iterates ALL items!
  ...
});
```

The spread `[...this.data()]` iterates from index 0 to `data().length - 1`. If `data()` is still an `ArrayProxy` (not yet materialized), this also triggers bulk `loadByIndexes`. In practice, by the time `data()` reaches the base-table, it has already been materialized by the component services above — so this is a secondary risk rather than the primary trigger. However, it must be fixed to prevent future regressions.

---

## Data Flow Confirmation

### Universe Screen Trigger Chain

1. `TopEffectsService.loadByIds(['1'])` → `POST /api/top` → server returns `PartialArrayDefinition` for `universes` (first 50 IDs, `length=200`)
2. SmartSignals stores `PartialArrayDefinition` → `convertChildrenToVirtualArray` creates `VirtualArray(rawArray[0..49], length=200)`
3. `selectUniverses()` → `getTopChildRows()` → returns `ArrayProxy` wrapping the `VirtualArray`
4. `UniverseService.universes()` computed reads `selectUniverses()` (the `ArrayProxy`)
5. Loop `for i=0..199` in `universeService.universes()` accesses indices 50-199 on the `ArrayProxy`
6. Each access calls `VirtualArray.dispatchLoadByIndexes(parentId='1', childField='universes', index=i)`
7. All 150 dispatches are buffered by `bufferIndexes()` (synchronous in one Angular render cycle)
8. Buffer emits → `TopEffectsService.loadByIndexes('1', 'universes', 50, 150)` → `POST /api/top/indexes` with `{ parentId:'1', childField:'universes', startIndex:50, length:150 }`
9. Server returns all 150 remaining rows → **BULK FETCH CONFIRMED**

### Account Sub-Tables Trigger Chain

Same pattern for `divDeposits`, `openTrades`, `soldTrades`:

1. `AccountEffectsService.loadByIds([accountId])` → `POST /api/accounts` → server returns `PartialArrayDefinition` for each field (first 50, `length=total`)
2. SmartSignals creates `VirtualArray` for each field
3. Component service accesses ALL indices in a for-loop, triggering bulk `loadByIndexes`
4. `AccountEffectsService.loadByIndexes(accountId, fieldName, 50, total-50)` → `POST /api/accounts/indexes`

---

## Server-Side Analysis (Working Correctly)

The server was updated in Epic 40 and is correct:

- **`UNIVERSE_PAGE_SIZE = 50`** (`apps/server/src/app/routes/top/index.ts`)

  - Initial `POST /api/top` returns first 50 universe IDs as `PartialArrayDefinition`
  - `/api/top/indexes` endpoint supports `{ startIndex, length }` for pagination

- **`ACCOUNT_PAGE_SIZE = 50`** (`apps/server/src/app/routes/accounts/account-page-size.const.ts`)
  - Initial `POST /api/accounts` returns first 50 rows per table as `PartialArrayDefinition`
  - `/api/accounts/indexes` endpoint supports pagination

The server correctly supports lazy loading. **The client is the problem.**

---

## Why "First 10 Rows" Before Bulk-Fetch

The story describes "scrolls slightly beyond the first 10 rows" — this is because:

1. On initial load: server returns 50 IDs → component service loops through `length` (e.g. 200) → bulk fetch of 50..199 occurs **immediately on first render** (not on scroll)
2. The bulk fetch happens as soon as the Angular component is rendered and signals recompute
3. CDK virtual scroll shows only ~10-15 rows initially (at 52px row height in ~600px viewport)
4. The user observes: 10 rows rendered → bulk network request appears → remaining rows arrive

The "scroll beyond 10 rows" is a red herring — the bulk fetch is triggered on **initial component render**, not on scroll. The user notices it only when they scroll because that's when they see data loading.

---

## What Must Change for Story 47.2

The fix requires a fundamental change to how component services consume the SmartSignals `ArrayProxy`:

### ❌ Current (Broken) Pattern

```typescript
// Iterates ALL items → bulk fetch
for (let i = 0; i < proxyArray.length; i++) {
  items.push(proxyArray[i]);
}
const copy = [...proxyArray]; // Also iterates ALL items
```

### ✅ Required Pattern (Only Access Visible Range)

Pass the `ArrayProxy` directly to CDK virtual scroll. **Never** iterate through all `proxyArray.length` items. Instead, let CDK virtual scroll access only the visible range (e.g., indices 0..19) — SmartSignals will then only fetch those ranges.

### Files That Must Change in Story 47.2

| File                                                                                               | Required Change                                                                                      |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `apps/dms-material/src/app/global/global-universe/services/universe.service.ts`                    | Do NOT convert `ArrayProxy` to dense array. Return the proxy directly (or slice only visible range). |
| `apps/dms-material/src/app/shared/build-universe-map.function.ts`                                  | Avoid iterating ALL universe items; only map loaded items (those with non-empty `symbol`).           |
| `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits-component.service.ts` | Do NOT loop through `divDepositsArray.length`. Return the proxy or slice visible range.              |
| `apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts`       | Do NOT loop through `trades.length`. Return proxy or visible range only.                             |
| `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`                   | Replace `[...this.data()]` with a non-spreading alternative that CDK virtual scroll handles lazily.  |

### Key Design Shift for Story 47.2

The `BaseTableComponent` should receive the raw `ArrayProxy` as `data()` and pass it as `[dataSource]` directly to CDK virtual scroll's `*cdkVirtualFor` — without spreading or copying. CDK virtual scroll will then access only visible indices, and SmartSignals will request only those pages.

---

## Network Request Evidence (Code-Level)

| Screen            | Endpoint                                                     | Page Size | Bulk-Fetch Trigger                                |
| ----------------- | ------------------------------------------------------------ | --------- | ------------------------------------------------- |
| Universe          | `POST /api/top/indexes`                                      | 50        | `universe.service.ts` for-loops `ArrayProxy`      |
| Dividend Deposits | `POST /api/accounts/indexes` with `childField='divDeposits'` | 50        | `dividend-deposits-component.service.ts` for-loop |
| Open Positions    | `POST /api/accounts/indexes` with `childField='openTrades'`  | 50        | `open-positions-component.service.ts` for-loop    |

All three trigger `loadByIndexes(parentId, fieldName, 50, totalCount-50)` fetching all remaining rows in ONE request, immediately on component initialization (before any scrolling).

---

## Story 47.2 Starting Point

Story 47.2 should:

1. Change `universe.service.ts` to NOT materialize the `ArrayProxy` — pass the proxy directly to `filteredData$` / base-table
2. Change all account sub-table component services similarly
3. Change `base-table.component.ts` `dataSource` computed to NOT use spread
4. Change `build-universe-map.function.ts` to only map already-loaded items (those where `symbol !== ''` and ID isn't a placeholder)
5. Verify CDK virtual scroll accesses only visible rows (rendering 10-20 rows should fire at most one `loadByIndexes` request per scroll event)
