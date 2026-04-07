# Story 57.1: Investigate Existing Reverse-Split Import Code and Identify Gaps

Status: Approved

## Story

As a developer,
I want a thorough audit of the existing split-import code against the actual Fidelity CSV format,
so that I know exactly what works, what is broken, and what needs to be built before writing any
fix code.

## Acceptance Criteria

1. **Given** the existing `isSplitRow`, `calculateSplitRatio`, and `adjustLotsForSplit` functions in
   `apps/server/src/app/routes/import/`,
   **When** a developer runs the import with a CSV containing a "REVERSE SPLIT R/S FROM … / R/S TO
   …" pair like the MSTY example,
   **Then** the investigation confirms whether the pair is detected, the ratio calculated correctly
   (|old_shares| / new_shares), and the open lots adjusted.

2. **Given** the investigation is complete,
   **When** the developer documents the findings in the Dev Agent Record section of this story file,
   **Then** the findings include: which functions work correctly, which need modification, and the
   exact code changes required to handle the three examples.

3. **Given** the findings are documented,
   **When** Story 57.2 begins,
   **Then** the developer can proceed with implementation without further research.

## Definition of Done

- [ ] Manual test run (or targeted unit test) confirms whether the existing code handles the MSTY/ULTY/OXLC CSV rows
- [ ] Findings documented in Dev Agent Record, including:
  - Whether "REVERSE SPLIT R/S FROM" is detected by `isSplitRow()`
  - Whether `calculateSplitRatio()` can derive the ratio from the paired row format
  - Whether account scoping is applied correctly
  - Whether the CUSIP-as-symbol on the "R/S TO" row is resolved back to the real symbol
- [ ] No production code is changed in this story

## Tasks / Subtasks

- [ ] **Task 1: Read all existing split-import code**
  - [ ] `apps/server/src/app/routes/import/is-split-row.function.ts`
  - [ ] `apps/server/src/app/routes/import/calculate-split-ratio.function.ts`
  - [ ] `apps/server/src/app/routes/import/adjust-lots-for-split.function.ts`
  - [ ] `apps/server/src/app/routes/import/is-in-lieu-row.function.ts`
  - [ ] `apps/server/src/app/routes/import/fidelity-csv-parser.function.ts` — how split rows are identified and routed
  - [ ] `apps/server/src/app/routes/import/fidelity-import-service.function.ts` — orchestration; where split pairs are grouped and processed

- [ ] **Task 2: Test against the three example CSV rows**

  Example 1 — MSTY 1-for-5:
  ```
  Dec-8-2025,REVERSE SPLIT R/S FROM 88634T493#REOR M0051704770001,MSTY,80,--,--,"+2,637.48",...,Joint Brokerage *4767
  Dec-8-2025,REVERSE SPLIT R/S TO 88636X732#REOR M0051704770000,88634T493,-400,--,--,"+2,637.48",...,Joint Brokerage *4767
  ```

  Example 2 — ULTY 1-for-10:
  ```
  Dec-1-2025,REVERSE SPLIT R/S FROM 88636J527#REOR M0051702900001,ULTY,100,--,--,"+1,697.07",...,Joint Brokerage *4767
  Dec-1-2025,REVERSE SPLIT R/S TO 88636X708#REOR M0051702900000,88636J527,"-1,000",--,--,"+1,697.07",...,Joint Brokerage *4767
  ```

  Example 3 — OXLC 1-for-5:
  ```
  Sep-8-2025,REVERSE SPLIT R/S FROM 691543102#REOR M0051680750001,OXLC,306,--,--,"+3,672.63",...,Joint Brokerage *4767
  Sep-8-2025,REVERSE SPLIT R/S TO 691543847#REOR M0051680750000,691543102,"-1,530",--,--,"+3,672.63",...,Joint Brokerage *4767
  ```

  - [ ] Parse each pair manually (or write a throwaway test) through `isSplitRow()`, `calculateSplitRatio()`, `adjustLotsForSplit()`
  - [ ] Determine if the "FROM" row is recognised as a split (description contains "REVERSE SPLIT")
  - [ ] Determine if the "TO" row is recognised as a split
  - [ ] Determine how the ratio is currently calculated — is it from description text or from comparing row quantities?
  - [ ] Determine if the existing code looks up the symbol from CUSIP on the "TO" row (symbol field is `88634T493` etc.)
  - [ ] Determine if account scoping works with "Joint Brokerage *4767" format

- [ ] **Task 3: Check existing e2e test for context**
  - [ ] Read `apps/dms-material-e2e/src/split-import-e2e.spec.ts` and `apps/dms-material-e2e/src/helpers/seed-split-import-e2e-data.helper.ts`
  - [ ] Note what the existing test covers (OXLC 1-for-5) vs what is not covered
  - [ ] Check whether the existing e2e test passes currently

- [ ] **Task 4: Document findings in Dev Agent Record below**

## Dev Notes

### Key Files

| File | Purpose |
|------|---------|
| `apps/server/src/app/routes/import/is-split-row.function.ts` | Detects split rows |
| `apps/server/src/app/routes/import/calculate-split-ratio.function.ts` | Computes split ratio |
| `apps/server/src/app/routes/import/adjust-lots-for-split.function.ts` | Adjusts open lots |
| `apps/server/src/app/routes/import/is-in-lieu-row.function.ts` | Detects "IN LIEU OF FRX SHARE" cash payout rows |
| `apps/server/src/app/routes/import/fidelity-csv-parser.function.ts` | Main CSV parser |
| `apps/server/src/app/routes/import/fidelity-import-service.function.ts` | Import orchestrator |
| `apps/dms-material-e2e/src/split-import-e2e.spec.ts` | Existing split e2e test (OXLC) |
| `apps/dms-material-e2e/src/helpers/seed-split-import-e2e-data.helper.ts` | Seed helper for split tests |

### Paired row format

The Fidelity reverse-split CSV format uses **pairs** of rows with matching reference IDs:

| Field       | "FROM" row (new shares received)    | "TO" row (old shares removed)        |
|-------------|--------------------------------------|--------------------------------------|
| description | `REVERSE SPLIT R/S FROM {old_cusip}#REOR {ref}` | `REVERSE SPLIT R/S TO {new_cusip}#REOR {ref}` |
| symbol      | NEW ticker (e.g. `MSTY`)             | OLD CUSIP (e.g. `88634T493`)         |
| quantity    | New share count (positive, e.g. 80)  | Old share count (negative, e.g. -400)|

Ratio = |TO quantity| ÷ FROM quantity = 400 ÷ 80 = 5 (1-for-5 reverse split)

### "IN LIEU OF FRX SHARE"

After a reverse split, if the old holdings weren't a clean multiple of the ratio, Fidelity
generates an additional "IN LIEU OF FRX SHARE" cash payout row.  `isInLieuRow()` already exists
to detect these.  Confirm it prevents a duplicate fractional-sale entry.

## Dev Agent Record

> _(To be filled in by the implementing dev agent.)_

### Findings

**`isSplitRow()` — does it detect reverse split rows?**
_(Answer after reading the code and testing against examples.)_

**`calculateSplitRatio()` — can it derive ratio from paired rows?**
_(Answer after reading the code and testing against examples.)_

**Account scoping — is it correct?**
_(Answer after reading the code.)_

**CUSIP-to-symbol resolution on "TO" row — does it exist?**
_(Answer after reading the code.)_

**What needs to change for Story 57.2?**
_(List specific functions and the exact changes needed.)_
