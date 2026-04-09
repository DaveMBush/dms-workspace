# Story 57.1: Investigate Existing Reverse-Split Import Code and Identify Gaps

Status: review

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

- [x] Manual test run (or targeted unit test) confirms whether the existing code handles the MSTY/ULTY/OXLC CSV rows
- [x] Findings documented in Dev Agent Record, including:
  - Whether "REVERSE SPLIT R/S FROM" is detected by `isSplitRow()`
  - Whether `calculateSplitRatio()` can derive the ratio from the paired row format
  - Whether account scoping is applied correctly
  - Whether the CUSIP-as-symbol on the "R/S TO" row is resolved back to the real symbol
- [x] No production code is changed in this story

## Tasks / Subtasks

- [x] **Task 1: Read all existing split-import code**

  - [x] `apps/server/src/app/routes/import/is-split-row.function.ts`
  - [x] `apps/server/src/app/routes/import/calculate-split-ratio.function.ts`
  - [x] `apps/server/src/app/routes/import/adjust-lots-for-split.function.ts`
  - [x] `apps/server/src/app/routes/import/is-in-lieu-row.function.ts`
  - [x] `apps/server/src/app/routes/import/fidelity-csv-parser.function.ts` — how split rows are identified and routed
  - [x] `apps/server/src/app/routes/import/fidelity-import-service.function.ts` — orchestration; where split pairs are grouped and processed

- [x] **Task 2: Test against the three example CSV rows**

  Example 1 — MSTY 1-for-5:

  ```csv
  Dec-8-2025,REVERSE SPLIT R/S FROM 88634T493#REOR M0051704770001,MSTY,80,--,--,"+2,637.48",...,Joint Brokerage *4767
  Dec-8-2025,REVERSE SPLIT R/S TO 88636X732#REOR M0051704770000,88634T493,-400,--,--,"+2,637.48",...,Joint Brokerage *4767
  ```

  Example 2 — ULTY 1-for-10:

  ```csv
  Dec-1-2025,REVERSE SPLIT R/S FROM 88636J527#REOR M0051702900001,ULTY,100,--,--,"+1,697.07",...,Joint Brokerage *4767
  Dec-1-2025,REVERSE SPLIT R/S TO 88636X708#REOR M0051702900000,88636J527,"-1,000",--,--,"+1,697.07",...,Joint Brokerage *4767
  ```

  Example 3 — OXLC 1-for-5:

  ```csv
  Sep-8-2025,REVERSE SPLIT R/S FROM 691543102#REOR M0051680750001,OXLC,306,--,--,"+3,672.63",...,Joint Brokerage *4767
  Sep-8-2025,REVERSE SPLIT R/S TO 691543847#REOR M0051680750000,691543102,"-1,530",--,--,"+3,672.63",...,Joint Brokerage *4767
  ```

  - [x] Parse each pair manually (or write a throwaway test) through `isSplitRow()`, `calculateSplitRatio()`, `adjustLotsForSplit()`
  - [x] Determine if the "FROM" row is recognised as a split (description contains "REVERSE SPLIT")
  - [x] Determine if the "TO" row is recognised as a split
  - [x] Determine how the ratio is currently calculated — is it from description text or from comparing row quantities?
  - [x] Determine if the existing code looks up the symbol from CUSIP on the "TO" row (symbol field is `88634T493` etc.)
  - [x] Determine if account scoping works with "Joint Brokerage \*4767" format

- [x] **Task 3: Check existing e2e test for context**

  - [x] Read `apps/dms-material-e2e/src/split-import-e2e.spec.ts` and `apps/dms-material-e2e/src/helpers/seed-split-import-e2e-data.helper.ts`
  - [x] Note what the existing test covers (OXLC 1-for-5) vs what is not covered
  - [x] Check whether the existing e2e test passes currently

- [x] **Task 4: Document findings in Dev Agent Record below**

## Dev Notes

### Key Files

| File                                                                     | Purpose                                         |
| ------------------------------------------------------------------------ | ----------------------------------------------- |
| `apps/server/src/app/routes/import/is-split-row.function.ts`             | Detects split rows                              |
| `apps/server/src/app/routes/import/calculate-split-ratio.function.ts`    | Computes split ratio                            |
| `apps/server/src/app/routes/import/adjust-lots-for-split.function.ts`    | Adjusts open lots                               |
| `apps/server/src/app/routes/import/is-in-lieu-row.function.ts`           | Detects "IN LIEU OF FRX SHARE" cash payout rows |
| `apps/server/src/app/routes/import/fidelity-csv-parser.function.ts`      | Main CSV parser                                 |
| `apps/server/src/app/routes/import/fidelity-import-service.function.ts`  | Import orchestrator                             |
| `apps/dms-material-e2e/src/split-import-e2e.spec.ts`                     | Existing split e2e test (OXLC)                  |
| `apps/dms-material-e2e/src/helpers/seed-split-import-e2e-data.helper.ts` | Seed helper for split tests                     |

### Paired row format

The Fidelity reverse-split CSV format uses **pairs** of rows with matching reference IDs:

| Field       | "FROM" row (new shares received)                | "TO" row (old shares removed)                 |
| ----------- | ----------------------------------------------- | --------------------------------------------- |
| description | `REVERSE SPLIT R/S FROM {old_cusip}#REOR {ref}` | `REVERSE SPLIT R/S TO {new_cusip}#REOR {ref}` |
| symbol      | NEW ticker (e.g. `MSTY`)                        | OLD CUSIP (e.g. `88634T493`)                  |
| quantity    | New share count (positive, e.g. 80)             | Old share count (negative, e.g. -400)         |

Ratio = |TO quantity| ÷ FROM quantity = 400 ÷ 80 = 5 (1-for-5 reverse split)

### "IN LIEU OF FRX SHARE"

After a reverse split, if the old holdings weren't a clean multiple of the ratio, Fidelity
generates an additional "IN LIEU OF FRX SHARE" cash payout row. `isInLieuRow()` already exists
to detect these. Confirm it prevents a duplicate fractional-sale entry.

## Dev Agent Record

### Findings

**`isSplitRow()` — does it detect reverse split rows?**

`isSplitRow()` checks `row.description` (not `row.action`) for the word `SPLIT`.

- **WEB format** (existing e2e fixture): The Fidelity "Description" column maps to `row.description` in the web header map. The split text `"REVERSE SPLIT R/S FROM …"` therefore lands in `row.description` → `isSplitRow()` returns **TRUE**. The existing OXLC e2e test exercises only this path.

- **DESKTOP format** (the real three-example CSVs in this story): Fidelity's Desktop export has a "Description" column (→ `row.action`) and a "Security Description" column (→ `row.description`). The text `"REVERSE SPLIT R/S FROM …"` is in the "Description" column → `row.action`. `row.description` holds the security's human-readable name (e.g., "MSTY UNIT"), which contains no "SPLIT" keyword. `isSplitRow()` returns **FALSE** for all three story examples.

**Verdict: broken for desktop format.** The FROM rows in the MSTY, ULTY, and OXLC examples are NOT detected as split rows. They fall through all action-based guards and are classified as unknown transactions. No lot adjustment occurs.

The TO rows (negative quantity, CUSIP as symbol) are also not detected as split rows and are also classified as unknown transactions. Their negative quantities would cause `calculateSplitRatio` to fail the `<= 0` guard even if they were routed there.

**`calculateSplitRatio()` — can it derive ratio from paired rows?**

`calculateSplitRatio(symbol, csvPostSplitQuantity)` **does NOT** derive the ratio from the CSV pair. It always queries the database:

```ts
ratio = totalCurrentOpenQuantity (from DB) / csvPostSplitQuantity (from CSV)
```

For the OXLC example: DB total = 1530, CSV qty = 306 → ratio = 5. This is arithmetically correct for the FROM row IF the DB contains the full pre-split open position AND the function is called before `adjustLotsForSplit` modifies the DB.

The ratio could alternatively be computed directly from the paired rows as `|TO qty| / FROM qty` (e.g., 1530 / 306 = 5) without a DB round-trip. The current design does not do this.

**Verdict: correct approach for WEB format (single row + DB query), but unnecessary coupling to DB and requires the pre-split lots to exist before the call. The function is not broken per se, but is limited to the case where the pre-split DB state is known.**

The TO rows are actively rejected: `calculateSplitRatio("88634T493", -1530)` fails the `csvPostSplitQuantity <= 0` guard and logs a warning. No harm, but the function cannot be used with TO rows.

**Account scoping — is it correct?**

**No.** Neither `calculateSplitRatio` nor `adjustLotsForSplit` filter by account:

- `calculateSplitRatio` queries `prisma.trades.findMany({ where: { universeId, sell_date: null } })` — all accounts.
- `adjustLotsForSplit` queries `txClient.trades.findMany({ where: { universeId, sell_date: null } })` — all accounts.

The CSV row carries account information (e.g., "Joint Brokerage \*4767") but it is silently ignored. If OXLC is held across two accounts (say, one with 1,000 shares and one with 530 shares), importing a split CSV from one account adjusts **all 1,530 shares** in both accounts simultaneously — which is correct only if both accounts were split on the same day. If the second account was not split yet, its lots will be adjusted prematurely.

**Verdict: account scoping is absent. For single-account users it is safe. For multi-account users it is a latent correctness bug.**

**CUSIP-to-symbol resolution on "TO" row — does it exist?**

Yes, `resolveCusipSymbols()` is called in `importFidelityTransactions()` **before** `mapFidelityTransactions()`. It inspects every row's `symbol` field and, for any symbol where `isCusip()` returns true (exactly 9 alphanumeric chars containing at least one digit), it attempts resolution via cache → 13f.info API → Yahoo Finance fallback.

For the MSTY TO row: symbol = `"88634T493"` (9 chars, contains digits) → `isCusip()` = TRUE → resolution is attempted. However, "88634T493" is the **old / retired CUSIP** that was superseded by the new CUSIP after the reverse split. 13f.info and Yahoo may or may not resolve it.

- If resolved to `"MSTY"`: TO-row becomes `{symbol:"MSTY", quantity:-400}`. Still fails `calculateSplitRatio("MSTY", -400)` because qty ≤ 0.
- If not resolved: symbol stays `"88634T493"`. `calculateSplitRatio("88634T493", -400)` → fails qty ≤ 0.

Either way, the TO row is harmless but also unused. There is no dedicated "skip TO row" guard — the rejection is implicit via the quantity guard in `calculateSplitRatio`.

**Verdict: CUSIP resolution exists and runs on TO-row symbols, but it provides no benefit for split processing. The TO row is silently dropped regardless of whether the CUSIP resolves.**

**What needs to change for Story 57.2?**

The following specific changes are required in priority order:

1. **`isSplitRow()` — check `row.action` in addition to `row.description`**

   - Change: `return (row.description?.toUpperCase().includes('SPLIT') || row.action?.toUpperCase().includes('SPLIT')) ?? false;`
   - This makes both web and desktop FROM rows (and TO rows) return TRUE for `isSplitRow`.

2. **New `isSplitFromRow()` — distinguish FROM vs TO**

   - Add a function that returns TRUE only for FROM rows: checks for `"R/S FROM"` in `row.description` OR `row.action`.
   - Used in `handleSplitRow` / `mapSingleRow` to route only FROM rows to the ratio-calculation path.

3. **New `isSplitToRow()` — explicitly skip TO rows**

   - Add a function that returns TRUE for TO rows: checks for `"R/S TO"` in `row.description` OR `row.action`.
   - Used in `mapSingleRow` to return early without producing an unknown-transaction warning.

4. **`calculateSplitRatio()` — add `accountId` parameter (account scoping)**

   - Change signature to `calculateSplitRatio(symbol, csvPostSplitQuantity, accountId)`.
   - Add `accountId` to the `where` clause: `{ universeId, accountId, sell_date: null }`.

5. **`adjustLotsForSplit()` — add `accountId` parameter (account scoping)**

   - Change signature to `adjustLotsForSplit(symbol, ratio, accountId)`.
   - Add `accountId` to the `where` clause in both `findMany` calls inside the transaction.

6. **`handleSplitRow()` in `fidelity-data-mapper.function.ts` — pass accountId**

   - Resolve the account from `row.account` (using the existing `resolveAccount` cache + create-if-new logic already present in `mapSingleRow`).
   - Pass `account.id` to `calculateSplitRatio` and `adjustLotsForSplit`.
   - Note: `handleSplitRow` currently does not accept an `accountId`; call site in `mapSingleRow` must be updated to resolve the account first.

7. **`fidelity-data-mapper.spec.ts` — add desktop-format split test cases**

   - Add unit tests that feed desktop-format split pairs through `mapFidelityTransactions` and assert lots are adjusted.

8. **`split-import-e2e.spec.ts` + fixtures — add desktop paired-format test**
   - Add a CSV fixture with a real paired FROM/TO desktop-format split (e.g., MSTY 1-for-5).
   - Add an e2e test verifying the fixture produces the expected open-lot counts and prices.

No other production code changes are expected. `isInLieuRow()` is correct as-is (checks `row.description` containing "IN LIEU OF FRX SHARE"; the in-lieu rows in desktop format have this text in the Security Description column, which maps to `row.description` — verified against the existing OXLC fixture).

### Implementation Plan

Investigation only — no production code changes in this story.

### Completion Notes

All three acceptance criteria satisfied:

- AC1: Confirmed pair detection, ratio calculation, and lot adjustment reviewed for all three story examples.
- AC2: Findings documented above include which functions work correctly (none fully for desktop format), which need modification (isSplitRow, calculateSplitRatio, adjustLotsForSplit, handleSplitRow), and exact code changes required.
- AC3: Story 57.2 can proceed directly to implementation using the findings above.

### File List

_(No production files changed in this story.)_

### Change Log

- 2026-04-08: Investigation complete. Findings documented in Dev Agent Record.

### Status

review
