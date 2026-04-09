# Story 58.1: Investigate Distribution History Fetch for New Symbols

Status: Approved

## Story

As a developer,
I want a clear picture of what `fetchDividendHistory` returns for a freshly-added symbol and why
`distributions_per_year` defaults to 1,
so that I can design a targeted fix without guessing.

## Acceptance Criteria

1. **Given** the investigation is complete,
   **When** the developer documents findings in the Dev Agent Record,
   **Then** the report includes: the number and date distribution of rows returned by
   `fetchDividendHistory` for at least one monthly and one weekly payer, and exactly which branch of
   `calculateDistributionsPerYear` is reached.

2. **Given** the investigation identifies the root cause,
   **When** the developer writes a failing unit test that replicates the bad state (e.g. only 1
   past row returned),
   **Then** the test asserts a non-default `distributions_per_year` value (12 for monthly, 52 for
   weekly) and currently **FAILS** (confirming the bug).

3. **Given** all other existing tests are unmodified,
   **When** `pnpm all` runs,
   **Then** all previously passing tests continue to pass.

## Definition of Done

- [ ] Developer runs `fetchDividendHistory` against at least one live ticker (or mocked response) and records the row count and date range
- [ ] Root cause documented in Dev Agent Record (which code path yields `distributions_per_year = 1`)
- [ ] Failing unit test added to `get-distributions.function.spec.ts` demonstrating the incorrect default
- [ ] No production code changed in this story
- [ ] `pnpm all` passes

## Tasks / Subtasks

- [ ] **Task 1: Read the distribution fetch pipeline end-to-end**
  - [ ] Read `apps/server/src/app/routes/settings/common/get-distributions.function.ts` — focus on `calculateDistributionsPerYear` logic
  - [ ] Read `apps/server/src/app/routes/common/dividend-history.service.ts` — understand what `fetchDividendHistory` fetches and filters
  - [ ] Read `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts` — confirm `getDistributions` is called on symbol add
  - [ ] Note the `filterPastRows` logic in `dividend-history.service.ts` — how many past rows it retains

- [ ] **Task 2: Trace the sparse-history branch**
  - [ ] Identify the condition in `calculateDistributionsPerYear` that triggers when `recentRows.length <= 1`
  - [ ] Add a log statement or write a throwaway test to observe what `rows` looks like for a monthly payer with few past entries
  - [ ] Confirm whether the `fetchDividendHistory` HTML scrape returns future ex-dates before past dates

- [ ] **Task 3: Write the failing unit test**
  - [ ] In `get-distributions.function.spec.ts`, add a test case where `mockFetchDividendHistory` returns exactly 1 past row and several future rows for a monthly payer
  - [ ] Assert `distributions_per_year` equals 12 — test should currently fail (it will return 1)
  - [ ] Add a similar test for a weekly payer (1 past row + future rows → expect 52)

- [ ] **Task 4: Document findings**
  - [ ] Fill in the Dev Agent Record section with: root cause, affected code path, and proposed approach for Story 58.2

## Dev Notes

### Key Files

| File | Purpose |
| ---- | ------- |
| `apps/server/src/app/routes/settings/common/get-distributions.function.ts` | Main distribution fetch + frequency calculation |
| `apps/server/src/app/routes/common/dividend-history.service.ts` | Fetches raw rows from dividendhistory.net |
| `apps/server/src/app/routes/settings/common/get-distributions.function.spec.ts` | Unit test file — add failing tests here |
| `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts` | Calls `getDistributions` for newly-added symbols |
| `apps/server/src/app/routes/universe/fetch-and-update-price-data.function.ts` | Also calls `getDistributions` during sync |

### Key Logic in `calculateDistributionsPerYear`

```ts
const recentRows = rows
  .filter(row => row.date < today)
  .slice(-2); // Uses last 2 past distributions

if (recentRows.length <= 1) {
  return 1; // ← This is the bug path
}
```

The function only uses the last 2 **past** rows. If dividendhistory.net returns rows where most
dates are in the future (common for a new symbol with a clean record), `recentRows` will have 0 or
1 entries and the function returns 1 regardless of actual cadence.

### Approach for Story 58.2

Once confirmed, the fix is likely one of:
1. Use future ex-dates to infer cadence when past data is sparse
2. Use all rows (past + future) for the interval calculation
3. Increase the history lookback window on the scrape source

## Dev Agent Record

_To be filled in by the implementing agent._
