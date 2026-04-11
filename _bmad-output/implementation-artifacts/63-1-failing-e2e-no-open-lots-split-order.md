# Story 63.1: Write Failing E2E Test Reproducing "No Open Lots" Error

Status: Approved

> **Scope note:** This story uses a minimal invented ticker (e.g., `TSTX`) to create a controlled
> reproducer CSV. The test must not hard-code OXLC or any real ticker — the bug is general. The
> fixture CSV must contain **both** buy rows and split rows, placing the split row _first_ in the
> file (higher in the CSV, simulating Fidelity's reverse-chronological export order) so that the
> importer encounters the split before the buys have been written to the database.

## Story

As a developer,
I want a Playwright e2e test that imports a minimal CSV exhibiting the "No open lots" error on a
reverse-split row,
so that I have a reproducible red test that drives the fix in Story 63.2.

## Acceptance Criteria

1. **Given** the Playwright MCP server is used to upload a CSV whose split row appears _before_
   its corresponding buy rows in the file (simulating Fidelity's reverse-date-order export),
   **When** the import runs,
   **Then** the import response either contains a "No open lots" error or the open positions table
   does not reflect the split adjustment — and the test currently **FAILS** (confirming the bug).

2. **Given** the developer examines the server-side API response body during the import,
   **When** the split-processing step runs before buys are committed,
   **Then** the `errors` array in the JSON response contains a message matching
   `"No open lots for"`, confirming the ordering hypothesis.

3. **Given** the test is committed,
   **When** `pnpm run e2e:dms-material:chromium` runs,
   **Then** the new test fails (the split adjustment is NOT correctly applied because lots don't
   exist in the database when the split processor runs).

4. **Given** all other existing tests are unmodified,
   **When** the test suite runs,
   **Then** all previously passing tests continue to pass.

## Definition of Done

- [ ] Playwright MCP server used to reproduce the "No open lots" error on the Universe / import screen
- [ ] Minimal fixture CSV created in `apps/dms-material-e2e/fixtures/` with the split row at the top of the file and the buy rows below (reverse-date order, invented ticker)
- [ ] Seeder helper created in `apps/dms-material-e2e/src/helpers/` that sets up only the universe entry and account (no pre-seeded lots — the lots must come from the CSV itself)
- [ ] Playwright test file `no-open-lots-split-order.spec.ts` created in `apps/dms-material-e2e/src/` asserting that the split adjustment is applied — test currently **fails**
- [ ] Root cause hypothesis (split processed during mapping before buys are committed to DB) documented in Dev Notes
- [ ] `pnpm all` passes

## Tasks / Subtasks

- [ ] **Task 1: Read existing split import test infrastructure** (AC: #3, #4)
  - [ ] Read `apps/dms-material-e2e/src/split-import-e2e.spec.ts` — understand test structure, helper imports, fixture upload pattern
  - [ ] Read `apps/dms-material-e2e/src/helpers/seed-split-import-e2e-data.helper.ts` — understand seed pattern for universe + account creation
  - [ ] Read `apps/dms-material-e2e/src/helpers/shared-prisma-client.helper.ts` — understand direct DB access from tests
  - [ ] Note fixture directory path: `apps/dms-material-e2e/fixtures/` (NOT `src/fixtures/`)

- [ ] **Task 2: Use Playwright MCP server to reproduce the bug** (AC: #1, #2)
  - [ ] Navigate to the Universe import dialog via the Playwright MCP server
  - [ ] Upload a manually-constructed CSV (split row first, buy row second) for an existing symbol
  - [ ] Inspect the import API response body for the "No open lots for" error message
  - [ ] Document exact error message format in Dev Notes

- [ ] **Task 3: Create the minimal reproducer fixture CSV** (AC: #1, #2)
  - [ ] Create `apps/dms-material-e2e/fixtures/fidelity-split-order-bug.csv` using an invented ticker `TSTX` (1-for-5 reverse split)
  - [ ] Place the split row (newer date, e.g. `09/20/2025`) at line 2 (immediately after the header row)
  - [ ] Place the buy rows (older dates, e.g. `06/01/2025` and `07/15/2025`) on lines 3–4
  - [ ] Use the existing Fidelity header row format (see Dev Notes)
  - [ ] The split FROM row quantity must equal `(sum of buy quantities) / 5` (e.g., 1000 buys → 200 post-split shares)

- [ ] **Task 4: Create the seeder helper** (AC: #1, #3)
  - [ ] Create `apps/dms-material-e2e/src/helpers/seed-no-open-lots-e2e-data.helper.ts`
  - [ ] Seed only: a universe entry for `TSTX` + an account named `"No Open Lots Test Account"` — **no trades**
  - [ ] The buy transactions will arrive via the CSV — there must be zero pre-existing trades
  - [ ] Follow the cleanup pattern from `seed-split-import-e2e-data.helper.ts`

- [ ] **Task 5: Write the failing E2E test** (AC: #1, #2, #3, #4)
  - [ ] Create `apps/dms-material-e2e/src/no-open-lots-split-order.spec.ts`
  - [ ] Use `test.describe.configure({ mode: 'serial' })` as in `split-import-e2e.spec.ts`
  - [ ] `beforeAll` seeds TSTX universe + account, captures `universeId` and `accountId`
  - [ ] `afterAll` calls `cleanup()`
  - [ ] `beforeEach` calls `login(page)`
  - [ ] Test uploads `fidelity-split-order-bug.csv` via the import dialog
  - [ ] Capture the API response at `/api/import/fidelity` — currently expects `errors: []` but receives a "No open lots for" error instead
  - [ ] Assert `body.errors` is empty (this assertion currently FAILS, confirming the bug)
  - [ ] Also query DB and assert `TSTX` open lots are correctly adjusted (currently no lots present → assertion fails)
  - [ ] Confirm test is red

## Dev Notes

### Key Files

| File | Purpose |
|------|---------|
| `apps/dms-material-e2e/fixtures/fidelity-split-order-bug.csv` | New fixture — split row first, buys second |
| `apps/dms-material-e2e/src/no-open-lots-split-order.spec.ts` | New failing E2E test |
| `apps/dms-material-e2e/src/helpers/seed-no-open-lots-e2e-data.helper.ts` | New seeder — universe + account only, no trades |
| `apps/dms-material-e2e/src/split-import-e2e.spec.ts` | Reference pattern for CSV upload + DB assertion |
| `apps/dms-material-e2e/src/helpers/seed-split-import-e2e-data.helper.ts` | Reference seed pattern |
| `apps/server/src/app/routes/import/fidelity-data-mapper.function.ts` | Root cause: `handleSplitRow` calls `adjustLotsForSplit` during mapping |
| `apps/server/src/app/routes/import/fidelity-import-service.function.ts` | Orchestrator: mapping happens before `processTrades` |

### Fixture CSV Format

The Fidelity CSV header row (must appear as line 1):
```
Run Date,Account,Account Number,Action,Symbol,Description,Type,Price ($),Quantity,Commission ($),Fees ($),Accrued Interest ($),Amount ($),Settlement Date
```

The split FROM row uses the `YOU SOLD` action with the reverse-split description pattern:
```
09/20/2025,No Open Lots Test Account,12345678,YOU SOLD,TSTX,"REVERSE SPLIT R/S FROM XXXXXXX#REOR MXXXXXXXXXX",Stock,,200,,,,,09/20/2025
```

The buy rows use `YOU BOUGHT`:
```
07/15/2025,No Open Lots Test Account,12345678,YOU BOUGHT,TSTX,TSTX INC COMMON STOCK,Stock,4.00,500,,,,-2000.00,07/17/2025
06/01/2025,No Open Lots Test Account,12345678,YOU BOUGHT,TSTX,TSTX INC COMMON STOCK,Stock,3.80,500,,,,-1900.00,06/03/2025
```

**Critical fixture ordering**: split row MUST appear before buy rows in the file. The later dates go at the top. This directly reproduces Fidelity's actual export format (newest first within each account block).

### Root Cause Hypothesis

The pipeline calls `mapFidelityTransactions` → `handleSplitRow` → `adjustLotsForSplit` **during mapping**, before `processAllTransactions` / `processTrades` has committed any buys to the database.

Flow in `importFidelityTransactions` (`fidelity-import-service.function.ts`):
1. `parseFidelityCsv` → raw rows
2. `resolveCusipSymbols` → CUSIP resolution (non-fatal)
3. **`mapFidelityTransactions`** → walks rows; for each split row calls `adjustLotsForSplit` immediately (DB query hits, finds 0 lots)
4. `processAllTransactions` → **only here** are buy trades written to DB via `processTrades`

The `compareByDate` sort inside `mapFidelityTransactions` reorders rows (buy comes before split after sort), but the split's `adjustLotsForSplit` still fires **before** the buy has been committed to the DB. The sort changes iteration order but does not change the fundamental sequencing problem.

### Architecture Context

- Import pipeline: `apps/server/src/app/routes/import/` — pure TypeScript functions, no Angular
- No frontend changes needed; bug is entirely server-side
- `processAllTransactions` in `fidelity-import-service.function.ts` is the correct place to defer split processing: after `processTrades` writes buys, then process accumulated splits

### Testing Standards
- Unit tests: Vitest in same directory as source file (`apps/server/src/app/routes/import/`)
- E2E tests: Playwright in `apps/dms-material-e2e/src/`
- `pnpm all` must pass

### Project Structure Notes
- Fixtures live in `apps/dms-material-e2e/fixtures/` (confirmed via file search) — NOT inside `src/`
- The `FIXTURES_DIR` constant in E2E specs uses `path.resolve(__dirname, '..', 'fixtures')` — `__dirname` is `apps/dms-material-e2e/src`
- All named functions, no anonymous arrow function callbacks in test subscriptions (project ESLint rule `@smarttools/no-anonymous-functions`)
- Seed helpers follow the `SeedResult { accountId, universeId, cleanup() }` pattern

### References
- [Source: _bmad-output/planning-artifacts/epics-2026-04-10.md#Epic 63]
- [Root cause confirmed: apps/server/src/app/routes/import/fidelity-data-mapper.function.ts#handleSplitRow]
- [Orchestrator: apps/server/src/app/routes/import/fidelity-import-service.function.ts#importFidelityTransactions]
- [Existing pattern: apps/dms-material-e2e/src/split-import-e2e.spec.ts]

## Dev Agent Record

### Agent Model Used

_[to be filled by dev agent]_

### Debug Log References

### Completion Notes List

### File List
