# Story 57.3: Add E2E Test for Reverse-Split CSV Import

Status: Approved

## Story

As a portfolio manager,
I want an automated E2E test to verify that importing a Fidelity CSV containing reverse-split rows
correctly adjusts open lots,
so that any future regression is caught immediately.

## Acceptance Criteria

1. **Given** the database is seeded with open lots for MSTY, ULTY, and OXLC at known quantities and
   prices,
   **When** a fixture CSV containing all three reverse-split pairs is uploaded via the import UI,
   **Then** the E2E test passes and the lot quantities and buy prices for each symbol are updated
   correctly in the database after import.

2. **Given** the MSTY reverse-split pair is uploaded (1-for-5),
   **When** import completes,
   **Then** the UI displays the updated MSTY lots with quantities divided by 5 (floored) and buy
   prices multiplied by 5.

3. **Given** the ULTY reverse-split pair is uploaded (1-for-10),
   **When** import completes,
   **Then** the UI displays the updated ULTY lots with quantities divided by 10 (floored) and buy
   prices multiplied by 10.

4. **Given** the OXLC reverse-split pair is uploaded (1-for-5),
   **When** import completes,
   **Then** the UI displays the updated OXLC lots with quantities divided by 5 (floored) and buy
   prices multiplied by 5.

5. **Given** the E2E test is run in CI,
   **When** it completes,
   **Then** the test exits 0 and leaves no test data artefacts in the database.

## Definition of Done

- [ ] Fixture CSV file created with MSTY, ULTY, and OXLC reverse-split pairs (Fidelity format)
- [ ] Seed helper creates the necessary pre-split open lots in the test database
- [ ] E2E spec covers all three symbols
- [ ] Test passes in `pnpm all` (or the e2e runner command)
- [ ] No hard-coded absolute paths in the spec

## Tasks / Subtasks

- [ ] **Task 1: Create fixture CSV file**

  - [ ] Place under `apps/dms-material-e2e/src/fixtures/` (or wherever existing fixtures live)
  - [ ] Include the MSTY 1-for-5 pair (from Story 57.1 examples)
  - [ ] Include the ULTY 1-for-10 pair
  - [ ] Include the OXLC 1-for-5 pair
  - [ ] File should be a valid Fidelity CSV (headers + data rows)

- [ ] **Task 2: Create / extend seed helper**

  - [ ] Locate existing `seed-split-import-e2e-data.helper.ts` (if it exists from Epic 48 stories)
  - [ ] If it exists, extend it with MSTY, ULTY, OXLC pre-split lots
  - [ ] If it does not exist, create `apps/dms-material-e2e/src/helpers/seed-split-import-e2e-data.helper.ts`
  - [ ] Seed known quantities so the test can assert exact post-split values
  - [ ] Ensure the teardown removes seeded rows

- [ ] **Task 3: Write / extend the E2E spec**

  - [ ] Locate `apps/dms-material-e2e/src/split-import-e2e.spec.ts`
  - [ ] If the file was created by Epic 48 stories, add the three new test cases to it
  - [ ] If the file does not exist, create it following the pattern of existing e2e specs
  - [ ] Each test case:
    - Seeds pre-split lots
    - Navigates to the import page
    - Uploads the fixture CSV
    - Waits for confirmation of successful import
    - Asserts the updated lot quantities and buy prices in the UI or via API call
    - Cleans up seeded data

- [ ] **Task 4: Run tests**
  - [ ] `pnpm all` passes
  - [ ] E2E tests pass in isolation

## Dev Notes

### Key Files

| File                                                                     | Purpose                            |
| ------------------------------------------------------------------------ | ---------------------------------- |
| `apps/dms-material-e2e/src/split-import-e2e.spec.ts`                     | Target E2E spec (extend or create) |
| `apps/dms-material-e2e/src/helpers/seed-split-import-e2e-data.helper.ts` | DB seed helper (extend or create)  |
| `apps/dms-material-e2e/src/fixtures/`                                    | Fixture CSV files                  |
| `apps/dms-material-e2e/playwright.config.ts`                             | Playwright configuration           |
| `apps/server/src/app/routes/import/fidelity-import-service.function.ts`  | Server-side import endpoint        |

### Fixture CSV format (Fidelity)

Minimum required columns (Fidelity format — check existing import tests for exact header order):

```
Run Date, Action, Symbol, Quantity, Price, Change, Amount, Description, Settlement Date, ...
```

### MSTY pair (1-for-5)

```csv
12/08/2025,REVERSE SPLIT R/S FROM 88634T493#REOR M0051704770001,MSTY,80,,,,TIDAL TRUST II YIELDMAX MSTR OP,...
12/08/2025,REVERSE SPLIT R/S TO 88636X732#REOR M0051704770000,88634T493,-400,,,,TIDAL TR II YIELDMAX MSTR OPT INCOME STRATGY ETF 1 FOR 5 R/S INTO TIDAL TRUST II YIELDMAX MSTR OPT INCOME STRATGY ETF,...
```

### ULTY pair (1-for-10)

```csv
12/09/2025,REVERSE SPLIT R/S FROM {cusip_new}#REOR M0051xxxxxx1,ULTY,100,,,,ULTRA SHORT INCOME BASED FUND,...
12/09/2025,REVERSE SPLIT R/S TO {cusip_old}#REOR M0051xxxxxx0,{cusip_old},-1000,,,,ULTRA SHORT INCOME 1 FOR 10 R/S,...
```

(Replace `{cusip_new}` / `{cusip_old}` with actual CUSIPs from the investigation — see Story 57.1
Dev Agent Record)

### OXLC pair (1-for-5)

```csv
12/10/2025,REVERSE SPLIT R/S FROM {cusip_new}#REOR M0051yyyyyy1,OXLC,306,,,,OFS CAPITAL,...
12/10/2025,REVERSE SPLIT R/S TO {cusip_old}#REOR M0051yyyyyy0,{cusip_old},-1530,,,,OFS CAPITAL 1 FOR 5 R/S,...
```

### Assertion values

| Symbol | Seed lots | Pre-split qty | Post-split qty | Pre-split price | Post-split price |
| ------ | --------- | ------------- | -------------- | --------------- | ---------------- |
| MSTY   | 1 lot     | 400           | 80             | $2.00           | $10.00           |
| ULTY   | 1 lot     | 1000          | 100            | $3.00           | $30.00           |
| OXLC   | 1 lot     | 1530          | 306            | $1.00           | $5.00            |

Adjust seed values as needed once Story 57.1 and 57.2 are complete.

> **Depends On**: Story 57.2 must be fully complete before this E2E test is meaningful.
