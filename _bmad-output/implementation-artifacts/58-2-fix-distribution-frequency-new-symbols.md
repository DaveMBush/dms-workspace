# Story 58.2: Fix Distribution Frequency Detection for New Symbols

Status: Done

## Story

As a trader,
I want the system to correctly identify whether a newly-added symbol pays distributions annually,
quarterly, monthly, or weekly,
so that the annualised yield is calculated correctly from the first day the symbol is in my
universe.

## Acceptance Criteria

1. **Given** `fetchDividendHistory` returns fewer than 2 past distribution rows for a symbol,
   **When** `calculateDistributionsPerYear` (or a replacement strategy) runs,
   **Then** it uses additional heuristics (e.g. evaluating the interval between upcoming ex-dates,
   or combining past and future rows for the interval calculation) rather than defaulting to 1.

2. **Given** a known monthly payer is re-added after its history is cleared,
   **When** `getDistributions` resolves,
   **Then** `distributions_per_year` is 12 (not 1).

3. **Given** a known weekly payer is re-added,
   **When** `getDistributions` resolves,
   **Then** `distributions_per_year` is 52 (not 1).

4. **Given** the failing unit test from Story 58.1 is present,
   **When** the fix is applied and `pnpm all` runs,
   **Then** that test passes green.

5. **Given** all changes are applied,
   **When** `pnpm all` runs,
   **Then** all tests pass with no regressions.

## Definition of Done

- [x] Root cause from Story 58.1 is addressed
- [x] `calculateDistributionsPerYear` (or its caller) extended to handle the sparse-history case
- [x] Unit tests updated / added for monthly, quarterly, weekly, and annual cadence with sparse initial data (fewer than 2 past rows)
- [x] Failing tests from Story 58.1 are now green
- [x] `pnpm all` passes

## Tasks / Subtasks

- [x] **Task 1: Read Story 58.1 Dev Agent Record**
  - [x] Confirm the root cause identified in Task 4 of Story 58.1
  - [x] Confirm the proposed fix approach from Story 58.1

- [x] **Task 2: Implement the frequency-detection fix**
  - [x] Modify `calculateDistributionsPerYear` in `get-distributions.function.ts` to fall back to
        future ex-date intervals when fewer than 2 past rows are available
  - [x] Ensure the fix does not change behaviour when 2+ past rows are present

- [x] **Task 3: Update / add unit tests**
  - [x] Convert the failing tests from Story 58.1 to green by verifying against the fix
  - [x] Add tests covering: monthly payer with 0 past rows, weekly payer with 1 past row, quarterly
        payer with 1 past row, annual payer with 0 past rows
  - [x] Confirm all previously passing tests still pass

- [x] **Task 4: Validate end-to-end (optional)**
  - [x] If practical, run `fetchDividendHistory` for a real monthly payer and confirm
        `distributions_per_year` resolves to 12

## Dev Notes

### Key Files

| File | Purpose |
| ---- | ------- |
| `apps/server/src/app/routes/settings/common/get-distributions.function.ts` | Implement fix here |
| `apps/server/src/app/routes/common/dividend-history.service.ts` | Source of `ProcessedRow[]` |
| `apps/server/src/app/routes/settings/common/get-distributions.function.spec.ts` | Update tests here |

### Current Algorithm (to be extended)

```ts
const recentRows = rows
  .filter(row => row.date < today)
  .slice(-2);

if (recentRows.length <= 1) {
  return 1; // ← Fix required here: use future rows as fallback
}
```

### Sparse-history fix strategy

When `recentRows.length <= 1`, fall back to the nearest 2 upcoming future rows (dates ≥ today)
and use their interval in the same interval-to-frequency lookup. This avoids a silent default of
annual and works correctly for symbols where distributions are primarily announced in advance.

## Dev Agent Record

### Changes Made

**`apps/server/src/app/routes/settings/common/get-distributions.function.ts`**

- Extracted interval-to-frequency mapping into a new `intervalToDistributionsPerYear(daysBetween)` helper function, shared by both the past-row and future-row code paths.
- Updated the threshold for quarterly detection from `> 45` (unbounded) to `> 45 && <= 180` to allow annual distributions (365-day intervals) to be correctly classified.
- In `calculateDistributionsPerYear`, replaced the `recentRows.length <= 1 → return 1` early exit with a fallback that:
  1. Filters rows to future ex-dates (date >= today)
  2. Sorts ascending and takes the 2 nearest
  3. Computes the interval between them
  4. Passes that interval through `intervalToDistributionsPerYear`
  5. Falls back to 1 only when fewer than 2 future rows exist

**`apps/server/src/app/routes/settings/common/get-distributions.function.spec.ts`**

- Removed `test.fails()` wrappers from the two 58-1 regression tests; both now pass green.
- Added 6 new tests covering all cadences with sparse history (0 or 1 past rows).
- Total: 26 tests, all passing, 100% coverage maintained.
