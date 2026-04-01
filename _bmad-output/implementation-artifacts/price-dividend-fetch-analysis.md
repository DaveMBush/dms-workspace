# Price/Dividend Fetch Entry Points — Analysis

Produced by Story 35.1. All file paths are relative to the repository root unless noted otherwise.

---

## 1. The "Update Fields" Flow

### Route

| Item | Value |
|---|---|
| HTTP method | `GET` |
| URL | `/api/settings/update` |
| Route registration | `apps/server/src/app/routes/settings/update/index.ts` → `handleUpdateRoute` |

### Call chain

```
handleUpdateRequest                              (route handler)
  └─ updateAllUniverses(logger)
       └─ processUniverse(universe, logger)      (loop over prisma.universe.findMany)
            ├─ getLastPrice(universe.symbol)     ← price fetch
            ├─ checkForNewDistribution(universe)
            │     └─ getDistributions(universe.symbol)  ← dividend fetch
            ├─ updateUniverseWithDistribution(…) ← if ex_date advanced
            └─ updateUniverseWithoutDistribution(…) ← price-only update
```

---

## 2. Price Fetch Function

**Function:** `getLastPrice`  
**Signature:** `async function getLastPrice(symbol: string, retryCount: number = 0): Promise<number | undefined>`  
**File:** `apps/server/src/app/routes/settings/common/get-last-price.function.ts`

**Behaviour:**
- Calls `yahooFinance.quote(symbol)` (instance from `apps/server/src/app/routes/settings/yahoo-finance.instance.ts`)
- Returns `quote.regularMarketPrice` (current market price)
- Retries up to 3 times with a 1-second sleep between each attempt
- Returns `undefined` if all retries fail

---

## 3. Dividend/Distribution Fetch Function

**Function:** `getDistributions`  
**Signature:** `async function getDistributions(symbol: string): Promise<DistributionResult | undefined>`  
**File:** `apps/server/src/app/routes/settings/common/get-distributions.function.ts`

**Return type:**
```ts
interface DistributionResult {
  distribution: number;          // per-distribution dollar amount
  ex_date: Date;                 // next or most recent ex-dividend date
  distributions_per_year: number;
}
```

**Behaviour:**
1. Calls `fetchDividendHistory(symbol)` from `apps/server/src/app/routes/common/dividend-history.service.ts`
   - Fetches HTML from `https://dividendhistory.org/payout/{TICKER}/`
   - Extracts JSON from `<script data-dividend-chart-json>` tag
   - Returns sorted `ProcessedRow[]` of `{ amount, date }`
2. If `dividendhistory.org` returns no rows, falls back to `fetchDistributionData(symbol)` from `apps/server/src/app/routes/common/distribution-api.function.ts`
   - Calls `yahooFinance.chart(symbol, { period1, period2, events: 'dividends' })` for historical data
   - Calls `yahooFinance.quoteSummary(symbol, { modules: ['summaryDetail', 'defaultKeyStatistics', 'calendarEvents'] })` for upcoming dividends
   - Merges and deduplicates historical + future dividend rows
3. Returns `undefined` if no data is found; returns a zero-filled `DistributionResult` on unexpected errors

---

## 4. Prisma Model Fields Written

Prisma model: `universe` (`prisma/schema.prisma`)

| Field | Type | Written by |
|---|---|---|
| `last_price` | `Float` | `getLastPrice` result (defaults to `0` when `undefined`) |
| `distribution` | `Float` | `getDistributions().distribution` |
| `distributions_per_year` | `Int` | `getDistributions().distributions_per_year` |
| `ex_date` | `DateTime?` | `getDistributions().ex_date` |

The "Update Fields" route writes these fields via `prisma.universe.update` in two helpers:

- `updateUniverseWithDistribution` — writes all four fields (when `ex_date` advances)  
  File: `apps/server/src/app/routes/settings/update/index.ts` (lines ~50–67)
- `updateUniverseWithoutDistribution` — writes `last_price` only  
  File: `apps/server/src/app/routes/settings/update/index.ts` (lines ~69–80)

---

## 5. Current Call Sites

### 5a. Manual Symbol Add (Angular UI → API)

**UI trigger:** `AddSymbolDialogComponent.addSymbolToUniverse(symbol, riskGroupId)`  
File: `apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts`

**Store effect:** `UniverseEffectService.add(row)`  
File: `apps/dms-material/src/app/store/universe/universe-effect.service.ts`  
→ calls `POST /api/universe/add`

**Server route handler:** `handleAddUniverseRoute` at `POST /api/universe/add`  
File: `apps/server/src/app/routes/universe/index.ts`  
→ delegates to `addSymbol({ symbol, risk_group_id })`

**Implementation:** `addSymbol` function  
File: `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts`  

```ts
const [lastPrice, distributionData] = await Promise.all([
  getLastPrice(upperSymbol),
  getDistributions(upperSymbol),
]);
await prisma.universe.create({ data: { ..., last_price, distribution, ... } });
```

**Status: price + dividend fetched immediately on add. ✅**

---

### 5b. Fidelity CSV Import / CUSIP Resolution

**Entry point:** `importFidelityTransactions(csvContent)`  
File: `apps/server/src/app/routes/import/fidelity-import-service.function.ts`  
→ called from `POST /api/import` (route in `apps/server/src/app/routes/import/index.ts`)

**CUSIP resolution step:** `resolveCusipSymbols(rows)`  
File: `apps/server/src/app/routes/import/resolve-cusip.function.ts`  

Resolution strategy (no price/dividend fetch here):
1. Cache lookup via `cusipCacheService.findManyCusips`
2. `resolveCusipViaThirteenf(cusip)` from `apps/server/src/utils/thirteenf-cusip.service.ts` (calls `13f.info`)
3. Yahoo Finance `yahooFinance.search(description)` fallback  

After CUSIP resolution, `mapFidelityTransactions(rows)` maps rows to internal structures. For BUY transactions, `resolveSymbol(symbol, createIfNotFound=true)` is called:

**Auto-create path:** `resolveSymbol` in `fidelity-data-mapper.function.ts` (lines ~66–90)

```ts
const newUniverse = await prisma.universe.create({
  data: {
    symbol,
    risk_group_id: defaultRiskGroup.id,
    last_price: 0,            // ← hardcoded zero
    distribution: 0,          // ← hardcoded zero
    distributions_per_year: 0, // ← hardcoded zero
    ex_date: null,            // ← null
    ...
  },
});
```

**Status: price and dividend are NOT fetched during CSV import. Record created with zeros. ❌ Gap identified.**

---

### 5c. Bulk Settings Save (`POST /api/settings`)

**Route handler:** `handleSettingsRoute` at `POST /api/settings`  
File: `apps/server/src/app/routes/settings/index.ts`  
→ calls `processAllSymbolGroups` → `processSymbolGroup` → `addOrUpdateSymbol(symbol, riskGroupId)`

**`addOrUpdateSymbol`** (file: `apps/server/src/app/routes/settings/index.ts`, line ~138):

```ts
const lastPrice = await getLastPrice(symbol);
const distribution = await getDistributions(symbol);
```

Creates or updates the `universe` record with fetched values.

**Status: price + dividend fetched. ✅**

---

### 5d. Sync from Screener (`PUT /api/universe/sync-from-screener`)

**Route handler:** `apps/server/src/app/routes/universe/sync-from-screener/index.ts`  
→ For each symbol, calls `upsertUniverse({ symbol, riskGroupId })` which calls both:

```ts
const lastPrice = await getLastPrice(symbol);
const distribution = await getDistributions(symbol);
```

**Status: price + dividend fetched. ✅**

---

## 6. Recommended Integration Approach

The two canonical fetch functions are:

```ts
// File: apps/server/src/app/routes/settings/common/get-last-price.function.ts
getLastPrice(symbol: string): Promise<number | undefined>

// File: apps/server/src/app/routes/settings/common/get-distributions.function.ts
getDistributions(symbol: string): Promise<DistributionResult | undefined>
```

Both are already imported and used identically in:
- `apps/server/src/app/routes/settings/update/index.ts`
- `apps/server/src/app/routes/settings/index.ts`
- `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts`
- `apps/server/src/app/routes/universe/sync-from-screener/index.ts`

### For Story 35.2 — Symbol add during CSV import

**Integration point:** `resolveSymbol` in `apps/server/src/app/routes/import/fidelity-data-mapper.function.ts`

After `prisma.universe.create`, import and call both fetch functions via `Promise.all`, then `prisma.universe.update`:

```ts
import { getLastPrice } from '../settings/common/get-last-price.function';
import { getDistributions } from '../settings/common/get-distributions.function';

// after prisma.universe.create:
const [lastPrice, distribution] = await Promise.all([
  getLastPrice(symbol),
  getDistributions(symbol),
]);
if (lastPrice !== undefined || distribution !== undefined) {
  await prisma.universe.update({
    where: { id: newUniverse.id },
    data: {
      last_price: lastPrice ?? 0,
      distribution: distribution?.distribution ?? 0,
      distributions_per_year: distribution?.distributions_per_year ?? 0,
      ex_date: distribution?.ex_date ?? null,
    },
  });
}
```

No new abstraction layer is needed. The existing functions are idiomatic, rate-limited, and handle retries/errors internally.

### For Story 35.3 — CUSIP resolution

CUSIP resolution (`resolveCusipSymbols`) only maps CUSIP → ticker symbol; it does not create universe records. Universe auto-creation occurs later in `resolveSymbol` (same as Story 35.2). Therefore, the integration point for Story 35.3 is also `resolveSymbol` — apply the same pattern as Story 35.2.

---

## 7. File Reference Summary

| Purpose | File |
|---|---|
| "Update Fields" route handler | `apps/server/src/app/routes/settings/update/index.ts` |
| Price fetch function | `apps/server/src/app/routes/settings/common/get-last-price.function.ts` |
| Dividend/distribution fetch function | `apps/server/src/app/routes/settings/common/get-distributions.function.ts` |
| Primary distribution data source (dividendhistory.org) | `apps/server/src/app/routes/common/dividend-history.service.ts` |
| Fallback distribution data source (Yahoo Finance) | `apps/server/src/app/routes/common/distribution-api.function.ts` |
| Yahoo Finance instance | `apps/server/src/app/routes/settings/yahoo-finance.instance.ts` |
| Manual add-symbol function | `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts` |
| Manual add-symbol route handler | `apps/server/src/app/routes/universe/index.ts` → `handleAddUniverseRoute` |
| Angular add-symbol dialog | `apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts` |
| Angular universe store effect | `apps/dms-material/src/app/store/universe/universe-effect.service.ts` |
| Settings bulk-add route handler | `apps/server/src/app/routes/settings/index.ts` → `addOrUpdateSymbol` |
| CUSIP resolution function | `apps/server/src/app/routes/import/resolve-cusip.function.ts` → `resolveCusipSymbols` |
| Import auto-create (gap) | `apps/server/src/app/routes/import/fidelity-data-mapper.function.ts` → `resolveSymbol` |
| Sync from screener route handler | `apps/server/src/app/routes/universe/sync-from-screener/index.ts` |
| Prisma Universe model | `prisma/schema.prisma` → `model universe` |
| "Update Fields" Angular service | `apps/dms-material/src/app/shared/services/update-universe-fields.service.ts` |
