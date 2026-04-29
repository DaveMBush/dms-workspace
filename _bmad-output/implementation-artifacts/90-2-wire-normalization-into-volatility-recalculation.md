# Story 90.2: Wire Normalization Into Volatility Recalculation and E2E Verify

Status: Approved

## Story

As Dave,
I want `recalculateUniverseVolatility()` to normalize distribution amounts before computing
volatility categories, and I want an E2E test to confirm that a symbol with a known cadence
change does not produce a false volatility spike,
So that the Vol and SVol columns in the Universe screen reflect genuine distribution behaviour.

## Acceptance Criteria

1. **Given** `recalculateUniverseVolatility(universeId, history)` is called,
   **When** the function extracts windowed amounts,
   **Then** it calls `normalizeToMonthlyEquivalents(windowedRows)` before passing amounts to
   `calculateVolatility()` (verified by updated unit tests).

2. **Given** a history array that switches from quarterly to monthly mid-window,
   **When** `recalculateUniverseVolatility` is called,
   **Then** the resulting `volatility_long` and `volatility_short` categories are the same as
   if the entire history had been consistently monthly at the same annualized rate (verified by
   unit test).

3. **Given** the existing `recalculate-universe-volatility.function.spec.ts` tests,
   **When** `pnpm all` runs after this story,
   **Then** all pre-existing tests pass (arrange steps may be updated to supply
   frequency-consistent input, but no assertions are weakened).

4. **Given** the Playwright E2E suite,
   **When** both Chromium and Firefox targets run,
   **Then** the Universe screen's Vol and SVol columns render icons for symbols across the
   universe (regression check from Epic 84 / Epic 88 / Epic 86).

## Tasks / Subtasks

- [ ] Task 1: Update `recalculateUniverseVolatility` to call normalization (TDD — write
      failing test first)
  - [ ] Add a test in `recalculate-universe-volatility.function.spec.ts` that supplies a
        mixed-cadence history and asserts the correct stable volatility category (not a
        spike category)
  - [ ] Confirm the new test fails before implementation

- [ ] Task 2: Wire normalization
  - [ ] In `recalculate-universe-volatility.function.ts`, modify
        `extractWindowedAmounts` (or its callers) to apply
        `normalizeToMonthlyEquivalents` on the windowed `ProcessedRow[]` list before
        calling `mapAmounts`
  - [ ] Ensure the normalization sees the full windowed row list (not just the amounts)
        so interval calculation is accurate

- [ ] Task 3: Update any arrange steps in existing specs that supply raw non-normalized
      amounts that would now be interpreted differently (e.g., if existing test data used
      monthly amounts that happened to work with the old code but now need frequency-
      consistent intervals to produce the same category)

- [ ] Task 4: Run E2E tests
  - [ ] `pnpm e2e:dms-material:chromium` — must pass
  - [ ] `pnpm e2e:dms-material:firefox` — must pass
  - [ ] Verify Vol and SVol columns render icons on the Universe screen (use Playwright MCP)

- [ ] Task 5: Run `pnpm all` — confirm all tests pass

## Dev Notes

### Change to `extractWindowedAmounts`

Current shape (after Epic 88):

```typescript
function extractWindowedAmounts(
  history: ProcessedRow[],
  now: Date
): { longAmounts: number[]; shortAmounts: number[] } {
  const fiveYearsAgo = buildFiveYearsAgo(now);
  const oneYearAgo = buildOneYearAgo(now);
  const longRows = filterRecordsSince(history, fiveYearsAgo);
  const shortRows = filterRecordsSince(history, oneYearAgo);
  return {
    longAmounts: mapAmounts(longRows),          // ← normalize here
    shortAmounts: mapAmounts(shortRows),        // ← and here
  };
}
```

After this story, `mapAmounts(longRows)` should become
`normalizeToMonthlyEquivalents(longRows)` (and same for `shortRows`). The
`normalizeToMonthlyEquivalents` function returns `number[]`, so the rest of the call
chain is unchanged.

### Pre-existing Test Compatibility

The existing spec tests in `recalculate-universe-volatility.function.spec.ts` supply
`ProcessedRow[]` arrays with carefully spaced dates. After normalization is applied, those
tests may need their input dates adjusted to reflect consistent monthly intervals so that
the normalization multiplier remains 1 and the test expectations are unchanged. Do NOT
change the expected outcome; only adjust the input data if needed.

### E2E Smoke Check

The E2E check in AC4 is a regression guard, not a new feature test. Simply confirm that the
Vol and SVol icon columns are non-blank for at least some rows after a universe sync. This
was established in Epic 84 (Story 84.4) and Epic 86 (Story 86.3). Use the Playwright MCP
server to visually confirm.
