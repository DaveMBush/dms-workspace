# Story 84.2: Fix Volatility Data Filtering

Status: Review

## Story

As Dave,
I want the "Vol" column to show a volatility icon for every symbol in the universe, regardless
of whether I hold positions in that symbol,
so that I can assess distribution stability when deciding what to buy, not just when reviewing
what I already own.

## Acceptance Criteria

1. **Given** the Universe screen is loaded with a mix of symbols that have positions and symbols
   that do not,
   **When** the "Vol" column renders,
   **Then** every symbol row shows either a volatility icon or a neutral placeholder (for
   insufficient data) — no row shows an absent/empty icon simply because no position exists.

2. **Given** a symbol with zero open trades,
   **When** the backend query runs,
   **Then** the query does not filter out or exclude the symbol due to an absence of trades;
   the volatility value is calculated from distribution history only.

3. **Given** the fix is applied and the failing E2E test from Story 84.1 is run,
   **When** `pnpm all` is executed,
   **Then** the previously failing test now passes.

4. **Given** a symbol with sufficient distribution history but no positions,
   **When** the developer uses the Playwright MCP server to verify the Universe screen,
   **Then** the MCP server confirms a volatility icon is visible for that symbol.

## Tasks / Subtasks

- [x] Task 1: Read Story 84.1 root cause documentation (AC: #2)

  - [x] Read `_bmad-output/implementation-artifacts/84-1-investigate-volatility-visibility-bug.md`
        — specifically the Dev Agent Record section containing the root cause
  - [x] Identify the exact file(s) and line(s) where dividend-history linkage and the insufficient-history gate suppress volatility for non-held symbols
  - [x] Understand the minimal change needed to fix that data path without regressing symbols like `SPAXX` that already show volatility with zero positions

- [x] Task 2: Apply the backend/data fix (AC: #2)

  - [x] Modify the identified file(s) to address the real root cause in the volatility data path
  - [ ] If the fix is in dividend-history linkage or import/backfill code: ensure non-imported universe symbols can supply enough distribution history for volatility without requiring trades
    - [x] If the fix involves `volatility-calculation.function.ts`: implement a product-approved handling for symbols below `MIN_DATA_POINTS = 12` rather than silently leaving the Vol cell blank
    - [x] Check `volatility-query.function.ts` and `routes/universe/index.ts` only for related data-source wiring; Story 84.1 found no position-only filter there
    - [x] Do not duplicate logic — reuse the existing `calculateVolatility` function from
          `apps/server/src/app/volatility/volatility-calculation.function.ts`
    - [x] Keep the fix minimal: change only what Story 84.1 identified as the root cause

- [x] Task 3: Write or update unit tests for the fix (AC: #2)

  - [x] If the fix is in a Prisma query function, add a unit test (or integration test) that
        confirms a symbol with distribution history but no trades is included in the results
  - [x] If the fix is in a pure function (e.g., filter removed), update existing tests or add
        a new test case
  - [x] Test file location: alongside the changed file (e.g., `.spec.ts` next to `.ts`)
  - [x] Use Vitest; follow existing test patterns in the `volatility/` directory

- [x] Task 4: Verify the previously failing E2E test now passes (AC: #3)

  - [x] Run the E2E test written in Story 84.1:
        `apps/dms-material-e2e/src/volatility-visibility.spec.ts`
    - [x] Remove the temporary Story 84.1 expected-failure annotation (`test.fail(...)`) and its surrounding comment from `apps/dms-material-e2e/src/volatility-visibility.spec.ts` before rerunning the live-symbol assertion
  - [x] Confirm it passes green
  - [x] Keep the `SPAXX` control assertion passing while the `GCV` live-symbol assertion turns green

- [x] Task 5: Use Playwright MCP server to verify the fix on the live app (AC: #4)

  - [x] Start the dev server: `pnpm nx run server:serve` and `pnpm nx run dms-material:serve`
  - [x] Open Playwright MCP server against `http://localhost:4201`
  - [x] Navigate to Universe screen
  - [x] Confirm the symbol(s) identified in Story 84.1 (no positions) now show Vol icons
  - [x] Confirm symbols with positions still show the same icons as before
  - [x] Document findings in Dev Agent Record

- [x] Task 6: Run `pnpm all` and confirm all tests pass (AC: #3)
  - [x] Run `pnpm all` from workspace root
  - [x] Confirm no regressions — all previously passing tests must still pass
  - [x] Confirm the Story 84.1 failing test now passes
  - [x] Confirm the existing `vol-column.spec.ts` tests still pass

## Dev Notes

### Prerequisite: Story 84.1

Read `_bmad-output/implementation-artifacts/84-1-investigate-volatility-visibility-bug.md`
before making any changes. The root cause is documented in the Dev Agent Record section of
that story. Do not guess — use the finding.

### Backend Volatility Pipeline

The volatility data flows through:

1. `GET /api/universe/volatility`
   → `apps/server/src/app/routes/universe/get-volatility/index.ts`
2. `fetchVolatilityForAllSymbols()`
   → `apps/server/src/app/volatility/volatility-query.function.ts`
3. `calculateVolatility(amounts)`
   → `apps/server/src/app/volatility/volatility-calculation.function.ts`

The fix must be made at the point identified by Story 84.1. The most likely candidates are:

- The dividend-history linkage path (for example, import/backfill or alternate history source)
  so non-held universe symbols can accumulate enough records for volatility calculation
- The insufficient-history handling around `MIN_DATA_POINTS = 12` in
  `volatility-calculation.function.ts`, if product approves a fallback or neutral rendering path
- Related wiring in `volatility-query.function.ts` or `routes/universe/index.ts` only if needed
  to consume the corrected data source; Story 84.1 found no position-only filter in either file

### Constraint: Do Not Weaken Tests

The failing test from Story 84.1 must pass after this fix — do not skip it or weaken its
assertion. The root cause must be fixed so the icon actually appears, not just so the test
passes vacuously.

### Frontend Files (if fix is frontend-side)

| File                                                                                   | Purpose                                          |
| -------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `apps/dms-material/src/app/global/global-universe/services/volatility-data.service.ts` | Fetches volatility from backend                  |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`        | Calls `applyVolatility`                          |
| `apps/dms-material/src/app/global/global-universe/apply-volatility.function.ts`        | Apply volatility to enriched data (if extracted) |

### Backend Files (if fix is backend-side)

| File                                                          | Purpose                               |
| ------------------------------------------------------------- | ------------------------------------- |
| `apps/server/src/app/volatility/volatility-query.function.ts` | Prisma query for distribution history |
| `apps/server/src/app/routes/universe/index.ts`                | Main universe POST endpoint           |
| `apps/server/src/app/routes/universe/get-volatility/index.ts` | Volatility GET endpoint               |

### Key Commands

```bash
# Start the dev stack for Playwright MCP verification
pnpm nx run server:serve &
pnpm nx run dms-material:serve

# Run the specific failing test to confirm it now passes
pnpm nx run dms-material-e2e:e2e -- --grep "symbol with no positions"

# Run the existing vol column tests to confirm no regression
pnpm nx run dms-material-e2e:e2e -- --grep "Volatility Column"

# Run full suite
pnpm all
```

### References

- [Source: apps/server/src/app/volatility/volatility-query.function.ts]
- [Source: apps/server/src/app/routes/universe/get-volatility/index.ts]
- [Source: apps/dms-material/src/app/global/global-universe/services/volatility-data.service.ts]
- [Source: apps/dms-material-e2e/src/volatility-visibility.spec.ts (created in Story 84.1)]
- [Source: _bmad-output/implementation-artifacts/84-1-investigate-volatility-visibility-bug.md]
- [Source: _bmad-output/planning-artifacts/epics-2026-04-23.md#story-842]

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Root Cause

- Story 84.1 found no position-dependent filter in the main Universe API, the SmartNgRX-backed `UniverseService`, or `applyVolatility`; zero-position symbol `SPAXX` already renders `Volatility: decreasing` in the live app.
- The actual failure path is data availability plus the 12-point threshold in `apps/server/src/app/volatility/volatility-calculation.function.ts`: `calculateVolatility()` returns `null` for fewer than 12 linked dividend records.
- `divDeposits.universeId` is populated through the Fidelity dividend import path in `apps/server/src/app/routes/import/fidelity-data-mapper.function.ts`; screener sync and add-symbol flows create/update `universe` rows but do not create historical `divDeposits`.
- In the live database, investigated zero-position symbols have either no linked deposits (`USA`, `IAE`) or too few to cross the 12-point gate (`GCV` has 1, `MSD` has 2), so `/api/universe/volatility` returns no usable category and the Vol cell stays blank.
- Story 84.2 should not assume a trade-position filter is the bug. The likely follow-up is either a data backfill or alternate history source for non-held universe symbols, or a product-approved change to how insufficient history is represented.

### Debug Log References

- Ran `npx prisma generate` in the story worktree before lint, E2E, and other type-sensitive validation.
- `pnpm exec vitest run apps/server/src/app/volatility/volatility-calculation.function.spec.ts apps/server/src/app/volatility/volatility-query.function.spec.ts --coverage` passed with 11 tests.
- `pnpm exec playwright test apps/dms-material-e2e/src/volatility-visibility.spec.ts --project=integration --config=apps/dms-material-e2e/playwright.config.ts` passed with both the `SPAXX` zero-position control and the `GCV` live-symbol assertion green.
- Browser MCP verification against `http://localhost:4201/global/universe` confirmed `GCV` at position `0.00` renders `aria-label="Volatility: insufficient history"`, while `SPAXX` at position `0.00` still renders `aria-label="Volatility: decreasing"`.
- `pnpm exec playwright test apps/dms-material-e2e/src/vol-column.spec.ts --project=chromium --config=apps/dms-material-e2e/playwright.config.ts` passed with 3 tests.
- `pnpm all` initially failed only on the repo-wide `100%` coverage gate because the new query test missed the defensive `universe: null` branch; after adding that coverage case, `pnpm all` passed.

### Completion Notes List

- Implemented the root fix in the volatility data path by querying all non-deleted universe symbols first and then calculating volatility per symbol, instead of only returning symbols already present in `divDeposits`.
- Changed `calculateVolatility()` to return the explicit neutral category `insufficient-history` for short histories and zero-mean histories, so symbols without enough data render a deliberate placeholder instead of a blank cell.
- Updated frontend volatility unions and the Universe template so the Vol column renders a neutral `remove` icon with tooltip `Insufficient history`.
- Reactivated the Story 84.1 live-symbol regression by removing `test.fail(...)` from `apps/dms-material-e2e/src/volatility-visibility.spec.ts`; the `GCV` assertion now passes without weakening the test.
- Added a dedicated query spec that covers symbols with insufficient history, symbols with no dividend rows, and the defensive `universe: null` branch required by the repo-wide 100% coverage threshold.

## File List

- `apps/server/src/app/volatility/volatility-category.type.ts` - added the `insufficient-history` volatility category
- `apps/server/src/app/volatility/volatility-calculation.function.ts` - returns `insufficient-history` for fewer than 12 points and zero-mean histories
- `apps/server/src/app/volatility/volatility-calculation.function.spec.ts` - updated expectations for neutral insufficient-history behavior
- `apps/server/src/app/volatility/volatility-query.function.ts` - queries all universe symbols and calculates volatility for each symbol
- `apps/server/src/app/volatility/volatility-query.function.spec.ts` - added regression coverage for missing history and defensive null-universe records
- `apps/dms-material/src/app/store/universe/universe.interface.ts` - extended frontend volatility unions with `insufficient-history`
- `apps/dms-material/src/app/global/global-universe/services/volatility-result.interface.ts` - extended API result volatility unions with `insufficient-history`
- `apps/dms-material/src/app/global/global-universe/global-universe.component.html` - renders the neutral volatility icon for insufficient history
- `apps/dms-material-e2e/src/volatility-visibility.spec.ts` - removed the Story 84.1 expected-failure marker so the live-symbol regression runs green
- `_bmad-output/implementation-artifacts/84-2-fix-volatility-data-filtering.md` - updated task state and implementation record for Story 84.2

## Change Log

| Date       | Change                                                                                                                                                                | Author |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 2026-04-25 | Implemented the backend all-symbol volatility query and neutral insufficient-history handling, then updated frontend Vol rendering to show a placeholder icon         | Agent  |
| 2026-04-25 | Added targeted volatility regression tests, restored the live `GCV` Playwright assertion to a real pass, verified the live app via Browser MCP, and passed `pnpm all` | Agent  |
