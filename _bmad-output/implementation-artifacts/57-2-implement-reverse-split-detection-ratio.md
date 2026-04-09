# Story 57.2: Implement Correct Reverse-Split Detection and Ratio Calculation

Status: Approved

## Story

As a portfolio manager,
I want the CSV importer to detect and correctly calculate the ratio for Fidelity reverse-split
row pairs,
so that my open lots are adjusted with the right multiplier.

## Acceptance Criteria

1. **Given** a CSV containing a "REVERSE SPLIT R/S FROM {cusip}#REOR" row followed by the matching
   "REVERSE SPLIT R/S TO {cusip}#REOR" row,
   **When** the import processes the file,
   **Then** the pair is recognised as a reverse split and the ratio is derived as |TO row quantity|
   ÷ FROM row quantity (e.g. 400 ÷ 80 = 5 for MSTY).

2. **Given** a MSTY reverse-split pair (1-for-5) is imported,
   **When** the import completes,
   **Then** each open MSTY lot has its quantity divided by 5 (floored) and its buy price multiplied
   by 5.

3. **Given** a ULTY reverse-split pair (1-for-10) is imported,
   **When** the import completes,
   **Then** each open ULTY lot has its quantity divided by 10 (floored) and its buy price multiplied
   by 10.

4. **Given** a OXLC reverse-split pair (1-for-5) is imported,
   **When** the import completes,
   **Then** each open OXLC lot has its quantity divided by 5 (floored) and its buy price multiplied
   by 5.

5. **Given** the CUSIP on the "R/S TO" row does not match any known symbol,
   **When** the import attempts the lot adjustment,
   **Then** the symbol is resolved from the trades table by CUSIP, or the pair is skipped with a
   warning logged if resolution fails.

6. **Given** fractional-share remainders exist after the split,
   **When** the import processes the remainder,
   **Then** they are handled consistently with the existing `adjustLotsForSplit` contract.

7. **Given** all changes are applied,
   **When** `pnpm all` runs,
   **Then** all unit tests pass with no regressions.

## Definition of Done

- [ ] `isSplitRow()` (or a new detection function) correctly identifies "REVERSE SPLIT R/S FROM" rows
- [ ] Ratio is derived from the paired row quantities, not from description text alone
- [ ] `adjustLotsForSplit()` is called with the correct ratio and account scope for MSTY, ULTY, and OXLC examples
- [ ] CUSIP-to-symbol resolution is applied when the "TO" row symbol is a raw CUSIP
- [ ] Unit tests added/updated in `apps/server/src/app/routes/import/` for the new detection and ratio logic
- [ ] `pnpm all` passes

> **BLOCKED:** Must complete Story 57.1 first. Read the Dev Agent Record from 57.1 before implementing.

## Tasks / Subtasks

- [ ] **Task 0: Read Story 57.1 Dev Agent Record findings before writing any code**

  - [ ] Open `_bmad-output/implementation-artifacts/57-1-investigate-reverse-split-import-code.md`
  - [ ] Read the "What needs to change" section fully
  - [ ] Only proceed once findings are understood

- [ ] **Task 1: Fix/extend `isSplitRow()` if needed**

  - [ ] If `isSplitRow()` already detects "REVERSE SPLIT R/S FROM" → verify and move on
  - [ ] If not → update the detection regex/string match to handle this description pattern

- [ ] **Task 2: Update `calculateSplitRatio()` to derive ratio from paired rows**

  - [ ] Ensure the import service groups "R/S FROM" + "R/S TO" rows by their shared reference number (the `#REOR {ref}` part)
  - [ ] Derive ratio = Math.abs(TO row quantity) / FROM row quantity
  - [ ] Update `calculateSplitRatio()` or create a new pairing function as appropriate
  - [ ] Do not remove existing ratio-from-description logic if other use cases rely on it

- [ ] **Task 3: Implement CUSIP-to-symbol resolution**

  - [ ] When the "R/S TO" row has a CUSIP as its symbol, look up the actual symbol from the `trades` table (by CUSIP or via the CUSIP cache)
  - [ ] If no match found, log a warning and skip the lot adjustment for that pair

- [ ] **Task 4: Verify account scoping**

  - [ ] Ensure lot adjustment only touches trades in the account matching the CSV row's account field
  - [ ] Confirm "Joint Brokerage \*4767" account name is correctly parsed and matched

- [ ] **Task 5: Add/update unit tests**

  - [ ] Add unit tests for MSTY pair (ratio = 5)
  - [ ] Add unit tests for ULTY pair (ratio = 10)
  - [ ] Add unit tests for OXLC pair (ratio = 5) — may already exist; update if needed
  - [ ] Add unit test for missing-symbol-resolution fallback (log + skip)
  - [ ] Ensure all prior unit tests still pass

- [ ] **Task 6: Run `pnpm all`**
  - [ ] All unit tests pass
  - [ ] No regressions

## Dev Notes

### Key Files

| File                                                                                  | Purpose                                     |
| ------------------------------------------------------------------------------------- | ------------------------------------------- |
| `apps/server/src/app/routes/import/is-split-row.function.ts`                          | Split detection                             |
| `apps/server/src/app/routes/import/calculate-split-ratio.function.ts`                 | Ratio calculation                           |
| `apps/server/src/app/routes/import/adjust-lots-for-split.function.ts`                 | Lot adjustment                              |
| `apps/server/src/app/routes/import/fidelity-import-service.function.ts`               | Orchestration — where pairs must be grouped |
| `apps/server/src/app/routes/import/fidelity-csv-parser.function.ts`                   | CSV parsing                                 |
| `_bmad-output/implementation-artifacts/57-1-investigate-reverse-split-import-code.md` | **Investigation results — read first**      |

### Paired row grouping

The "R/S FROM" and "R/S TO" rows share a reference number embedded in the description after
`#REOR `. Use this as the grouping key:

```
"REVERSE SPLIT R/S FROM 88634T493#REOR M0051704770001" → ref = "M0051704770001"
"REVERSE SPLIT R/S TO 88636X732#REOR M0051704770000"  → ref = "M0051704770000"
```

Note: the FROM ref ends in `...1` and the TO ref ends in `...0`. They share the same base number
(`M005170477000`). Use a prefix match or the base-10 truncation to link them.

### Ratio formula

```
ratio = Math.abs(toRow.quantity) / fromRow.quantity
// MSTY: Math.abs(-400) / 80 = 5
// ULTY: Math.abs(-1000) / 100 = 10
// OXLC: Math.abs(-1530) / 306 = 5
```

### Existing `adjustLotsForSplit` contract

```typescript
// Existing — do not change this signature
async function adjustLotsForSplit(tx: PrismaTransaction, symbol: string, accountId: number, ratio: number): Promise<void>;
```
