# Story 84.1: Investigate Why Volatility Only Shows with Positions

Status: Approved

## Story

As a developer,
I want to identify the exact code path that prevents the volatility icon from rendering for
symbols without positions,
so that Story 84.2 can make a targeted, minimal fix with a clear pass/fail gate.

## Acceptance Criteria

1. **Given** the Playwright MCP server is connected to the live app (port 4201),
   **When** the developer navigates to the Universe screen and identifies symbols that have
   no open positions,
   **Then** the MCP server confirms that those symbols show empty or absent volatility icons
   while symbols with positions show icons — reproducing the bug.

2. **Given** the reproduction is confirmed,
   **When** the developer traces the Fastify route that serves Universe volatility data through
   to the Prisma query,
   **Then** the exact filter, join condition, or frontend logic that excludes non-position
   symbols is identified and documented in Dev Notes.

3. **Given** the root cause is documented,
   **When** the developer writes a Playwright E2E test that navigates to the Universe screen
   and asserts that a symbol known to have no positions still shows a non-empty volatility icon,
   **Then** the test currently **fails** (confirming the bug is captured).

4. **Given** the investigation is complete and the failing test is committed,
   **When** `pnpm all` is run,
   **Then** all previously passing tests continue to pass and the new test fails as expected.

## Tasks / Subtasks

- [ ] Task 1: Start the live app and reproduce the bug with Playwright MCP (AC: #1)
  - [ ] Start the dev server: `pnpm start:server` and `pnpm start:dms-material` (or
        `pnpm nx run dms-material:serve`) targeting port 4201
  - [ ] Open Playwright MCP server against `http://localhost:4201`
  - [ ] Navigate to Universe screen (`/global/universe`)
  - [ ] Identify at least one symbol that has no open positions (zero qty in Position column)
  - [ ] Confirm the Vol column for that symbol is empty (no icon)
  - [ ] Identify at least one symbol that has open positions — confirm Vol column shows an icon
  - [ ] Take a Playwright MCP snapshot and document both symbol names in Dev Agent Record

- [ ] Task 2: Trace the backend volatility query (AC: #2)
  - [ ] Read `apps/server/src/app/routes/universe/get-volatility/index.ts` — this is the
        `GET /api/universe/volatility` route
  - [ ] Read `apps/server/src/app/volatility/volatility-query.function.ts` —
        `fetchVolatilityForAllSymbols()`
  - [ ] Trace the Prisma query: it queries `divDeposits` where `universeId: { not: null }` and
        groups results by `universe.symbol`
  - [ ] Determine: does this query return symbols with distribution records but no positions?
        Or does it only return symbols linked via trades?
  - [ ] Read `prisma/schema.prisma` — check the `DivDeposits` model:
    - Does `universeId` reference the `universe` table directly?
    - Or is it populated only from import operations that also create trades?
  - [ ] Document the Prisma model relationships and the query scope in Dev Notes

- [ ] Task 3: Trace the frontend volatility data flow (AC: #2)
  - [ ] Read `apps/dms-material/src/app/global/global-universe/services/volatility-data.service.ts`
  - [ ] Determine: what URL does it call, and does it combine volatility data with position
        data in any way?
  - [ ] Read `apps/dms-material/src/app/global/global-universe/global-universe.component.ts` —
        find where `applyVolatility(enrichedData, volMap)` is called
  - [ ] Read the `applyVolatility` function — is it filtering or skipping symbols based on
        any condition?
  - [ ] Read the universe data model:
        `apps/dms-material/src/app/store/universe/universe.interface.ts`
  - [ ] Document: does the frontend Universe data payload include symbols with zero positions,
        or are those filtered out by the `POST /api/universe` endpoint?

- [ ] Task 4: Trace the main Universe API to check position filtering (AC: #2)
  - [ ] Read `apps/server/src/app/routes/universe/index.ts` — the `POST /` handler
  - [ ] Check if the Prisma query for universe data inner-joins trades or filters to only
        symbols with open positions
  - [ ] Check if `SmartNgRX` or the frontend store filters the universe list to only symbols
        with trades
  - [ ] Document the exact line/condition that causes the bug

- [ ] Task 5: Document the root cause in Dev Notes (AC: #2)
  - [ ] Write a clear, specific description of the root cause:
    - File name and line number
    - The exact filter/join/condition that excludes non-position symbols
    - Why it produces the observed behaviour
  - [ ] Include this in both Dev Notes of this story and in the "Root Cause" section of the
        Dev Agent Record for Story 84.2 to consume

- [ ] Task 6: Write a failing E2E test (AC: #3)
  - [ ] Identify a symbol known to have no positions but sufficient distribution history
        (use Playwright MCP to find such a symbol on the live app)
  - [ ] Create `apps/dms-material-e2e/src/volatility-visibility.spec.ts`
  - [ ] Write a test that:
    - Seeds (or uses existing) a symbol with distribution history and no open trades
    - Navigates to the Universe screen
    - Asserts that the Vol column for that symbol shows a non-empty icon
    - (This assertion should FAIL, confirming the bug)
  - [ ] Follow existing E2E patterns — see `apps/dms-material-e2e/src/vol-column.spec.ts`
        for structure (login helper, beforeAll seed, beforeEach navigate)
  - [ ] Mark the test with a comment: `// This test is expected to fail until Story 84.2 is complete`
  - [ ] Do NOT use `test.skip()` — the test must actively fail

- [ ] Task 7: Run `pnpm all` and verify baseline (AC: #4)
  - [ ] Run `pnpm all` from workspace root
  - [ ] Confirm all previously passing tests still pass
  - [ ] Confirm the new test in `volatility-visibility.spec.ts` fails as expected
  - [ ] Note: Playwright will report the new test as a failure — this is correct and expected

## Dev Notes

### Backend Volatility Query (as implemented in Epic 81)

The volatility endpoint is `GET /api/universe/volatility` registered in
`apps/server/src/app/routes/universe/get-volatility/index.ts`. It calls
`fetchVolatilityForAllSymbols()` from
`apps/server/src/app/volatility/volatility-query.function.ts`.

The query fetches `divDeposits` records:
```typescript
const allRecords = await prisma.divDeposits.findMany({
  where: {
    date: { gte: fiveYearsAgo },
    deletedAt: null,
    universeId: { not: null },
  },
  select: {
    amount: true,
    date: true,
    universe: { select: { symbol: true } },
  },
});
```

This returns all `divDeposits` records linked to any universe symbol. The **key question**:
how does `universeId` get populated on `divDeposits` records? If it is only populated when a
trade/CSV import occurs (i.e., when the user already has a position), then symbols added to
the universe without trading will have no `divDeposits` with `universeId` set, and will not
appear in the volatility results.

Check `prisma/schema.prisma` for the `DivDeposits` model's `universe` relation and for how
`universeId` gets set during screener sync vs. CSV import.

### Frontend Volatility Application

In `global-universe.component.ts`, the `applyVolatility` function is called on `enrichedData`.
Check:
1. Does `enrichedData` include all universe symbols (including those with zero position)?
2. Does `applyVolatility` skip symbols not present in the `volMap`?
3. Does the `volMap` only contain symbols that have divDeposit records?

### Existing E2E Test Reference

`apps/dms-material-e2e/src/vol-column.spec.ts` is the existing E2E test for the vol column.
Use the same helpers (`login`, `seedVolColumnE2eData`) as reference for the new failing test.

Key locator for Vol column icons:
```typescript
page.locator('td.mat-column-vol mat-icon')
// or via aria-label:
page.locator('[aria-label^="Volatility:"]')
```

### New E2E Test File

```typescript
// apps/dms-material-e2e/src/volatility-visibility.spec.ts
// This test is expected to FAIL until Story 84.2 is complete
import { expect, test } from 'playwright/test';
import { login } from './helpers/login.helper';

test.describe('Volatility visibility — symbols without positions', function describeVisibility() {
  test.beforeEach(async function navigateToUniverse({ page }) {
    await login(page);
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');
  });

  test(
    'symbol with no positions shows a volatility icon',
    async function symbolWithNoPositionShowsVolIcon({ page }) {
      // TODO (Story 84.1): replace SYMBOL_WITH_NO_POSITIONS with an actual symbol
      // confirmed via Playwright MCP to have no positions but sufficient distribution history
      const symbolWithNoPositions = 'SYMBOL_WITH_NO_POSITIONS';
      const searchInput = page.locator('input[placeholder="Search Symbol"]');
      await searchInput.fill(symbolWithNoPositions);
      await expect(
        page.locator('td.mat-column-vol mat-icon').first()
      ).toBeVisible({ timeout: 10_000 });
    }
  );
});
```

### Key Commands

```bash
# Start the dev stack for Playwright MCP investigation
pnpm nx run server:serve &
pnpm nx run dms-material:serve

# Run only the new failing test to confirm it fails
pnpm nx run dms-material-e2e:e2e -- --grep "symbol with no positions"

# Run full suite (new test should fail; everything else should pass)
pnpm all
```

### References

- [Source: apps/server/src/app/routes/universe/get-volatility/index.ts]
- [Source: apps/server/src/app/volatility/volatility-query.function.ts]
- [Source: apps/dms-material/src/app/global/global-universe/services/volatility-data.service.ts]
- [Source: apps/dms-material/src/app/global/global-universe/global-universe.component.ts]
- [Source: apps/dms-material-e2e/src/vol-column.spec.ts]
- [Source: prisma/schema.prisma]
- [Source: _bmad-output/planning-artifacts/epics-2026-04-23.md#story-841]
