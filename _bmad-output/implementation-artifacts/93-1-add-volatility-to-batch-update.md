# Story 93.1: Add Volatility Recalculation to the Batch Field Update Pipeline

Status: Approved

## Story

As a developer,
I want `processUniverse` in `apps/server/src/app/routes/settings/update/index.ts` to call
`recalculateUniverseVolatility(universe.id, history)` using the dividend history already
fetched during the same pass,
So that every "Update Fields" run refreshes both the price/distribution data and the
volatility classification for all universe symbols.

## Acceptance Criteria

1. **Given** `processUniverse(universe, logger)` is called for a symbol with existing dividend
   history,
   **When** `getDistributions(universe.symbol)` returns a `history` array with at least one
   row,
   **Then** `recalculateUniverseVolatility(universe.id, history)` is called during the same
   processing pass, and the `volatility_long`, `volatility_short`, and
   `volatility_calculated_at` fields are updated in the database.

2. **Given** `getDistributions` returns an empty `history` array for a symbol,
   **When** `processUniverse` runs for that symbol,
   **Then** `recalculateUniverseVolatility` is still called with the empty array so that
   `volatility_long` and `volatility_short` are set to `'insufficient-history'`.

3. **Given** `recalculateUniverseVolatility` throws for a symbol,
   **When** the exception is caught in `processUniverse`,
   **Then** the symbol is marked as failed in the summary, and processing continues for the
   remaining symbols (same error-handling pattern as the existing price/distribution failure
   path).

4. **Given** the change is implemented with failing unit tests first (TDD),
   **When** `pnpm all` runs,
   **Then** all tests pass, including updated specs for `settings/update/index.ts`.

## Tasks / Subtasks

- [ ] Task 1: Write failing unit tests (TDD)
  - [ ] Open or create `apps/server/src/app/routes/settings/update/index.spec.ts`
  - [ ] Mock `recalculateUniverseVolatility` and assert it is called with `universe.id` and the history returned by the mocked `getDistributions`
  - [ ] Add test for empty history case
  - [ ] Add test for `recalculateUniverseVolatility` throwing (should not abort the batch)
  - [ ] Confirm tests fail (RED) before any implementation change

- [ ] Task 2: Modify `processUniverse` to call volatility recalculation
  - [ ] Refactor `checkForNewDistribution` to return `{ result, history }` instead of just `Distribution | null`
    (or inline the `getDistributions` call and extract `history` directly in `processUniverse`)
  - [ ] Add import: `recalculateUniverseVolatility` from `'../../../volatility/recalculate-universe-volatility.function'`
  - [ ] After updating the universe with price/distribution data, call `await recalculateUniverseVolatility(universe.id, history)`
    wrapped in try/catch that counts failures in the summary

- [ ] Task 3: Verify
  - [ ] Run `pnpm all` — confirm all tests pass
  - [ ] Confirm no additional `dividendhistory.net` calls per symbol (reuses `history` from existing call)

## Dev Notes

### File to Change

```
apps/server/src/app/routes/settings/update/index.ts
```

### Current `checkForNewDistribution` and `processUniverse`

```typescript
async function checkForNewDistribution(
  universe: ...
): Promise<Distribution | null> {
  const { result: newDistribution } = await getDistributions(universe.symbol);
  // ↑ history is DISCARDED here
  if (newDistribution === undefined) {
    return null;
  }
  return newDistribution;
}

async function processUniverse(universe, logger): Promise<{ success: boolean; error?: string }> {
  try {
    const lastPrice = await getLastPrice(universe.symbol);
    let distribution = getCurrentDistribution(universe);

    const newDistribution = await checkForNewDistribution(universe);
    if (newDistribution !== null) {
      distribution = newDistribution;
    }
    // ... updates price and distribution fields only
    // MISSING: recalculateUniverseVolatility call
  } catch (error) {
    // ... error handling
  }
}
```

### Target Refactor

The cleanest approach is to refactor `checkForNewDistribution` to return both `result` and
`history`:

```typescript
interface DistributionCheckResult {
  distribution: Distribution | null;
  history: ProcessedRow[];
}

async function checkForNewDistribution(
  universe: ...
): Promise<DistributionCheckResult> {
  const { result: newDistribution, history } = await getDistributions(universe.symbol);
  if (newDistribution === undefined) {
    return { distribution: null, history };
  }
  return { distribution: newDistribution, history };
}
```

Then in `processUniverse`, extract `history` and call volatility recalculation:

```typescript
const { distribution: newDistribution, history } = await checkForNewDistribution(universe);
if (newDistribution !== null) {
  distribution = newDistribution;
}

// ... update price and distribution ...

// NEW: recalculate volatility using the distribution history already fetched above
try {
  await recalculateUniverseVolatility(universe.id, history);
} catch (error) {
  // log and count as failure, but don't abort the batch
}
```

### Rate Limiting Note

`dividend-history.service.ts` enforces a 10-second minimum gap between requests. The batch
update already serialises per-symbol calls with `for...of` loops (not parallel), so the
volatility call does NOT require additional throttling. `recalculateUniverseVolatility` makes
no external HTTP calls — it only calls `calculateVolatility` (pure function) and writes to
the database.

### Key Imports Needed

```typescript
import { recalculateUniverseVolatility } from '../../../volatility/recalculate-universe-volatility.function';
import type { ProcessedRow } from '../../common/distribution-api.function';
```

### Test Scope

Unit tests only in this story. Existing `settings/update` E2E tests (from Epic 35 or Epic 71)
should continue to pass; no new E2E tests are required.

## Dev Agent Record

### Agent Notes

_To be filled in during implementation._

## File List

_To be populated during implementation._

## Change Log

_To be populated during implementation._
