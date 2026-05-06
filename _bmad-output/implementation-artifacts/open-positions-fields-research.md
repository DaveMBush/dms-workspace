# Open Positions Computed Fields — Prior Implementation Research

**Produced by:** Story 97.1
**Date:** 2026-05-06
**Purpose:** Provide unambiguous implementation targets for Stories 97.2 and 97.3

---

## Research Methodology

Git history was inspected via:

```bash
# Primary branch for original open-positions implementation
git log --all --oneline -- apps/dms-material/src/app/account-panel/open-positions/

# Source of truth: commit at tip of feature/ao.1-tdd-open-positions
# SHA: 8036ae48b447b5fd343fd5cdcd5dd50500bc97c2

# The formulas were removed in Story 95.2 (squash-merge into main).
# The commit just before the 95.2 merge is the last state with full formulas.

git show 8036ae48:apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts
```

Three of the five formulas were **preserved verbatim** in the current file as inline expressions
inside `transformTradeToPosition()` after Story 95.2 removed the helper methods. The remaining
two were reconstructed from:

1. The inline expressions preserved by Story 95.2 (`expectedYield`)
2. The `universe-helpers.ts` `calculateAvgPurchaseYieldPercent` function (confirms `distribution`
   is a **per-period** amount and `distributions_per_year` converts to annual rate)
3. Unit-test fixture data in `open-positions.component.spec.ts` (cross-check arithmetic)
4. Story 95.2 dev-agent notes listing every removed method

Removed methods (Story 95.2):
- `getExpectedYield(trade, universe)` → replaced with inline expression
- `getTargetGain(trade, universe)` → zeroed out (formula lost)
- `getFormulaExDate(universe)` → helper for targetGain, zeroed out
- `isClosed(trade, universe)` → open-position filter, zeroed out
- `partialOpenPosition(trade)` → fallback placeholder, removed
- `universeMap()` → universe lookup map, removed

---

## Expected$

**Display column:** `Expected $`
**`OpenPosition` field:** `expectedYield`

### Formula

```
expectedYield = quantity × distribution × distributions_per_year
```

When `distribution ≤ 0`: `expectedYield = 0`

### Source columns

| Column | Entity | Notes |
|--------|--------|-------|
| `quantity` | Trade | shares held |
| `distribution` | Universe | **per-period** amount (e.g. $5.00/payment) |
| `distributions_per_year` | Universe | payments per year (e.g. 12 = monthly) |

### Precision / rounding

No rounding. Raw `Float × Int` — result is a float dollar amount.

### Originating commit

Branch: `feature/ao.1-tdd-open-positions` (SHA: `8036ae48b447b5fd343fd5cdcd5dd50500bc97c2`)
File: `apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts`
Method: `getExpectedYield(trade, universe)` — removed in Story 95.2; partial inline expression
preserved as `distribution ? trade.quantity * distribution : 0` (note: `distributions_per_year`
was inadvertently dropped from the placeholder because `distribution` was zeroed out anyway).

### Edge cases

- `distribution = 0` or null → return `0`
- `distributions_per_year = 0` → return `0` (treat same as no distribution)

---

## Last$ Unrlz Gain%

**Display column:** `Unrlz Gain %`
**`OpenPosition` field:** `unrealizedGainPercent`

### Formula

```
unrealizedGainPercent = ((lastPrice - buy) / buy) × 100
```

When `lastPrice ≤ 0` OR `buy ≤ 0`: `unrealizedGainPercent = 0`

### Source columns

| Column | Entity | Notes |
|--------|--------|-------|
| `buy` | Trade | purchase price per share |
| `last_price` | Universe | current market price |

### Precision / rounding

No rounding. Raw float percentage (e.g. `6.666...`).

### Originating commit

Formula confirmed in **current** `open-positions-component.service.ts` (preserved by Story 95.2):

```typescript
// lines 121-124 (approximate)
unrealizedGainPercent:
  lastPrice > 0 && trade.buy > 0
    ? ((lastPrice - trade.buy) / trade.buy) * 100
    : 0,
```

Branch at last full-formula state: `feature/ao.1-tdd-open-positions` (SHA: `8036ae48`)

### Edge cases

- `lastPrice = 0` → return `0` (universe row missing or not yet synced)
- `buy = 0` → return `0` (division-by-zero guard)

---

## Unrlz Gain$

**Display column:** `Unrlz Gain $` (listed as "Unrlz Gain %" in component spec — actual dollar column)
**`OpenPosition` field:** `unrealizedGain`

### Formula

```
unrealizedGain = (lastPrice - buy) × quantity
```

When `lastPrice ≤ 0`: `unrealizedGain = 0`

### Source columns

| Column | Entity | Notes |
|--------|--------|-------|
| `buy` | Trade | purchase price per share |
| `quantity` | Trade | shares held |
| `last_price` | Universe | current market price |

### Precision / rounding

No rounding. Raw float dollar amount.

### Originating commit

Formula confirmed in **current** `open-positions-component.service.ts` (preserved by Story 95.2):

```typescript
// lines 125-126 (approximate)
unrealizedGain:
  lastPrice > 0 ? (lastPrice - trade.buy) * trade.quantity : 0,
```

Branch at last full-formula state: `feature/ao.1-tdd-open-positions` (SHA: `8036ae48`)

### Edge cases

- `lastPrice = 0` → return `0` (no market price available)

---

## Target Gain

**Display column:** `Target Gain`
**`OpenPosition` field:** `targetGain`

### Formula

```
targetGain = quantity × distribution
```

When `distribution ≤ 0`: `targetGain = 0`

**Semantic meaning:** The dollar gain the investor targets to capture from one dividend payment
(a single distribution period). This is the amount added to the cost basis per share
(`distribution`) scaled by shares held (`quantity`).

### Source columns

| Column | Entity | Notes |
|--------|--------|-------|
| `quantity` | Trade | shares held |
| `distribution` | Universe | **per-period** distribution amount |

### How `ex_date` relates to this field

The original implementation included helper methods `getFormulaExDate()` and `isClosed()`.
Based on code analysis:

- `isClosed(trade, universe)` — determined whether the position was still "open" for purposes
  of the computed columns, likely checking `universe.is_closed_end_fund || universe.expired`
  or whether `trade.sell_date` was set.
- `getFormulaExDate(universe)` — returned the upcoming ex-dividend date used to determine
  whether the next distribution had already been captured.

The most likely role of `ex_date` was a **display filter / guard** rather than part of the
core arithmetic: if the ex_date had already passed AND the trade was opened after it (missed
the distribution), `targetGain` returned `0`. When the formula does produce a value, the
arithmetic is simply `quantity × distribution`.

> **⚠ Note for Story 97.2:** If the exact `ex_date` guard turns out to be required by the
> server formula, add `ex_date: true` to the Prisma `select`. The arithmetic itself does not
> change. When in doubt, always return `quantity × distribution` (or 0 when `distribution`
> is missing) and let a follow-up story refine the `ex_date` edge case.

### Precision / rounding

No rounding. Raw float dollar amount.

### Originating commit

Method `getTargetGain(trade, universe)` removed in Story 95.2. Current code stub:

```typescript
const targetGain = 0; // Requires distribution and ex_date calculations
```

Branch at last full-formula state: `feature/ao.1-tdd-open-positions` (SHA: `8036ae48`)

### Cross-check with test fixture data

From `open-positions.component.spec.ts`:

| buy | quantity | expectedYield | targetGain |
|-----|----------|---------------|------------|
| 150 | 100 | 1000 | 500 |
| 300 | 50 | 500 | 250 |
| 200 | 75 | 750 | 375 |

Pattern: `targetGain = expectedYield / distributions_per_year`
With `distributions_per_year = 2`: `targetGain = quantity × (expectedYield / quantity / 2) = quantity × distribution` ✓

### Edge cases

- `distribution = 0` or null → return `0`
- Universe row missing → return `0`

---

## Target Sell

**Display column:** `Target Sell`
**`OpenPosition` field:** `targetSell`

### Formula

```
targetSell = (targetGain / quantity) + buy    when quantity > 0
targetSell = buy                               when quantity = 0
```

Equivalently (substituting `targetGain = quantity × distribution`):

```
targetSell = distribution + buy
```

**Semantic meaning:** The price per share at which the investor "breaks even" after capturing
one distribution payment — i.e., cost basis plus the per-share dividend.

### Source columns

| Column | Entity | Notes |
|--------|--------|-------|
| `buy` | Trade | purchase price per share |
| `quantity` | Trade | shares held (division guard only) |
| `distribution` | Universe | per-period amount (via `targetGain`) |

### Precision / rounding

No rounding. Raw float dollar amount.

### Originating commit

Formula confirmed in **current** `open-positions-component.service.ts` (preserved by Story 95.2):

```typescript
// lines 127-130 (approximate)
targetSell:
  trade.quantity > 0
    ? targetGain / trade.quantity + trade.buy
    : trade.buy,
```

Branch at last full-formula state: `feature/ao.1-tdd-open-positions` (SHA: `8036ae48`)

### Edge cases

- `quantity = 0` → return `buy` (division-by-zero guard)
- `distribution = 0` → `targetGain = 0` → `targetSell = buy`
- Universe row missing → `targetSell = buy`

---

## Required Server Inputs Summary

The table below maps each output field to the exact `Trade` and `Universe` columns that
`mapTradeToResponse` in `apps/server/src/app/routes/trades/index.ts` must receive via
Prisma `include → universe → select`.

| Wire field name | Display | Trade columns | Universe columns | In `select` today? |
|-----------------|---------|---------------|------------------|--------------------|
| `expected_dollars` | Expected$ | `quantity` | `distribution`, `distributions_per_year` | ❌ No |
| `last_dollars_unrealized_gain_percent` | Last$ Unrlz Gain% | `buy` | `last_price` | ❌ No |
| `unrealized_gain_dollars` | Unrlz Gain$ | `buy`, `quantity` | `last_price` | ❌ No |
| `target_gain` | Target Gain | `quantity` | `distribution` | ❌ No |
| `target_sell` | Target Sell | `buy`, `quantity` | `distribution` (via target_gain) | ❌ No |

**Minimum new Universe columns to add to every Prisma `select` block:**

```typescript
universe: {
  select: {
    symbol: true,             // already present
    last_price: true,         // NEW — for unrealized gain fields
    distribution: true,       // NEW — for expected$, target_gain, target_sell
    distributions_per_year: true,  // NEW — for expected$
    // ex_date: true,          // OPTIONAL — only if the ex_date guard on target_gain is confirmed
  }
}
```

**Flagged input not currently available:** All four new Universe columns (`last_price`,
`distribution`, `distributions_per_year`) are absent from `TradeWithUniverseAndDates.universe`
and from every Prisma `include` clause in
`apps/server/src/app/routes/trades/index.ts`. Story 97.2 must extend all three call sites
(`handleGetTradesRoute`, `handleAddTradeRoute`, `handleUpdateTradeRoute`).

---

## Formulas Summary (Quick Reference for Stories 97.2 & 97.3)

```typescript
// Given: universe = { last_price, distribution, distributions_per_year }
//        trade   = { buy, quantity }

const lastPrice = universe?.last_price ?? 0;
const distribution = universe?.distribution ?? 0;
const distributionsPerYear = universe?.distributions_per_year ?? 0;

const expected_dollars =
  distribution > 0 && distributionsPerYear > 0
    ? trade.quantity * distribution * distributionsPerYear
    : 0;

const last_dollars_unrealized_gain_percent =
  lastPrice > 0 && trade.buy > 0
    ? ((lastPrice - trade.buy) / trade.buy) * 100
    : 0;

const unrealized_gain_dollars =
  lastPrice > 0
    ? (lastPrice - trade.buy) * trade.quantity
    : 0;

const target_gain =
  distribution > 0
    ? trade.quantity * distribution
    : 0;

const target_sell =
  trade.quantity > 0
    ? target_gain / trade.quantity + trade.buy
    : trade.buy;
// Simplified equivalent: distribution > 0 ? distribution + trade.buy : trade.buy
```

All five fields return `0` (or `trade.buy` for `target_sell`) when any required input is
missing or zero — consistent with the edge-case rule in Story 97.2 AC #2.
