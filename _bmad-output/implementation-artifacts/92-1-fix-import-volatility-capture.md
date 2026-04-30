# Story 92.1: Fix CUSIP Resolution Import Path to Capture Volatility

Status: Approved

## Story

As a developer,
I want `createUniverseEntry` in `create-universe-entry.helper.ts` to call
`recalculateUniverseVolatility` with the full dividend history after creating a universe
record via CSV import,
So that symbols added through the Fidelity import pipeline have volatility data from day one
without requiring a subsequent batch field update.

## Acceptance Criteria

1. **Given** `createUniverseEntry(symbol, riskGroupId, isCef)` is called from the CSV import
   pipeline,
   **When** the function completes successfully,
   **Then** `prisma.universe.findUnique(entry.id)` returns a record where `volatility_long`
   and `volatility_short` are non-null (they may be `'insufficient-history'` if dividend
   history is unavailable, but the fields must have been written).

2. **Given** `getDistributions(symbol)` returns a non-empty `history` array,
   **When** `createUniverseEntry` runs,
   **Then** `recalculateUniverseVolatility` is called exactly once with `entry.id` and the
   full `history` array — matching the pattern used in `add-symbol.function.ts`.

3. **Given** `getDistributions(symbol)` returns an empty `history` array,
   **When** `createUniverseEntry` runs,
   **Then** `recalculateUniverseVolatility` is still called with the empty history so the
   volatility fields are set to `'insufficient-history'`, and the function does not throw.

4. **Given** the change is implemented with failing unit tests first (TDD),
   **When** `pnpm all` runs,
   **Then** all tests pass, including updated specs for `create-universe-entry.helper.ts`.

5. **Given** the updated `createUniverseEntry` now calls `getDistributions` before calling
   `fetchAndUpdatePriceData`,
   **When** it supplies the prefetched outcome as `prefetchedDistributionOutcome`,
   **Then** `getDistributions` is called at most once per symbol during import (no duplicate
   dividendhistory.net requests).

## Tasks / Subtasks

- [ ] Task 1: Write failing unit tests (TDD)
  - [ ] Open or create `apps/server/src/app/routes/import/create-universe-entry.helper.spec.ts`
  - [ ] Mock `getDistributions` to return non-empty history and assert that `recalculateUniverseVolatility` is called with the entry id and that history
  - [ ] Mock `getDistributions` to return empty history and assert `recalculateUniverseVolatility` is still called
  - [ ] Confirm tests fail (RED) before any implementation change

- [ ] Task 2: Refactor `createUniverseEntry` to capture volatility
  - [ ] Add imports: `getDistributions` from `'../settings/common/get-distributions.function'` and `recalculateUniverseVolatility` from `'../../volatility/recalculate-universe-volatility.function'`
  - [ ] Call `getDistributions(symbol)` before `fetchAndUpdatePriceData` to get `{ result, history }`
  - [ ] Call `recalculateUniverseVolatility(entry.id, outcome.history)` (wrapped in try/catch, matching the pattern in `add-symbol.function.ts`)
  - [ ] Pass `prefetchedDistributionOutcome: outcome` to `fetchAndUpdatePriceData` so `getDistributions` is not called twice

- [ ] Task 3: Verify
  - [ ] Run `pnpm all` — confirm all tests pass
  - [ ] Confirm no extra calls to `dividendhistory.net` per symbol

## Dev Notes

### Files to Change

```
apps/server/src/app/routes/import/create-universe-entry.helper.ts
```

### Current Implementation

```typescript
import { logger } from '../../../utils/structured-logger';
import { prisma } from '../../prisma/prisma-client';
import { fetchAndUpdatePriceData } from '../universe/fetch-and-update-price-data.function';

export async function createUniverseEntry(
  symbol: string,
  riskGroupId: string,
  isCef: boolean
): Promise<{ id: string }> {
  const entry = await prisma.universe.create({
    data: {
      symbol,
      risk_group_id: riskGroupId,
      last_price: 0,
      distribution: 0,
      distributions_per_year: 0,
      ex_date: null,
      most_recent_sell_date: null,
      expired: false,
      is_closed_end_fund: isCef,
    },
  });
  try {
    await fetchAndUpdatePriceData(entry.id, symbol, entry, {
      logContext: 'CUSIP resolution',
    });
  } catch (error) {
    logger.warn(
      'Unexpected error during price/dividend fetch after CUSIP resolution',
      {
        symbol,
        error: error instanceof Error ? error.message : String(error),
      }
    );
  }
  return entry;
}
```

### Target Implementation Pattern

The fix should mirror the pattern already established in
`apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts`:

```typescript
import { logger } from '../../../utils/structured-logger';
import { prisma } from '../../prisma/prisma-client';
import { getDistributions } from '../settings/common/get-distributions.function';
import { fetchAndUpdatePriceData } from '../universe/fetch-and-update-price-data.function';
import { recalculateUniverseVolatility } from '../../volatility/recalculate-universe-volatility.function';

export async function createUniverseEntry(
  symbol: string,
  riskGroupId: string,
  isCef: boolean
): Promise<{ id: string }> {
  const entry = await prisma.universe.create({
    data: {
      symbol,
      risk_group_id: riskGroupId,
      last_price: 0,
      distribution: 0,
      distributions_per_year: 0,
      ex_date: null,
      most_recent_sell_date: null,
      expired: false,
      is_closed_end_fund: isCef,
    },
  });

  // Step 1: Fetch distribution history
  let outcome: Awaited<ReturnType<typeof getDistributions>>;
  try {
    outcome = await getDistributions(symbol);
  } catch (error) {
    logger.warn('Dividend history fetch failed during CUSIP resolution', {
      symbol,
      error: error instanceof Error ? error.message : String(error),
    });
    outcome = { result: undefined, history: [] };
  }

  // Step 2: Recalculate volatility with full history
  try {
    await recalculateUniverseVolatility(entry.id, outcome.history);
  } catch (error) {
    logger.warn('Volatility recalculation failed during CUSIP resolution', {
      symbol,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Step 3: Update price and distribution (reuse prefetched outcome, no second API call)
  try {
    await fetchAndUpdatePriceData(entry.id, symbol, entry, {
      logContext: 'CUSIP resolution',
      prefetchedDistributionOutcome: outcome,
    });
  } catch (error) {
    logger.warn(
      'Unexpected error during price/dividend fetch after CUSIP resolution',
      {
        symbol,
        error: error instanceof Error ? error.message : String(error),
      }
    );
  }

  return entry;
}
```

### Why The Fix Is Needed

The manual add-symbol path (`add-symbol.function.ts`) already calls
`recalculateUniverseVolatility` via its `fetchDistributionsAndRecalculate` helper. However,
`create-universe-entry.helper.ts` (used for CSV/CUSIP import) calls `fetchAndUpdatePriceData`
directly without first capturing the distribution history or calling
`recalculateUniverseVolatility`. The result is that all symbols added via Fidelity CSV import
have `volatility_long: null`, `volatility_short: null`, and `volatility_calculated_at: null`
until a subsequent "Update Fields" batch run.

### Key Functions

- `getDistributions(symbol)` — `apps/server/src/app/routes/settings/common/get-distributions.function.ts`
  returns `{ result: DistributionResult | undefined, history: ProcessedRow[] }`
- `recalculateUniverseVolatility(universeId, history)` — `apps/server/src/app/volatility/recalculate-universe-volatility.function.ts`
  writes `volatility_long`, `volatility_short`, `volatility_calculated_at` to the universe record
- `fetchAndUpdatePriceData` accepts `options.prefetchedDistributionOutcome` to avoid a second
  call to `getDistributions`

### Test Scope

Unit tests only in this story. Playwright E2E regression test is added in Story 92.2.

## Dev Agent Record

### Agent Notes

_To be filled in during implementation._

## File List

_To be populated during implementation._

## Change Log

_To be populated during implementation._
