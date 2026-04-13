# Story 69.3: Add Comprehensive CSV Import Regression Suite

Status: Approved

## Story

As a developer,
I want a suite of CSV import tests covering the happy path and key error cases,
so that any future regressions in this critical feature are caught immediately.

## Acceptance Criteria

1. **Given** the existing and new fixture CSVs, **When** the e2e suite at `apps/dms-material-e2e/src/csv-import-regression-69.spec.ts` runs, **Then** it covers at minimum: (a) successful full import, (b) import of an already-imported file is idempotent, (c) empty CSV file returns a 400 with a meaningful error message.

2. **Given** all tests in the suite, **When** `pnpm all` runs, **Then** all tests pass.

3. **Given** the existing import e2e tests in `fidelity-import.spec.ts`, **When** `pnpm all` runs, **Then** all previously passing tests continue to pass (no regressions).

## Tasks / Subtasks

- [ ] **Task 1: Review existing import test coverage** (AC: #1, #3)
  - [ ] Subtask 1.1: Read `apps/dms-material-e2e/src/fidelity-import.spec.ts` in full — note which scenarios are already covered (happy path, invalid account, invalid quantity, duplicates, mixed content)
  - [ ] Subtask 1.2: Identify gaps that the regression suite (`csv-import-regression-69.spec.ts`) should fill beyond what `fidelity-import.spec.ts` already tests
  - [ ] Subtask 1.3: Confirm that `csv-import-regression-69.spec.ts` from Story 69.1/69.2 already has the happy-path test

- [ ] **Task 2: Create the empty-file fixture** (AC: #1)
  - [ ] Subtask 2.1: Create `apps/dms-material-e2e/fixtures/fidelity-empty-69.csv` — a file that contains only the Fidelity header row and no data rows
  - [ ] Subtask 2.2: Verify the server currently returns 400 with a meaningful error body for an empty CSV (check `fidelity-csv-parser.function.ts` for empty-rows validation)

- [ ] **Task 3: Add the idempotent re-import test case** (AC: #1)
  - [ ] Subtask 3.1: Add a test in `csv-import-regression-69.spec.ts` that uploads `fidelity-regression-69.csv` a second time after the happy-path test
  - [ ] Subtask 3.2: Assert that the response is still `2xx` (idempotent) and that `imported` count reflects only the new rows (or `0` if all are duplicates) — check the existing `fidelity-duplicates.csv` test in `fidelity-import.spec.ts` for the expected response shape

- [ ] **Task 4: Add the empty-file test case** (AC: #1)
  - [ ] Subtask 4.1: Add a test in `csv-import-regression-69.spec.ts` that uploads `fidelity-empty-69.csv`
  - [ ] Subtask 4.2: Assert the response status is 400 (or that `success === false` and `errors` array is non-empty with a meaningful message)

- [ ] **Task 5: Verify the full suite is green** (AC: #2, #3)
  - [ ] Subtask 5.1: Run `pnpm all` and confirm all three new tests in `csv-import-regression-69.spec.ts` are green
  - [ ] Subtask 5.2: Confirm `fidelity-import.spec.ts` remains fully green

## Dev Notes

### Background

After Story 69.2 fixes the 400 regression, the test added in Story 69.1 becomes green. This story expands that spec file to cover additional edge cases, acting as a regression guard for the import feature going forward.

### Key Files

| File | Purpose |
|------|---------|
| `apps/dms-material-e2e/src/csv-import-regression-69.spec.ts` | Regression suite (from Stories 69.1/69.2) — expand here |
| `apps/dms-material-e2e/fixtures/fidelity-regression-69.csv` | Happy-path fixture (from Story 69.1) |
| `apps/dms-material-e2e/fixtures/fidelity-empty-69.csv` | New fixture — header row only, no data |
| `apps/dms-material-e2e/src/fidelity-import.spec.ts` | Existing comprehensive import tests (read to avoid duplication) |
| `apps/server/src/app/routes/import/fidelity-csv-parser.function.ts` | Empty-rows validation logic |

### Fixture: fidelity-empty-69.csv

The file should contain only the header row and nothing else:
```
Run Date,Account,Account Number,Action,Symbol,Description,Type,Price ($),Quantity,Commission ($),Fees ($),Accrued Interest ($),Amount ($),Settlement Date
```

### Expected Test Structure for csv-import-regression-69.spec.ts

```
test.describe('CSV Import Regression Suite — Epic 69', () => {
  // beforeAll: seed universe entry + account
  // afterAll: cleanup

  test('happy path: valid CSV imports successfully', ...)
  test('idempotent: re-importing the same CSV does not create duplicates', ...)
  test('empty CSV returns 400 with error message', ...)
})
```

### Notes on the Idempotent Test

Read `apps/dms-material-e2e/src/fidelity-import.spec.ts` — it already has a "re-import duplicates" test. The regression suite's idempotent test should confirm the same behaviour but using the `fidelity-regression-69.csv` fixture and seeded account.

### Project Structure Notes

- Fixture files: `apps/dms-material-e2e/fixtures/`
- E2E tests: `apps/dms-material-e2e/src/`
- `pnpm all` = unit tests + e2e; must be fully green after this story

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-13.md - Epic 69 Story 69.3]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
