# Story 84.2: Fix Volatility Data Filtering

Status: Approved

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

- [ ] Task 1: Read Story 84.1 root cause documentation (AC: #2)

  - [ ] Read `_bmad-output/implementation-artifacts/84-1-investigate-volatility-visibility-bug.md`
        — specifically the Dev Agent Record section containing the root cause
  - [ ] Identify the exact file(s) and line(s) where the position-dependent filter exists
  - [ ] Understand the minimal change needed to remove it without breaking other behaviour

- [ ] Task 2: Apply the backend fix (AC: #2)

  - [ ] Modify the identified file(s) to remove the position-dependent filter from the
        volatility data path
  - [ ] If the fix is in `volatility-query.function.ts`: ensure the Prisma query returns all
        universe symbols that have distribution history, not just those with trades
  - [ ] If the fix is in the main Universe API (`routes/universe/index.ts`): ensure the
        endpoint returns all universe symbols regardless of position status
  - [ ] If the fix is on the frontend side: ensure `applyVolatility` applies to all symbols
        in the universe list, not just those with positions
  - [ ] Do not duplicate logic — reuse the existing `calculateVolatility` function from
        `apps/server/src/app/volatility/volatility-calculation.function.ts`
  - [ ] Keep the fix minimal: change only what Story 84.1 identified as the root cause

- [ ] Task 3: Write or update unit tests for the fix (AC: #2)

  - [ ] If the fix is in a Prisma query function, add a unit test (or integration test) that
        confirms a symbol with distribution history but no trades is included in the results
  - [ ] If the fix is in a pure function (e.g., filter removed), update existing tests or add
        a new test case
  - [ ] Test file location: alongside the changed file (e.g., `.spec.ts` next to `.ts`)
  - [ ] Use Vitest; follow existing test patterns in the `volatility/` directory

- [ ] Task 4: Verify the previously failing E2E test now passes (AC: #3)

  - [ ] Run the E2E test written in Story 84.1:
        `apps/dms-material-e2e/src/volatility-visibility.spec.ts`
    - [ ] Remove the temporary Story 84.1 `test.skip()` override from `apps/dms-material-e2e/src/volatility-visibility.spec.ts` before rerunning the live-symbol assertion
  - [ ] Confirm it passes green
  - [ ] Remove the `// This test is expected to fail` comment from that test file

- [ ] Task 5: Use Playwright MCP server to verify the fix on the live app (AC: #4)

  - [ ] Start the dev server: `pnpm nx run server:serve` and `pnpm nx run dms-material:serve`
  - [ ] Open Playwright MCP server against `http://localhost:4201`
  - [ ] Navigate to Universe screen
  - [ ] Confirm the symbol(s) identified in Story 84.1 (no positions) now show Vol icons
  - [ ] Confirm symbols with positions still show the same icons as before
  - [ ] Document findings in Dev Agent Record

- [ ] Task 6: Run `pnpm all` and confirm all tests pass (AC: #3)
  - [ ] Run `pnpm all` from workspace root
  - [ ] Confirm no regressions — all previously passing tests must still pass
  - [ ] Confirm the Story 84.1 failing test now passes
  - [ ] Confirm the existing `vol-column.spec.ts` tests still pass

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

- The Prisma `divDeposits` query in `volatility-query.function.ts`: ensure `universeId`-linked
  records include symbols without trades
- Or: the `universe` Prisma model query in `routes/universe/index.ts`: ensure all symbols
  are returned, not just those with open trades

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

### Root Cause

- Story 84.1 found no position-dependent filter in the main Universe API, the SmartNgRX-backed `UniverseService`, or `applyVolatility`; zero-position symbol `SPAXX` already renders `Volatility: decreasing` in the live app.
- The actual failure path is data availability plus the 12-point threshold in `apps/server/src/app/volatility/volatility-calculation.function.ts`: `calculateVolatility()` returns `null` for fewer than 12 linked dividend records.
- `divDeposits.universeId` is populated through the Fidelity dividend import path in `apps/server/src/app/routes/import/fidelity-data-mapper.function.ts`; screener sync and add-symbol flows create/update `universe` rows but do not create historical `divDeposits`.
- In the live database, investigated zero-position symbols have either no linked deposits (`USA`, `IAE`) or too few to cross the 12-point gate (`GCV` has 1, `MSD` has 2), so `/api/universe/volatility` returns no usable category and the Vol cell stays blank.
- Story 84.2 should not assume a trade-position filter is the bug. The likely follow-up is either a data backfill or alternate history source for non-held universe symbols, or a product-approved change to how insufficient history is represented.
