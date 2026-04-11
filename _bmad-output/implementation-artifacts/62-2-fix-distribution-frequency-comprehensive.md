# Story 62.2: Implement Comprehensive Distribution Frequency Fix

Status: Approved

## Story

As a trader,
I want the system to correctly identify whether a newly-added symbol pays distributions annually,
quarterly, monthly, or weekly from the first day it is in my universe,
so that the annualised yield is accurate immediately and does not require a manual refresh cycle.

## Acceptance Criteria

1. **Given** a known monthly payer is added to the universe via the + button,
   **When** `getDistributions` resolves and the symbol record is stored,
   **Then** `distributions_per_year` equals 12.

2. **Given** a known weekly payer is added to the universe via the + button,
   **When** `getDistributions` resolves and the symbol record is stored,
   **Then** `distributions_per_year` equals 52.

3. **Given** a known quarterly payer is added to the universe via the + button,
   **When** `getDistributions` resolves and the symbol record is stored,
   **Then** `distributions_per_year` equals 4.

4. **Given** a known annual payer is added to the universe via the + button,
   **When** `getDistributions` resolves and the symbol record is stored,
   **Then** `distributions_per_year` equals 1.

5. **Given** the same symbol is also added via CSV import,
   **When** `getDistributions` resolves for that import path,
   **Then** `distributions_per_year` is set correctly for monthly and weekly payers (not defaulting
   to 1).

6. **Given** the failing unit tests from Story 62.1 are present,
   **When** the fix is applied and `pnpm all` runs,
   **Then** those tests pass green (the `test.fails()` wrappers are removed).

7. **Given** all changes are applied,
   **When** `pnpm all` runs,
   **Then** all tests pass with no regressions, including the existing Story 58.1/58.2 tests.

## Definition of Done

- [ ] Root cause from Story 62.1 addressed
- [ ] `fetchDividendHistory` (or its caller) updated to include future ex-date rows so that
      `calculateDistributionsPerYear` can use the future-rows fallback added in Story 58.2
- [ ] Unit tests added / updated for monthly, quarterly, weekly, and annual cadence with
      production-accurate sparse-history data (1 past row, no futures returned from service)
- [ ] Playwright MCP server confirms a known monthly payer (e.g. OXLC) receives
      `distributions_per_year = 12` after being added via the + button
- [ ] Failing tests from Story 62.1 pass green (remove `test.fails()` wrappers)
- [ ] `pnpm all` passes

## Tasks / Subtasks

- [ ] Task 1: Read Story 62.1 Dev Agent Record and confirm root cause (AC: #6)
  - [ ] Subtask 1.1: Read the completed `62-1-investigate-epic-58-fix-failure.md` Dev Agent Record
  - [ ] Subtask 1.2: Confirm the root cause: `fetchDividendHistory` filters out future rows before
        returning, so `calculateDistributionsPerYear` never receives them; a new symbol with 1 past
        row hits Path A (`rows.length <= 1 → return 1`) before the Story 58.2 future-rows fallback
        is reachable
  - [ ] Subtask 1.3: Confirm the two `test.fails()` regression tests from Story 62.1 are present
        in `get-distributions.function.spec.ts`

- [ ] Task 2: Implement the fix in `dividend-history.service.ts` (AC: #1, #2, #3, #4, #5)
  - [ ] Subtask 2.1: Read the full `fetchDividendHistory` implementation — locate the
        `.filter(function filterPastRows(row) { return isValidProcessedRow(row) && row.date <= today; })`
        predicate that strips future rows
  - [ ] Subtask 2.2: Change the filter to return ALL valid rows (past and future), or add a
        separate function `fetchAllDividendHistory` that does not apply the date filter, and update
        `getDistributions` to call it instead — choose whichever approach is less disruptive to
        callers outside `getDistributions`
  - [ ] Subtask 2.3: Verify `calculateDistributionsPerYear` already sorts `futureRows` ascending
        and takes the nearest 2 — confirm no further changes are needed there
  - [ ] Subtask 2.4: Ensure `findNextOrRecentDistribution` in `get-distributions.function.ts` still
        correctly picks a past row when available and falls back to the nearest future row — this
        logic already works correctly when future rows are present
  - [ ] Subtask 2.5: Confirm that `fetchDistributionData` (Yahoo Finance fallback, used when
        `fetchDividendHistory` returns empty) is not affected — it is a separate code path

- [ ] Task 3: Update unit tests (AC: #6, #7)
  - [ ] Subtask 3.1: Remove `test.fails()` wrappers from the two Story 62.1 regression tests —
        they should now pass green
  - [ ] Subtask 3.2: Update any existing Story 58.1/58.2 tests that mock `fetchDividendHistory`
        returning future rows — if the production function now returns future rows, the existing
        mocks may already be correct; verify each test still reflects its intended scenario
  - [ ] Subtask 3.3: Add a production-accurate test per cadence using `mockFetchDividendHistory`
        returning only 1 past row + several future rows (simulating real dividendhistory.net
        behaviour after the fix):
        - Monthly: 1 past + 4 future at ~30-day intervals → expect `distributions_per_year = 12`
        - Weekly: 1 past + 4 future at ~7-day intervals → expect `distributions_per_year = 52`
        - Quarterly: 1 past + 2 future at ~90-day intervals → expect `distributions_per_year = 4`
        - Annual: 1 past + 1 future at ~365-day interval → expect `distributions_per_year = 1`
  - [ ] Subtask 3.4: Add a regression-guard test for the case where `fetchDividendHistory`
        returns 2+ past rows with no future rows — confirm Path B still uses past-row interval
        correctly (no regression to pre-58.2 behaviour)
  - [ ] Subtask 3.5: Run `pnpm test` on `get-distributions.function.spec.ts` and confirm all
        tests pass

- [ ] Task 4: Validate end-to-end with Playwright MCP server (AC: #1, #2)
  - [ ] Subtask 4.1: Start the dev server (both Angular app and Fastify server)
  - [ ] Subtask 4.2: Add `OXLC` (known monthly payer) via the + button on the Universe screen
  - [ ] Subtask 4.3: Retrieve the universe record via the network response or API and confirm
        `distributions_per_year = 12`
  - [ ] Subtask 4.4: Add `MSTY` (known weekly payer) and confirm `distributions_per_year = 52`
  - [ ] Subtask 4.5: Remove the test symbols after verification
  - [ ] Subtask 4.6: Document the MCP server screenshots / API responses in Dev Agent Record

- [ ] Task 5: Run full test suite (AC: #7)
  - [ ] Subtask 5.1: Run `pnpm all` and confirm no regressions

## Dev Notes

### Key Files

| File | Purpose |
|------|---------|
| `apps/server/src/app/routes/common/dividend-history.service.ts` | **Primary fix target** — `fetchDividendHistory` date filter strips future rows |
| `apps/server/src/app/routes/settings/common/get-distributions.function.ts` | `calculateDistributionsPerYear` — contains Story 58.2 future-rows fallback — likely needs no change |
| `apps/server/src/app/routes/settings/common/get-distributions.function.spec.ts` | Unit tests — remove `test.fails()`, add new production-accurate tests |
| `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts` | Calls `fetchAndUpdatePriceData` for the + button add path |
| `apps/server/src/app/routes/universe/fetch-and-update-price-data.function.ts` | Calls `getDistributions(symbol)` — the final consumer of `distributions_per_year` |

### Architecture Context

The distribution pipeline is:

```
addSymbol() — + button path
  └─► fetchAndUpdatePriceData(id, symbol, fallbackRecord, 'manual symbol add')
        └─► Promise.all([getLastPrice(symbol), getDistributions(symbol)])
              └─► getDistributions(symbol)
                    ├─► fetchDividendHistory(symbol)   ← FIX HERE
                    │     current: filters row.date <= today → strips future rows
                    │     after fix: returns all valid rows (past + future)
                    └─► calculateDistributionsPerYear(rows, today)
                          Path A: rows.length <= 1 → return 1
                          Path B: recentRows.length <= 1 → futureRows fallback ← NOW REACHABLE
```

CSV import path also calls `fetchAndUpdatePriceData` (or an equivalent function) when a new
symbol row is encountered; confirm the call chain in the import route to ensure the fix covers
AC #5. Search for `getDistributions` callers beyond `fetch-and-update-price-data.function.ts`.

### Technical Guidance

**Root cause (confirmed by Story 62.1):**
`fetchDividendHistory` applies `.filter(row => row.date <= today)` before returning. This strips
future ex-dates. `getDistributions` forwards these past-only rows directly to
`calculateDistributionsPerYear`. For a new symbol with only 1 past ex-date, `rows.length === 1`
triggers the Path A early exit before the Story 58.2 future-rows fallback can run.

**Fix strategy — preferred approach:**

Remove or relax the date filter in `fetchDividendHistory`. The current implementation is:

```ts
// In dividend-history.service.ts (inside fetchDividendHistory)
const processed = rawRows
  .map(mapToProcessedRow)
  .filter(function filterPastRows(row: ProcessedRow): boolean {
    return isValidProcessedRow(row) && row.date <= today;   // ← REMOVE date cut-off
  })
  .sort(function sortByDate(a: ProcessedRow, b: ProcessedRow): number {
    return a.date.valueOf() - b.date.valueOf();
  });
```

Change to return all valid rows (past and future), sorted ascending:

```ts
const processed = rawRows
  .map(mapToProcessedRow)
  .filter(isValidProcessedRow)                              // ← drop date cut-off
  .sort(function sortByDate(a: ProcessedRow, b: ProcessedRow): number {
    return a.date.valueOf() - b.date.valueOf();
  });
```

`calculateDistributionsPerYear` already separates past from future rows internally — it handles
the classification correctly once future rows are present. `findNextOrRecentDistribution` already
handles future rows correctly (returns the nearest future row as the "next" distribution).

**Verify no unintended side effects:**
- `findNextOrRecentDistribution` — already returns the first future row or falls back to the last
  past row. Returning future rows from `fetchDividendHistory` means the `distribution` amount and
  `ex_date` on stored records will now reflect the **next upcoming** ex-date rather than the most
  recent past one. This is the correct and intended behaviour for "next distribution".
- Search for all callers of `fetchDividendHistory` to ensure none depend on past-only semantics.
  Run: `grep -r "fetchDividendHistory" apps/server/src` before finalising.

**Alternative approach (if modifying `fetchDividendHistory` has too many callers):**
Add a second function `fetchAllDividendHistory` that does not filter by date, and call it from
`getDistributions` only. The existing `fetchDividendHistory` callers continue unchanged.

### Interval classification thresholds (no change needed)

The `intervalToDistributionsPerYear` helper in `get-distributions.function.ts` uses:
- `<= 7` days → 52 (weekly)
- `> 27 && <= 45` days → 12 (monthly)
- `> 45 && <= 180` days → 4 (quarterly)
- `> 180` days → 1 (annual)

These thresholds are correct and should not be changed.

### Testing Standards

- Unit tests: Vitest co-located in `apps/server/src/app/routes/settings/common/`
- `globals: true` — no explicit vitest imports needed
- Named functions required for all callbacks
- Use `vi.useFakeTimers()` / `vi.setSystemTime()` to control `today` in tests
- `pnpm all` must pass

### Project Structure Notes

- `fetchDividendHistory` is in `apps/server/src/app/routes/common/dividend-history.service.ts`
  — note the `common/` path, not `settings/common/`
- `getDistributions` is in `apps/server/src/app/routes/settings/common/get-distributions.function.ts`
- Both files have 100% branch coverage enforced via Vitest threshold — any new branches added must
  be covered by tests
- Named functions for all callbacks — ESLint `@smarttools/no-anonymous-functions` is enforced

### References

- Source: `_bmad-output/planning-artifacts/epics-2026-04-10.md#Story 62.2`
- Prerequisite: `_bmad-output/implementation-artifacts/62-1-investigate-epic-58-fix-failure.md`
- Reference: `_bmad-output/implementation-artifacts/58-2-fix-distribution-frequency-new-symbols.md`

## Dev Agent Record

### Agent Model Used

_[to be filled by dev agent]_

### Debug Log References

### Completion Notes List

### File List
