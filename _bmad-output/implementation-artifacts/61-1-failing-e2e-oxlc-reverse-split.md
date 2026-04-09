# Story 61.1: Write Failing E2E Test for CUSIP-Stored Lots Reverse-Split Import

Status: Approved

> **Scope note:** OXLC (CUSIP `691543102`) is the **concrete failing example** used in this story.
> The test uses real OXLC CSV data to expose a **general bug**: when pre-split lots are stored
> under a raw CUSIP symbol rather than a ticker, the reverse-split lot-adjustment path does not
> find or update them. Other symbols with the same storage pattern will exhibit the same failure.
> The implementation fix (Story 61.2) must therefore be symbol-agnostic.

## Story

As a developer,
I want a Playwright e2e test that imports the exact OXLC CSV data from the epic description and
asserts the correct post-split quantities and prices,
so that I have a reproducible red test that drives the fix in Story 61.2.

## Acceptance Criteria

1. **Given** a test database seeded with the four OXLC pre-split lots (300 shares @ $4.50, 150
   shares @ $4.49, 500 shares @ $4.06, 580 shares @ $3.44) recorded under CUSIP `691543102`,
   **When** the provided OXLC reverse-split CSV (Jun-11 / Jun-26 / Aug-5 "YOU BOUGHT" rows and the
   Sep-8 "REVERSE SPLIT R/S FROM/TO" rows) is uploaded via the CSV import dialog,
   **Then** the expected post-split lot adjustments (60, 30, 100, 116 shares) are NOT applied —
   and the test currently **FAILS** (confirming the bug).

2. **Given** the test is committed,
   **When** `pnpm run e2e:dms-material:chromium` runs,
   **Then** the new test fails.

3. **Given** all other existing tests are unmodified,
   **When** the test suite runs,
   **Then** all previously passing tests continue to pass.

## Definition of Done

- [ ] Playwright test file `oxlc-reverse-split.spec.ts` created in `apps/dms-material-e2e/src/` (or existing split test extended with an OXLC-CUSIP-specific test)
- [ ] Fixture CSV `fidelity-oxlc-cusip-reverse-split.csv` created in `apps/dms-material-e2e/src/fixtures/` containing the exact rows from the epic description
- [ ] Seeder helper creates the four pre-split lots under symbol `691543102` in the test account (quantities and prices matching the epic)
- [ ] Test uploads the CSV, queries the resulting trades, and asserts the four lots now have quantities 60, 30, 100, 116 — currently **fails**
- [ ] `pnpm all` passes

## Tasks / Subtasks

- [ ] **Task 1: Read existing split import test infrastructure**

  - [ ] Read `apps/dms-material-e2e/src/split-import-e2e.spec.ts` — understand existing test structure
  - [ ] Read `apps/dms-material-e2e/src/helpers/seed-split-import-e2e-data.helper.ts` — understand seed pattern
  - [ ] Identify where fixture CSV files are stored

- [ ] **Task 2: Create the fixture CSV**

  - [ ] Create `apps/dms-material-e2e/src/fixtures/fidelity-oxlc-cusip-reverse-split.csv` with the
        exact content from the epic description:
        `   Jun-11-2025,YOU BOUGHT,691543102,300,4.50,"-1,348.50","+2,624.29",OXFORD LANE CAPITAL CORP 1 FOR 5 R/S INTO OXFORD LANE CAPITAL CORP COM USD0.01 CUSIP #691543847,--,--,Joint Brokerage *4767
Jun-11-2025,YOU BOUGHT,691543102,150,4.49,-673.50,"+3,972.79",OXFORD LANE CAPITAL CORP 1 FOR 5 R/S INTO OXFORD LANE CAPITAL CORP COM USD0.01 CUSIP #691543847,--,--,Joint Brokerage *4767
Jun-26-2025,YOU BOUGHT,691543102,500,4.06,"-2,032.30","+4,345.31",OXFORD LANE CAPITAL CORP 1 FOR 5 R/S INTO OXFORD LANE CAPITAL CORP COM USD0.01 CUSIP #691543847,--,--,Joint Brokerage *4767
Aug-5-2025,YOU BOUGHT,691543102,580,3.44,"-1,995.20","+99,068.30",OXFORD LANE CAPITAL CORP 1 FOR 5 R/S INTO OXFORD LANE CAPITAL CORP COM USD0.01 CUSIP #691543847,--,--,Joint Brokerage *4767
Sep-8-2025,REVERSE SPLIT R/S FROM 691543102#REOR M0051680750001,OXLC,306,--,--,"+3,672.63",OXFORD LANE CAP CORP COM,--,--,Joint Brokerage *4767
Sep-8-2025,REVERSE SPLIT R/S TO 691543847#REOR M0051680750000,691543102,"-1,530",--,--,"+3,672.63",OXFORD LANE CAPITAL CORP 1 FOR 5 R/S INTO OXFORD LANE CAPITAL CORP COM USD0.01 CUSIP #691543847,--,--,Joint Brokerage *4767`
  - [ ] Ensure the CSV has the correct Fidelity header row

- [ ] **Task 3: Create the seeder helper**

  - [ ] Create or extend a seeder helper that inserts four trades into the test account under symbol
        `691543102` (not `OXLC`): 300 @ $4.50, 150 @ $4.49, 500 @ $4.06, 580 @ $3.44
  - [ ] Also register CUSIP `691543102` → `OXLC` in the `cusip_cache` table

- [ ] **Task 4: Write the failing E2E test**
  - [ ] Create `apps/dms-material-e2e/src/oxlc-reverse-split.spec.ts`
  - [ ] Seed the pre-split lots using the seeder
  - [ ] Upload the fixture CSV via the import dialog
  - [ ] Query the trades table (via an API endpoint or direct DB access) for `OXLC` lots
  - [ ] Assert quantities are 60, 30, 100, 116 — test should currently fail
  - [ ] Confirm test is red

## Dev Notes

### Key Files

| File                                                                     | Purpose                                   |
| ------------------------------------------------------------------------ | ----------------------------------------- |
| `apps/dms-material-e2e/src/split-import-e2e.spec.ts`                     | Reference for existing split test pattern |
| `apps/dms-material-e2e/src/helpers/seed-split-import-e2e-data.helper.ts` | Reference seeder helper                   |
| `apps/server/src/app/routes/import/adjust-lots-for-split.function.ts`    | Where the lot adjustment happens          |
| `apps/server/src/app/routes/import/fidelity-import-service.function.ts`  | Import orchestrator                       |

### OXLC CSV Data (exact content from epic description)

Pre-split "YOU BOUGHT" rows — note symbol field uses CUSIP `691543102` (not the ticker `OXLC`):

```
Jun-11-2025,YOU BOUGHT,691543102,300,4.50,...
Jun-11-2025,YOU BOUGHT,691543102,150,4.49,...
Jun-26-2025,YOU BOUGHT,691543102,500,4.06,...
Aug-5-2025,YOU BOUGHT,691543102,580,3.44,...
```

Reverse split rows:

```
Sep-8-2025,REVERSE SPLIT R/S FROM 691543102#REOR M0051680750001,OXLC,306,...
Sep-8-2025,REVERSE SPLIT R/S TO 691543847#REOR M0051680750000,691543102,-1530,...
```

### Expected Post-Split Lots

| Pre-split qty | Pre-split price | Post-split qty (÷5, floor) | Post-split price (×5) |
| ------------- | --------------- | -------------------------- | --------------------- |
| 300           | $4.50           | 60                         | $22.50                |
| 150           | $4.49           | 30                         | $22.45                |
| 500           | $4.06           | 100                        | $20.30                |
| 580           | $3.44           | 116                        | $17.20                |

### Root Cause Hypothesis

The lot-adjustment path in `adjustLotsForSplit()` searches for open lots by symbol name. The open
lots are stored under `691543102` (the CUSIP), but the reverse-split "FROM" row identifies the new
symbol as `OXLC`. The resolver likely queries trades by ticker symbol `OXLC` and finds nothing,
leaving the CUSIP lots unadjusted.

This is a **general bug** affecting any symbol whose lots were imported with a CUSIP in the symbol
field. OXLC is simply the first known case. The fix must not be OXLC-specific.

## Dev Agent Record

_To be filled in by the implementing agent._
