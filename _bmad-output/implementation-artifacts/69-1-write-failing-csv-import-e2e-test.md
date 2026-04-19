# Story 69.1: Write Failing E2E Test Reproducing the 400 Error

Status: Approved

## Story

As a developer,
I want a failing E2E test that demonstrates the 400 error on CSV import,
so that fixing the bug in Story 69.2 can be validated by making the test green.

## Acceptance Criteria

1. **Given** a new synthetic fixture CSV at `apps/dms-material-e2e/fixtures/fidelity-regression-69.csv` modelled on the existing `fidelity-valid.csv` format, **When** the E2E test uploads this file via the Universe screen import dialog, **Then** the test asserts the import succeeds (no 400 error, success toast is shown) — and **currently FAILS** because the server returns 400.

2. **Given** the test is added to `apps/dms-material-e2e/src/csv-import-regression-69.spec.ts`, **When** `pnpm all` runs, **Then** the new test is the only failing test (all other tests continue to pass).

3. **Given** no production code is changed in this story, **When** `pnpm all` runs, **Then** all previously passing tests continue to pass (new failing test marked `test.fail()`).

## Tasks / Subtasks

- [ ] **Task 1: Read existing import test infrastructure** (AC: #2, #3)
  - [ ] Subtask 1.1: Read `apps/dms-material-e2e/src/fidelity-import.spec.ts` — understand helper imports, fixture upload pattern, seed/cleanup lifecycle
  - [ ] Subtask 1.2: Read `apps/dms-material-e2e/src/helpers/seed-import-data.helper.ts` — understand how universe entry and account are created
  - [ ] Subtask 1.3: Note the `FIXTURES_DIR`, `uploadFile`, `openImportDialog`, `clickUpload`, `waitForImportResult` helpers and the `page.waitForResponse` pattern for capturing API response body

- [ ] **Task 2: Create the synthetic fixture CSV** (AC: #1)
  - [ ] Subtask 2.1: Create `apps/dms-material-e2e/fixtures/fidelity-regression-69.csv` using invented ticker `REGT` and account `"Regression 69 Test Account"` with account number `99887766`
  - [ ] Subtask 2.2: Use the standard Fidelity header row format (see Dev Notes)
  - [ ] Subtask 2.3: Include 2–3 `YOU BOUGHT` rows with synthetic dates, quantities, prices, and amounts — no real personal data
  - [ ] Subtask 2.4: Verify the CSV can be parsed by reading `apps/server/src/app/routes/import/fidelity-csv-parser.function.ts` to confirm expected column names

- [ ] **Task 3: Write the failing E2E test** (AC: #1, #2, #3)
  - [ ] Subtask 3.1: Create `apps/dms-material-e2e/src/csv-import-regression-69.spec.ts`
  - [ ] Subtask 3.2: Follow the lifecycle pattern from `fidelity-import.spec.ts` — `beforeAll` seeds a universe entry + account, `afterAll` cleans up
  - [ ] Subtask 3.3: In `beforeEach` call `login(page)` and navigate to `/global/universe`
  - [ ] Subtask 3.4: Add a test that opens the import dialog, uploads `fidelity-regression-69.csv`, calls `clickUpload`, captures the `/api/import/fidelity` response, and asserts `responseBody.success === true`
  - [ ] Subtask 3.5: Wrap the test with `test.fail()` to mark it as an expected failure (it will fail because the server returns 400)
  - [ ] Subtask 3.6: Confirm that `pnpm all` passes with the expected-fail annotation in place

## Dev Notes

### Background

Epic 69 documents a regression introduced by Epics 63–66 that causes `POST /api/import/fidelity` to return 400 Bad Request. The server log shows the request arrives but no further log lines appear before the 400 is sent, suggesting the handler throws synchronously before reaching `importFidelityTransactions`. This story writes the reproducer test; Story 69.2 finds and fixes the root cause.

### Key Files

| File | Purpose |
|------|---------|
| `apps/dms-material-e2e/fixtures/fidelity-regression-69.csv` | New synthetic fixture — 3 buy rows, invented ticker |
| `apps/dms-material-e2e/src/csv-import-regression-69.spec.ts` | New failing E2E test |
| `apps/dms-material-e2e/src/fidelity-import.spec.ts` | Reference pattern for CSV upload lifecycle |
| `apps/dms-material-e2e/src/helpers/seed-import-data.helper.ts` | Reference seed/cleanup pattern |
| `apps/server/src/app/routes/import/index.ts` | Handler for `POST /api/import/fidelity` |
| `apps/server/src/app/routes/import/fidelity-import-service.function.ts` | Orchestrator called by route handler |
| `apps/server/src/app/routes/import/fidelity-csv-parser.function.ts` | CSV parser — check expected column names |

### Fixture CSV Format

Standard Fidelity header row:
```
Run Date,Account,Account Number,Action,Symbol,Description,Type,Price ($),Quantity,Commission ($),Fees ($),Accrued Interest ($),Amount ($),Settlement Date
```

Example synthesised buy rows for `fidelity-regression-69.csv`:
```
08/15/2025,Regression 69 Test Account,99887766,YOU BOUGHT,REGT,REGT INC COMMON STOCK,Stock,10.00,100,,,,-1000.00,08/17/2025
07/10/2025,Regression 69 Test Account,99887766,YOU BOUGHT,REGT,REGT INC COMMON STOCK,Stock,9.50,200,,,,-1900.00,07/12/2025
06/05/2025,Regression 69 Test Account,99887766,YOU BOUGHT,REGT,REGT INC COMMON STOCK,Stock,9.00,150,,,,-1350.00,06/07/2025
```

**Important:** Use the same account name string in both the fixture CSV and the seed helper so the import can match the account.

### Notes on `test.fail()`

Use `test.fail()` at the top of the test body (before any awaits) to mark the test as an expected failure. Remove this annotation in Story 69.2 when the fix makes the test green.

### Project Structure Notes

- Fixture files live in `apps/dms-material-e2e/fixtures/` (not `src/fixtures/`)
- The `uploadFile` helper in `fidelity-import.spec.ts` uses `path.join(FIXTURES_DIR, filename)` and `fileInput.setInputFiles(filePath)`
- The import endpoint is `POST /api/import/fidelity` (confirmed in `apps/server/src/app/routes/import/index.ts` line 158)
- `pnpm all` runs unit tests + e2e tests; the new test must be the only new failure

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-13.md - Epic 69 Story 69.1]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
