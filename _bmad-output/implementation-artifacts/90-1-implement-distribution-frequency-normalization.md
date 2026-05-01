# Story 90.1: Implement Distribution Frequency Normalization Helper

Status: review

## Story

As a developer,
I want a `normalizeToMonthlyEquivalents(history: ProcessedRow[]): number[]` helper inside
`recalculate-universe-volatility.function.ts` that converts each raw per-payment amount to
its monthly equivalent by inferring the payment interval from consecutive row dates,
So that `calculateVolatility()` receives a comparable series regardless of whether the symbol
pays monthly, quarterly, or annually.

## Acceptance Criteria

1. **Given** a `ProcessedRow[]` where all payments are monthly (consecutive dates ~30 days apart),
   **When** `normalizeToMonthlyEquivalents` is called,
   **Then** each output amount equals the input amount (multiplier ≈ 1).

2. **Given** a `ProcessedRow[]` where all payments are quarterly (consecutive dates ~90 days apart),
   **When** `normalizeToMonthlyEquivalents` is called,
   **Then** each output amount equals `inputAmount / 3` (quarterly → monthly equivalent).

3. **Given** a `ProcessedRow[]` where payments switch mid-history from monthly to quarterly,
   **When** `normalizeToMonthlyEquivalents` is called,
   **Then** each amount is independently normalized based on its own inferred interval, so the
   series shows no artificial spike at the cadence-change boundary.

4. **Given** a `ProcessedRow[]` with a single row (no previous date to infer from),
   **When** `normalizeToMonthlyEquivalents` is called,
   **Then** the single amount is returned unchanged (multiplier = 1, safest default).

5. **Given** the change is implemented with failing unit tests first (TDD),
   **When** `pnpm all` runs,
   **Then** all tests pass, including the new specs for `normalizeToMonthlyEquivalents`.

## Tasks / Subtasks

- [x] Task 1: Write failing unit tests (TDD)

  - [x] Open (or create) `apps/server/src/app/volatility/recalculate-universe-volatility.function.spec.ts`
  - [x] Add a `describe('normalizeToMonthlyEquivalents')` block with at minimum these cases:
    - All monthly (30-day gaps) → amounts unchanged
    - All quarterly (90-day gaps) → each amount ÷ 3
    - All annual (365-day gaps) → each amount ÷ 12
    - Mixed cadence (first 6 monthly, last 3 quarterly) → each normalized independently
    - Single-row array → amount unchanged
  - [x] Confirm all new tests fail before implementation

- [x] Task 2: Implement `normalizeToMonthlyEquivalents`

  - [x] Add the function (not exported) to
        `apps/server/src/app/volatility/recalculate-universe-volatility.function.ts`
  - [x] Algorithm:
    - For row index 0: multiplier = 1 (no previous row)
    - For row index n: `intervalDays = (row[n].date - row[n-1].date) / msPerDay`
    - `multiplier = Math.round(intervalDays / 30)` clamped to `[1, 12]`
    - `normalizedAmount = row[n].amount / multiplier`
  - [x] Return the normalized amounts array

- [x] Task 3: Run `pnpm all` — confirm all tests pass

## Dev Notes

### File to Change

```
apps/server/src/app/volatility/recalculate-universe-volatility.function.ts
```

### Normalization Algorithm

The `ProcessedRow` interface (`distribution-api.function.ts`) only exposes `{ amount: number;
date: Date }`. There is no explicit frequency field. The interval between consecutive payments
must be inferred from the dates.

Approximate intervals:

- Monthly: 28–31 days → `Math.round(intervalDays / 30) = 1` → multiplier = 1 → amount ÷ 1
- Quarterly: 88–95 days → `Math.round(intervalDays / 30) = 3` → multiplier = 3 → amount ÷ 3
- Annual: 355–370 days → `Math.round(intervalDays / 30) = 12` → multiplier = 12 → amount ÷ 12

Clamping to `[1, 12]` prevents edge-case division issues from stale or duplicated rows.

For the first row in the array (no prior row), use multiplier = 1. This is conservative:
the first payment's amount passes through unchanged. If the first row happens to be a
quarterly payment, the amount will be slightly higher than subsequent normalized amounts,
but this is a single-point edge case that has minimal effect on the `calculateVolatility`
algorithm (which requires at least 12 data points and uses distributional statistics).

### Why Internal (Not Exported)

`normalizeToMonthlyEquivalents` is a pure helper with no callers outside this module. Keeping
it unexported avoids polluting the module boundary. The spec can test it indirectly through
`recalculateUniverseVolatility`, or directly if the function is imported in the test via a
named export added only for testing purposes — check existing patterns in the codebase before
deciding.

### `calculateVolatility` Is NOT Modified

`calculateVolatility` (in `volatility-calculation.function.ts`) must remain unchanged. The
normalization is applied to the amounts array **before** it is passed to that function.
`MIN_DATA_POINTS = 12` inside `calculateVolatility` remains valid: after normalization,
a 12-month history still produces 12 data points (one per normalized monthly equivalent).
