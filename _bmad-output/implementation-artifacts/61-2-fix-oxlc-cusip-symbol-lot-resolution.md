# Story 61.2: Fix OXLC CUSIP-Symbol Lot Resolution for Reverse Splits

Status: Approved

## Story

As a portfolio manager,
I want CSV reverse-split rows to correctly adjust all open lots for the affected symbol regardless
of whether those lots were recorded under a CUSIP or a ticker symbol,
so that the post-split quantities and prices in my portfolio are accurate.

## Acceptance Criteria

1. **Given** four open lots recorded under CUSIP `691543102` (300, 150, 500, 580 shares at $4.50,
   $4.49, $4.06, $3.44),
   **When** the OXLC 1-for-5 reverse-split CSV is imported,
   **Then** all four lots are adjusted to 60, 30, 100, and 116 shares at prices $22.50, $22.45,
   $20.30, and $17.20 respectively.

2. **Given** the lot-adjustment path encounters a symbol field that is a raw CUSIP,
   **When** it looks up open lots,
   **Then** it resolves the CUSIP via the `cusip_cache` table (or the trades table) to its ticker
   before adjusting.

3. **Given** a CUSIP cannot be resolved to a ticker,
   **When** the import attempts the adjustment,
   **Then** a warning is logged and the pair is skipped — no silent data corruption.

4. **Given** the fix is applied and the e2e test from Story 61.1 runs,
   **When** `pnpm run e2e:dms-material:chromium` executes,
   **Then** the test passes green.

5. **Given** all changes are applied,
   **When** `pnpm all` runs,
   **Then** all tests pass with no regressions.

## Definition of Done

- [ ] Root cause confirmed and documented in Dev Notes (which function fails to resolve CUSIP-as-symbol lots)
- [ ] `adjustLotsForSplit()` (or its caller in the import service) updated to resolve CUSIP symbols to their ticker equivalent before querying the trades table
- [ ] Unit tests added for: CUSIP-to-ticker resolution path, full OXLC 1-for-5 split scenario, unresolvable CUSIP warning
- [ ] Playwright MCP server confirms all four OXLC lots are correctly adjusted after import
- [ ] E2E test from Story 61.1 passes green
- [ ] `pnpm all` passes

## Tasks / Subtasks

- [ ] **Task 1: Read Story 61.1 Dev Agent Record**
  - [ ] Confirm the exact code path where lot resolution fails
  - [ ] Note which database tables / Prisma queries are involved

- [ ] **Task 2: Understand the existing lot-adjustment pipeline**
  - [ ] Read `apps/server/src/app/routes/import/adjust-lots-for-split.function.ts`
  - [ ] Read `apps/server/src/app/routes/import/fidelity-import-service.function.ts` — how split pairs are grouped and dispatched
  - [ ] Read `apps/server/src/app/routes/import/is-split-row.function.ts` and `calculate-split-ratio.function.ts`
  - [ ] Identify where the `symbol` value passed to the lot-query comes from and whether it could be a CUSIP

- [ ] **Task 3: Implement CUSIP-to-ticker resolution**
  - [ ] Before `adjustLotsForSplit()` queries for open lots, check if the symbol value matches the
        `cusip_cache` table; if so, resolve to the corresponding ticker
  - [ ] Also check if any lots exist directly under the CUSIP string (without resolution) and adjust those
  - [ ] Log a warning and skip the adjustment if the CUSIP cannot be resolved

- [ ] **Task 4: Add unit tests**
  - [ ] Test: lots under CUSIP `691543102` are found and adjusted when split is for `OXLC` (ratio 5)
  - [ ] Test: lots under ticker `OXLC` are still found and adjusted (regression guard)
  - [ ] Test: unresolvable CUSIP logs a warning and returns without modification

- [ ] **Task 5: Verify with Playwright MCP server**
  - [ ] Upload the OXLC fixture CSV from Story 61.1
  - [ ] Confirm the four lots now show post-split values in the UI
  - [ ] Run Story 61.1 E2E test — confirm it passes green

## Dev Notes

### Key Files

| File | Purpose |
| ---- | ------- |
| `apps/server/src/app/routes/import/adjust-lots-for-split.function.ts` | Lot adjustment logic — likely fix location |
| `apps/server/src/app/routes/import/fidelity-import-service.function.ts` | Import orchestrator — CUSIP resolution may go here |
| `apps/server/src/app/routes/import/is-split-row.function.ts` | Split row detection |
| `apps/server/src/app/routes/import/calculate-split-ratio.function.ts` | Ratio calculation from paired rows |
| `prisma/schema.prisma` | Check `cusip_cache` table structure |
| `apps/dms-material-e2e/src/oxlc-reverse-split.spec.ts` | E2E test from Story 61.1 (must turn green) |

### CUSIP Chain for OXLC

```
CUSIP 691543102 = old OXLC (pre-split) — used as symbol in "YOU BOUGHT" rows
CUSIP 691543847 = new OXLC (post-split) — appears in the "R/S TO" row action field
Ticker OXLC    = appears in the "R/S FROM" row symbol field
```

The import pipeline receives the "FROM" row with symbol `OXLC` and quantity 306 (new shares).
It then looks up open lots for `OXLC` in the trades table. Since the lots were recorded under
`691543102`, the query returns nothing and no adjustment is made.

### Fix Strategy

In `adjustLotsForSplit()` or its caller, after extracting the ticker (`OXLC`) from the "FROM" row:

1. Query the `cusip_cache` for any CUSIP that maps to ticker `OXLC`
2. Find lots where `symbol IN (ticker, ...all matching CUSIPs)`
3. Adjust all matching lots

This ensures lots recorded under any historical CUSIP for the ticker are also adjusted.

Alternatively, look up the old CUSIP from the "FROM" action field (`691543102#REOR…`), strip the
`#REOR…` suffix, and query lots under both the ticker and that old CUSIP.

## Dev Agent Record

_To be filled in by the implementing agent._
