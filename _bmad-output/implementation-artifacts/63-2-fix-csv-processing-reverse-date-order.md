# Story 63.2: Fix CSV Processing to Walk Rows in Reverse Date Order

Status: Approved

> **Scope note:** The fix must be symbol-agnostic. No ticker names or CUSIPs may be hard-coded.
> The root cause is a structural sequencing problem: `adjustLotsForSplit` is called during the
> _mapping_ phase (inside `mapFidelityTransactions`) before buy trades are committed to the
> database by `processTrades`. Sorting rows by date within the mapping loop does not fix this
> because both actions happen in the same phase. The correct fix is to defer all split adjustments
> until after `processTrades` completes.

## Story

As a portfolio manager,
I want the CSV import to correctly process buy transactions before split events for the same
symbol regardless of the order rows appear in the file,
so that all open lots exist in the database when the split adjustment runs and no "No open lots"
error occurs.

## Acceptance Criteria

1. **Given** a Fidelity CSV containing buy rows for a symbol followed later in the file by a
   reverse-split row for the same symbol (i.e. split row appears first / has a later date in the
   reverse-chronological Fidelity export),
   **When** the import is processed,
   **Then** all buy lots are inserted into the database first, and the split adjustment finds them
   and applies correctly — no "No open lots" error.

2. **Given** the fix is applied and the failing e2e test from Story 63.1 runs,
   **When** `pnpm run e2e:dms-material:chromium` executes,
   **Then** the `no-open-lots-split-order.spec.ts` test passes green.

3. **Given** the existing MSTY / ULTY / OXLC split import E2E tests (from Epics 48, 57, 61) are
   still present,
   **When** `pnpm run e2e:dms-material:chromium` runs,
   **Then** those tests continue to pass — the fix must not break any pre-seeded-lots scenario.

4. **Given** all changes are applied,
   **When** `pnpm all` runs,
   **Then** all tests pass with no regressions.

## Definition of Done

- [ ] Root cause confirmed via code inspection and Story 63.1 Dev Agent Record: `handleSplitRow` calls `adjustLotsForSplit` during the mapping phase, before `processTrades` has committed buys to the DB
- [ ] Split processing decoupled from the mapping phase: `mapFidelityTransactions` accumulates pending split adjustments instead of executing them immediately
- [ ] `MappedTransactionResult` interface extended with a `pendingSplits` field (or equivalent) to carry deferred split parameters
- [ ] `processAllTransactions` in `fidelity-import-service.function.ts` calls split adjustment **after** `processTrades` completes, using the deferred split data
- [ ] Unit tests added in `fidelity-data-mapper.function.spec.ts` for the deferred-split accumulation: assert that `mapFidelityTransactions` returns the correct `pendingSplits` entries without executing DB calls to `adjustLotsForSplit`
- [ ] Unit tests added in `fidelity-import-service.function.spec.ts` for the ordering guarantee: assert that when `pendingSplits` are present, `adjustLotsForSplit` is not called before `processTrades` resolves
- [ ] Fix is entirely server-side — no front-end changes
- [ ] Playwright MCP server confirms the split is applied correctly with the fixture CSV from Story 63.1
- [ ] E2E test from Story 63.1 passes green
- [ ] Existing MSTY / ULTY / OXLC split E2E tests pass green
- [ ] `pnpm all` passes

## Tasks / Subtasks

- [ ] **Task 1: Confirm root cause from Story 63.1 Dev Agent Record** (AC: #1)
  - [ ] Read Story 63.1 Dev Agent Record — confirm the exact function and line where `adjustLotsForSplit` is called during mapping
  - [ ] Re-read `apps/server/src/app/routes/import/fidelity-data-mapper.function.ts` — locate `handleSplitRow` and its call to `adjustLotsForSplit`
  - [ ] Re-read `apps/server/src/app/routes/import/fidelity-import-service.function.ts` — confirm `mapFidelityTransactions` is called before `processTrades`

- [ ] **Task 2: Extend `MappedTransactionResult` with deferred split data** (AC: #1)
  - [ ] Add a `pendingSplits` field to `apps/server/src/app/routes/import/mapped-transaction-result.interface.ts`
  - [ ] Define the entry shape: `{ symbol: string; ratio: number; accountId: string }` (all info needed by `adjustLotsForSplit`)
  - [ ] Initialize the new field to `[]` wherever `MappedTransactionResult` is constructed in tests

- [ ] **Task 3: Decouple split processing from mapping** (AC: #1, #2)
  - [ ] In `fidelity-data-mapper.function.ts`, change `handleSplitRow` to **not** call `adjustLotsForSplit` directly
  - [ ] Instead, compute the split ratio (via `calculateSplitRatio`) and push `{ symbol, ratio, accountId }` onto `result.pendingSplits`
  - [ ] Remove or guard the direct `adjustLotsForSplit` call from `handleSplitRow` / `mapSingleRow`
  - [ ] The `compareByDate` sort inside `mapFidelityTransactions` may remain (it benefits other row types) but is no longer the fix for the split ordering problem

- [ ] **Task 4: Process deferred splits in `processAllTransactions`** (AC: #1, #2, #3)
  - [ ] In `fidelity-import-service.function.ts`, after the `await processTrades(...)` call, iterate over `mapped.pendingSplits`
  - [ ] For each entry, call `adjustLotsForSplit(symbol, ratio, accountId)` and collect any errors
  - [ ] Add a helper function `processDeferred Splits(pendingSplits, errors)` following the existing `processTrades` / `processSales` pattern (named function, no anonymous callbacks)
  - [ ] Errors from split processing should be appended to the `errors` array and fail the import (`success: false`)

- [ ] **Task 5: Add unit tests for mapping phase (no DB calls to `adjustLotsForSplit`)** (AC: #1, #4)
  - [ ] In `fidelity-data-mapper.function.spec.ts`, add a test: a split row in the input populates `result.pendingSplits` with the correct `{ symbol, ratio, accountId }` and does NOT call `adjustLotsForSplit`
  - [ ] Add test: buy row before split row in same CSV — `pendingSplits` still populated (confirms order does not matter for accumulation)
  - [ ] Add test: split row before buy row in same CSV — same result (order-agnostic accumulation)

- [ ] **Task 6: Add unit tests for service orchestration (splits run after buys)** (AC: #2, #4)
  - [ ] In `fidelity-import-service.function.spec.ts`, add a test: `adjustLotsForSplit` is NOT called until after `processTrades` mock resolves
  - [ ] Add test: when `pendingSplits` is populated, `adjustLotsForSplit` is called once per split entry with the correct arguments
  - [ ] Add test: error from `adjustLotsForSplit` is surfaced in `result.errors`

- [ ] **Task 7: Verify with Playwright MCP server** (AC: #1, #2, #3)
  - [ ] Upload `fidelity-split-order-bug.csv` (from Story 63.1) — confirm no "No open lots" error
  - [ ] Confirm TSTX lots in DB show correct post-split values
  - [ ] Run Story 63.1 E2E test — confirm it passes green
  - [ ] Run `split-import-e2e.spec.ts` — confirm MSTY / ULTY / OXLC tests still pass

## Dev Notes

### Key Files

| File | Purpose |
|------|---------|
| `apps/server/src/app/routes/import/fidelity-data-mapper.function.ts` | Primary fix location: decouple `handleSplitRow` from `adjustLotsForSplit` |
| `apps/server/src/app/routes/import/fidelity-import-service.function.ts` | Add `processDeferredSplits` call after `processTrades` |
| `apps/server/src/app/routes/import/mapped-transaction-result.interface.ts` | Add `pendingSplits` field |
| `apps/server/src/app/routes/import/adjust-lots-for-split.function.ts` | Called from service (not mapper) after fix |
| `apps/server/src/app/routes/import/calculate-split-ratio.function.ts` | Called from mapper to compute ratio for deferred entry |
| `apps/server/src/app/routes/import/fidelity-data-mapper.function.spec.ts` | Add mapping-phase unit tests |
| `apps/server/src/app/routes/import/fidelity-import-service.function.spec.ts` | Add ordering / orchestration unit tests |
| `apps/dms-material-e2e/src/no-open-lots-split-order.spec.ts` | E2E test from Story 63.1 — must turn green |
| `apps/dms-material-e2e/src/split-import-e2e.spec.ts` | Existing E2E regression guards — must stay green |

### Root Cause Deep Dive

The import pipeline in `importFidelityTransactions` (`fidelity-import-service.function.ts`) has two phases:

**Phase 1 — Mapping** (`mapFidelityTransactions`):
- Rows sorted ascending by date via `compareByDate`
- Each row dispatched to `mapSingleRow`
- For split rows: `handleSplitRow` calls `calculateSplitRatio` then **immediately** calls `adjustLotsForSplit` — a DB write/read
- For buy rows: only adds a `MappedTrade` to `result.trades` (in-memory; no DB write yet)

**Phase 2 — Processing** (`processAllTransactions`):
- `processTrades` — writes buys to DB (first time they exist in DB)
- `processSales` — processes sales
- `processDeposits` — processes dividends/cash

**Bug**: Phase 1 calls `adjustLotsForSplit` for split rows before Phase 2 has committed any buy trades. Even though the mapper sorts rows (buy before split in iteration order), the split adjustment queries the DB — which is still empty for these trades — and emits "No open lots for TSTX".

**Fix Strategy**: Change `handleSplitRow` to:
1. Compute the split ratio (still OK during mapping — no DB write, just a lookup)
2. Push `{ symbol, ratio, accountId }` onto `result.pendingSplits`
3. NOT call `adjustLotsForSplit`

Then in `processAllTransactions`, add:
```typescript
const splitCount = await processDeferredSplits(mapped.pendingSplits, errors);
```
after `const tradeCount = await processTrades(...)`.

### `processDeferredSplits` Function Signature (suggested)

```typescript
async function processDeferredSplits(
  pendingSplits: PendingSplit[],
  errors: string[]
): Promise<number> {
  let count = 0;
  for (const split of pendingSplits) {
    try {
      await adjustLotsForSplit(split.symbol, split.ratio, split.accountId);
      count++;
    } catch (error) {
      errors.push(formatError(`Failed to process split for ${split.symbol}`, error));
    }
  }
  return count;
}
```

### Backwards Compatibility

The existing split E2E tests (`split-import-e2e.spec.ts`) seed pre-existing lots before importing a
CSV that contains ONLY split rows (no buy rows). After the fix, these tests must still pass because:
- The CSV has only split rows → `pendingSplits` is populated
- No buy rows → `processTrades` is a no-op
- `processDeferredSplits` runs after `processTrades` → finds the pre-seeded lots → adjusts them

No regression for pre-seeded lots scenarios.

### Code Style Requirements from `project-context.md`

- Named functions only — never anonymous arrow callbacks in loops or subscriptions (`@smarttools/no-anonymous-functions` ESLint rule)
- Use `function` keyword for named helpers, not arrow-assignment style for top-level functions
- All tests in Vitest, same directory as source file
- No `any` types unless absolutely unavoidable with ESLint disable comment

### Architecture Context

- Import route: pure TypeScript, no Angular, no SmartNgRX involved
- The `MappedTransactionResult` interface is consumed by `processAllTransactions` only — safe to extend
- `adjustLotsForSplit` already handles symbol-agnostic CUSIP resolution (Epic 61) — no changes needed there

### Testing Standards
- Unit tests: Vitest in `apps/server/src/app/routes/import/`
- E2E tests: Playwright in `apps/dms-material-e2e/src/`
- `pnpm all` must pass

### References
- [Source: _bmad-output/planning-artifacts/epics-2026-04-10.md#Epic 63 — Story 63.2]
- [Fix location 1: apps/server/src/app/routes/import/fidelity-data-mapper.function.ts#handleSplitRow]
- [Fix location 2: apps/server/src/app/routes/import/fidelity-import-service.function.ts#processAllTransactions]
- [Interface to extend: apps/server/src/app/routes/import/mapped-transaction-result.interface.ts]
- [E2E green test: apps/dms-material-e2e/src/no-open-lots-split-order.spec.ts (Story 63.1)]

## Dev Agent Record

### Agent Model Used

_[to be filled by dev agent]_

### Debug Log References

### Completion Notes List

### File List
