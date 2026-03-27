# Dividend Deposits Table Rendering Diagnosis

## Root Cause

The Dividend Deposits table fails to render rows because the **CDK virtual scroll buffer range exceeds the service's visible-window range**, causing the sparse-array optimization to feed `undefined` items to the mat-table's `trackByFn`. This crashes the Angular differ, leaving the table in a permanently broken state with 0 rendered rows.

### Specific Failure Chain

1. `DividendDepositsComponentService.dividends` computed signal creates a **sparse array** of length 336, filling only indices 0–49 (the initial `visibleRange = {start: 0, end: 50}`)
2. `BaseTableComponent.dataSource` computed spreads this: `[...this.data()]` — sparse holes become explicit `undefined`
3. CDK virtual scroll viewport calculates its rendered range as `{start: 0, end: 59}` based on `itemSize=48` + `bufferSize=20` → `maxBufferPx = 48 × 20 × 2 = 1920px`
4. Mat-table slices `dataSource[0..58]` to render — items at indices 50–58 are `undefined`
5. `trackByFn(index, item)` calls `item.id` → **TypeError: Cannot read properties of undefined (reading 'id')**
6. Cascading errors: `ASSERTION ERROR: index`, `Cannot read properties of null (reading 'context')`
7. `_rowOutletViewContainer` ends up with 0 views — table shows only headers, no rows

## Evidence

### Console Errors (9 total on Dividend Deposits tab)

```
ERROR TypeError: Cannot read properties of undefined (reading 'id')
    at _MatTable.trackByFn [as _trackByFn]
    at DefaultIterableDiffer._trackByFn
    at DefaultIterableDiffer.check
    at DefaultIterableDiffer.diff
    at _MatTable.renderRows

ERROR ASSERTION ERROR: index [Expected=> 1 < 50 <=Actual]
    at _R3ViewContainerRef._adjustIndex
    at _R3ViewContainerRef.insertImpl

ERROR TypeError: Cannot read properties of null (reading 'context')
    at DefaultIterableDiffer.forEachIdentityChange
    at _MatTable.renderRows
```

### Live Inspection Data (Playwright MCP)

**Dividend Deposits (BROKEN):**

| Metric                    | Value                          |
| ------------------------- | ------------------------------ |
| Data items                | 336 (all valid, all have `id`) |
| CDK rendered range        | `{start: 0, end: 59}`          |
| Service visible range     | `{start: 0, end: 50}`          |
| Actual tbody rows         | **0**                          |
| Console errors            | **9**                          |
| `_renderRows`             | 59 (valid render row objects)  |
| `_rowOutletViewContainer` | **0** (no views created)       |
| `itemSize`                | 48                             |
| `bufferSize`              | 20                             |
| `maxBufferPx`             | 1920                           |

**Open Positions (WORKING):**

| Metric                | Value                 |
| --------------------- | --------------------- |
| Data items            | 95 (all valid)        |
| CDK rendered range    | `{start: 0, end: 38}` |
| Service visible range | `{start: 0, end: 50}` |
| Actual tbody rows     | **38**                |
| Console errors        | **0**                 |
| `itemSize`            | 52 (default)          |
| `bufferSize`          | 10 (default)          |
| `maxBufferPx`         | 1040                  |

### Why Open Positions and Sold Positions Work

Open Positions and Sold Positions use **default** `rowHeight` (52) and `bufferSize` (10), making `maxBufferPx = 1040px`. The CDK's initial rendered range end (38) stays **within** the service's initial visible window (50). All sliced items are defined, so `trackByFn` never sees `undefined`.

This is working **by luck**, not by design — all three services create sparse arrays the same way.

## Structural Comparison

### Template Differences

| Table             | filterRowTemplate     | Header Rows | rowHeight         | bufferSize        |
| ----------------- | --------------------- | ----------- | ----------------- | ----------------- |
| Open Positions    | ✅ Yes (search input) | 2           | 52 (default)      | 10 (default)      |
| Sold Positions    | ✅ Yes (search input) | 2           | 52 (default)      | 10 (default)      |
| Dividend Deposits | ❌ No                 | 1           | **48** (explicit) | **20** (explicit) |

### Service Sparse Array Pattern (identical in all three)

**Open Positions** (`open-positions-component.service.ts` lines 62–70):

```typescript
const openPositions = new Array<OpenPosition>(totalOpen);
const rangeEnd = Math.min(range.end, totalOpen);
for (let j = range.start; j < rangeEnd; j++) {
  openPositions[j] = this.transformTradeToPosition(trade, universe);
}
return openPositions;
```

**Sold Positions** (`sold-positions-component.service.ts` lines 56–66):

```typescript
const soldPositions = new Array<ClosedPosition>(totalSold);
const rangeEnd = Math.min(range.end, totalSold);
for (let j = range.start; j < rangeEnd; j++) {
  soldPositions[j] = {
    /* ... */
  };
}
```

**Dividend Deposits** (`dividend-deposits-component.service.ts` lines 57–68):

```typescript
const result: DividendRow[] = [];
result.length = totalLength;
for (let i = start; i < end; i++) {
  result[i] = {
    /* ... */
  };
}
return result;
```

All three create sparse arrays with only the visible range populated. The difference is that Dividend Deposits' explicit `bufferSize=20` makes the CDK's rendered range (59) exceed the initial visible window (50).

### CDK Buffer Calculation

```
CDK rendered items = ceil(viewport / itemSize) + ceil(maxBufferPx / itemSize)

Open Positions:  ceil(911/52) + ceil(1040/52) = 18 + 20 = 38  ← under 50 ✅
Sold Positions:  ceil(911/52) + ceil(1040/52) = 18 + 20 = 38  ← under 50 ✅
Dividend Dep:    ceil(911/48) + ceil(1920/48) = 19 + 40 = 59  ← OVER 50 ❌
```

## Proposed Fix (Story 18.2)

### Option A: Eliminate Sparse Arrays (Recommended)

Replace the sparse array optimization with full-array population in all three services. The per-item transform is cheap (object spread + map lookups), and 300–400 items is not large enough to justify the complexity and fragility of sparse arrays.

```typescript
// BEFORE (sparse — fragile)
const result: DividendRow[] = [];
result.length = totalLength;
for (let i = start; i < end; i++) {
  result[i] = {
    /* transform */
  };
}

// AFTER (dense — safe)
const result: DividendRow[] = [];
for (let i = 0; i < totalLength; i++) {
  const d = divDepositsArray[i];
  result.push({
    id: d.id,
    date: d.date,
    amount: d.amount,
    accountId: d.accountId,
    divDepositTypeId: d.divDepositTypeId,
    universeId: d.universeId,
    symbol: d.universeId !== null ? universeMap.get(d.universeId)?.symbol ?? '' : '',
    type: typeNamesMap.get(d.divDepositTypeId) ?? '',
  });
}
return result;
```

### Option B: Sync Initial visibleRange with CDK Buffer

Increase the initial `visibleRange.end` to match or exceed `maxBufferPx / itemSize + viewport / itemSize`:

```typescript
visibleRange = signal<{ start: number; end: number }>({
  start: 0,
  end: 100, // Increase from 50 to cover any realistic CDK buffer
});
```

### Option C: Defensive trackByFn

Handle `undefined` items in the base-table:

```typescript
trackByFn(index: number, item: T): string {
  return item?.id ?? `__empty_${index}`;
}
```

### Recommendation

**Option A** is the most robust fix. The sparse array optimization provides negligible performance benefit at current data volumes (< 500 rows) and introduces a latent bug in all three tables — Open/Sold Positions just happen to avoid it by luck due to smaller default buffer sizes.

Apply Option A to all three services simultaneously. Option C can be added as defense-in-depth.
