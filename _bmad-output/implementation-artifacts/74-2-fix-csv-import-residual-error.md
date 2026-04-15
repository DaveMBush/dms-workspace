# Story 74.2: Fix the CSV Import Error and Verify Clean Import of Both File Styles

Status: Approved

## Story

As a user,
I want to import a Fidelity CSV file without receiving any errors,
so that I can keep all of my transaction history up to date regardless of the transaction types
present in the file.

## Acceptance Criteria

1. **Given** the root cause documented in Story 74.1, **When** the fix is applied to the
   relevant location in the import pipeline (`fidelity-csv-parser.function.ts`,
   `fidelity-import-service.function.ts`, or the route handler), **Then** the failing unit test
   from Story 74.1 now passes (i.e. the `test.fails()` annotation has been removed and the test
   is green).

2. **Given** the fix is applied, **When** the Playwright MCP server uploads
   `fidelity-regression-74.csv` via the Universe import dialog, **Then** the import completes
   without errors, `response.success === true`, and a success notification is shown in the UI.

3. **Given** a second synthetic fixture `apps/dms-material-e2e/fixtures/fidelity-regression-74b.csv`
   modelled on a 2026-style Fidelity export (which may have different column ordering or new
   transaction codes compared to the 2025 format), **When** the Playwright MCP server imports
   this second file, **Then** the import also completes without errors (`response.success === true`
   or, for rows that map to `unknownTransactions`, `response.errors` is empty).

4. **Given** all existing import unit and e2e tests, **When** `pnpm all` runs after the fix,
   **Then** all tests pass.

## Tasks / Subtasks

- [ ] **Task 1: Read Story 74.1 findings** (all ACs)
  - [ ] Subtask 1.1: Read
    `_bmad-output/implementation-artifacts/74-1-diagnose-csv-import-residual-error.md` — focus on
    the **Findings** table to identify the exact error message, function name, line number, and
    failing row type / action string documented during that investigation
  - [ ] Subtask 1.2: Read the unit test added in Story 74.1 in
    `apps/server/src/app/routes/import/fidelity-import-service.function.spec.ts` — locate the
    `test.fails(...)` block to understand exactly which assertion was failing and what mock data
    represents the bug

- [ ] **Task 2: Apply the production fix** (AC: #1)
  - [ ] Subtask 2.1: Based on the root-cause location from 74.1 findings, apply the minimal change
    at the **identified file and line** — likely one of:
    - **Parser bug** (`fidelity-csv-parser.function.ts`): A field value format (e.g. parenthesised
      negative `(1,000.00)`, extra spaces, or `N/A`) that `parseNumericField` throws on — add a
      branch in `cleanNumericValue` or `parseNumericField` to handle the variant
    - **Mapper unhandled action** (`fidelity-data-mapper.function.ts`): An action string not matched
      by any `if` branch in `mapSingleRow` that should be routed to a handler rather than silently
      falling to `unknownTransactions` — add an `action.startsWith('...')` guard and call the
      appropriate handler
    - **Mapper / service DB call throws** (`fidelity-data-mapper.function.ts` or
      `fidelity-import-service.function.ts`): A Prisma call that rejects (e.g. missing
      `divDepositTypeId`, constraint violation) that is not currently wrapped in a per-item
      try/catch — wrap it or pre-validate the data before the call
    - Do **not** change more than the minimal set of lines required to fix the identified bug
  - [ ] Subtask 2.2: Add or update any `if`/`try`/`catch` guards only at the precise location the
    error originates — avoid shotgun error suppression across the whole pipeline
  - [ ] Subtask 2.3: Run `pnpm nx test server` to confirm the previously-failing `test.fails()`
    test would now pass (the assertion must be green before moving on)

- [ ] **Task 3: Remove the `test.fails()` annotation** (AC: #1)
  - [ ] Subtask 3.1: Open
    `apps/server/src/app/routes/import/fidelity-import-service.function.spec.ts`
  - [ ] Subtask 3.2: Remove the `test.fails(` wrapper from the Epic 74 regression test added in
    74.1 — keep all assertions and mock setup intact, just change `test.fails(` to `test(`
  - [ ] Subtask 3.3: Run `pnpm nx test server` and confirm the test is now green (passes, not
    skipped or expected-failure): output should show one additional passing test in the `Epic 74
    regression` describe block

- [ ] **Task 4: Create the 74b regression fixture (2026-style export)** (AC: #3)
  - [ ] Subtask 4.1: Create `apps/dms-material-e2e/fixtures/fidelity-regression-74b.csv` using
    the **web export header format** (same 14-column structure as `fidelity-regression-74.csv` but
    modelling 2026-style data — see Dev Notes for column ordering and new action strings)
  - [ ] Subtask 4.2: Use the same invented account `"Regression 74 Test Account"` and account
    number `88776655` so the existing `beforeAll` seed from the 74 e2e spec covers both fixtures
  - [ ] Subtask 4.3: Reuse ticker `REGT74` for buy/dividend rows (already seeded); add a second
    ticker `REG74B` for testing any new 2026-specific action strings (seed it in the account
    setup if needed)
  - [ ] Subtask 4.4: Include transaction rows that model 2026-style exports — at minimum:
    - `YOU BOUGHT` and `YOU SOLD` rows (standard, confirming baseline still works)
    - `DIVIDEND RECEIVED` row
    - One `QUALIFIED DIVIDEND` or `INTEREST EARNED` row — these may fall to `unknownTransactions`
      (which is acceptable — the test should assert no *errors*, not zero unknown warnings)
    - Optionally a row with a column reordered relative to the 2025 fixture (to verify the
      index-based column map handles it correctly — swap e.g. `Account Number` after `Account`)
  - [ ] Subtask 4.5: Verify 14-column count; verify no real personal data is used
  - [ ] Subtask 4.6: If Story 74.1 identified a specific "new" action string that triggered the
    bug, include that exact action string in `fidelity-regression-74b.csv` as a second validation
    that the fix handles it regardless of which file triggers it

- [ ] **Task 5: Playwright MCP — import `fidelity-regression-74.csv` and verify clean import**
  (AC: #2)
  - [ ] Subtask 5.1: Ensure the server is running (`pnpm nx serve server` or use the existing
    e2e server fixture) and the database is seeded with the `"Regression 74 Test Account"`,
    `REGT74`, and `SPLT74` entries (follow the `beforeAll` pattern in the e2e spec for Epic 69 at
    `apps/dms-material-e2e/src/csv-import-regression-69.spec.ts`)
  - [ ] Subtask 5.2: Using the Playwright MCP server, navigate to `/global/universe`
  - [ ] Subtask 5.3: Wait for `networkidle`, then intercept the `POST /api/import/fidelity`
    response **before** clicking upload:
    ```ts
    const responsePromise = page.waitForResponse(r =>
      r.url().includes('/api/import/fidelity') && r.request().method() === 'POST'
    );
    ```
  - [ ] Subtask 5.4: Click `[data-testid="import-transactions-button"]` to open the dialog
  - [ ] Subtask 5.5: Set the file input:
    ```ts
    await page.locator('input[type="file"]').setInputFiles(
      '/home/dave/code/dms-workspace/apps/dms-material-e2e/fixtures/fidelity-regression-74.csv'
    );
    ```
  - [ ] Subtask 5.6: Click `[data-testid="upload-button"]` and await the intercepted response
  - [ ] Subtask 5.7: Assert `response.success === true` and `response.errors.length === 0`; capture
    `response.imported` count and any warnings
  - [ ] Subtask 5.8: Confirm the success notification appears in the UI (e.g.
    `page.getByText(/successfully imported/i)` or equivalent snack-bar selector)
  - [ ] Subtask 5.9: Document the result (imported count, any warnings) in Dev Notes below

- [ ] **Task 6: Playwright MCP — import `fidelity-regression-74b.csv` and verify clean import**
  (AC: #3)
  - [ ] Subtask 6.1: Using the same server session (or re-seed if needed), repeat Steps 5.2–5.8
    using `fidelity-regression-74b.csv` as the fixture
  - [ ] Subtask 6.2: Assert `response.errors.length === 0`; unknown transaction types are
    acceptable as warnings
  - [ ] Subtask 6.3: Confirm the import dialog closes and the success notification is shown (no
    error toast)
  - [ ] Subtask 6.4: Document result in Dev Notes below

- [ ] **Task 7: Run full test suite** (AC: #4)
  - [ ] Subtask 7.1: Run `pnpm all` from the workspace root
  - [ ] Subtask 7.2: Confirm all unit tests pass, including the former `test.fails()` test
  - [ ] Subtask 7.3: Confirm all e2e tests pass (including `fidelity-import.spec.ts` and any
    existing regression suites from Epic 69)
  - [ ] Subtask 7.4: If any test failures appear unrelated to this story, note them in Dev Notes
    and confirm they pre-existed (do not fix unrelated failures in this story)

## Dev Notes

### Key Files

| File | Purpose |
|------|---------|
| `_bmad-output/implementation-artifacts/74-1-diagnose-csv-import-residual-error.md` | **READ FIRST** — contains the Findings table with exact root cause location |
| `apps/server/src/app/routes/import/fidelity-import-service.function.ts` | Import orchestrator — `importFidelityTransactions`, `processAllTransactions`, `processDeposits`, `processSales`, `processTrades`, `processDeferredSplits` |
| `apps/server/src/app/routes/import/fidelity-csv-parser.function.ts` | CSV parser — `parseFidelityCsv`, `detectFormat`, `parseNumericField`, `parseRow`; WEB_HEADER_MAP (8 headers) and DESKTOP_HEADER_MAP |
| `apps/server/src/app/routes/import/fidelity-data-mapper.function.ts` | Row mapper — `mapFidelityTransactions`, `mapSingleRow`, `mapDividend`, `mapCashDeposit`, `handleBuyRow`, `handleSellRow`, `handleDividendRow`, `handleSplitRow` |
| `apps/server/src/app/routes/import/index.ts` | Route handler — `POST /api/import/fidelity`; wraps `importFidelityTransactions` |
| `apps/server/src/app/routes/import/fidelity-import-service.function.spec.ts` | Unit tests — **remove `test.fails()` here** |
| `apps/dms-material-e2e/fixtures/fidelity-regression-74.csv` | Created in Story 74.1 — first fixture for Playwright verification |
| `apps/dms-material-e2e/fixtures/fidelity-regression-74b.csv` | **New** — 2026-style fixture; created in this story |
| `apps/dms-material-e2e/src/csv-import-regression-69.spec.ts` | Reference e2e test pattern (seeding, upload flow, response assertion) |
| `apps/dms-material-e2e/src/helpers/seed-import-data.helper.ts` | Reference for seeding universe entries and accounts |

### Architecture Context

The import pipeline is strictly sequential. Errors at each stage have different propagation:

```
POST /api/import/fidelity
  └─ index.ts (route handler)
       └─ importFidelityTransactions(csvContent)    [fidelity-import-service.function.ts]
            ├─ parseFidelityCsv(csv)                [fidelity-csv-parser.function.ts]
            │    ├─ detectFormat(headers)           -- throws on unknown format → caught, returns {success:false, imported:0}
            │    └─ parseRow(line, ...)             -- throws on NaN → caught, returns {success:false, imported:0}
            ├─ resolveCusipSymbols(rows)            -- non-fatal, swallowed
            ├─ mapFidelityTransactions(rows)         [fidelity-data-mapper.function.ts]
            │    └─ mapSingleRow(row, ...)          -- throws → caught, returns {success:false, imported:0}
            └─ processAllTransactions(mapped)
                 ├─ processTrades(trades)           -- per-trade try/catch; errors pushed to array
                 ├─ processDeferredSplits(splits)   -- per-split try/catch; errors pushed to array
                 ├─ processSales(sales)             -- per-sale try/catch; errors pushed to array
                 └─ processDeposits(deposits)       -- per-deposit try/catch; errors pushed to array
```

**Why the error is mid-import:** `processAllTransactions` runs processors sequentially —
`processTrades` first, then `processDeferredSplits`, then `processSales`, then `processDeposits`.
Each processor has per-item try/catch that accumulates error strings. The final return is
`{ success: errors.length === 0, imported: tradeCount + saleCount + depositCount, errors, warnings }`.
So `imported > 0` and `success: false` means at least one processor succeeded (trades likely) and
a later processor accumulated at least one error string.

**Likely fix locations (check 74.1 findings to confirm):**

1. **`parseNumericField` in `fidelity-csv-parser.function.ts`** — throws `Invalid <field>: expected
   a number but got "..."` if a field contains a parenthesised negative (e.g. `(1,500.00)`) or
   other non-standard numeric representation. Fix: extend `cleanNumericValue` to strip surrounding
   parentheses and treat the value as negative, e.g.:
   ```ts
   function cleanNumericValue(value: string): string {
     const stripped = value.replace(/[$,]/g, '');
     if (/^\(.*\)$/.test(stripped)) {
       return '-' + stripped.slice(1, -1);
     }
     return stripped;
   }
   ```

2. **Unhandled action string in `mapSingleRow` (`fidelity-data-mapper.function.ts`)** — an action
   such as `INTEREST EARNED`, `CASH MERGER`, `TENDERED TO`, or `IN LIEU OF FRACTIONAL SHARES` that
   reaches the final `result.unknownTransactions.push(...)` path but *should* map to a deposit or
   split. If this causes a throw inside a handler that's not wrapped, the whole
   `mapFidelityTransactions` call fails. Fix: add the missing `action.startsWith(...)` guard.

3. **`mapDividend` / `mapCashDeposit` Prisma call** (`fidelity-data-mapper.function.ts`) — if
   `prisma.divDepositType.findFirst` / `.create` throws a constraint or connection error inside
   the mapper, the exception propagates out of `mapFidelityTransactions` (not inside
   `processDeposits`). The per-deposit try/catch in `processDeposits` does NOT protect mapper-phase
   failures. Fix: either wrap the DB call in the mapper, or move deposit-type resolution to the
   service layer where per-item error handling already exists.

### Fixture: fidelity-regression-74b.csv (2026-style export)

Use the same 14-column web format. The file is designed to test that the fix is robust against
expected variations in 2026 Fidelity exports. Include at minimum:

```
Run Date,Account,Account Number,Action,Symbol,Description,Type,Price ($),Quantity,Commission ($),Fees ($),Accrued Interest ($),Amount ($),Settlement Date
01/05/2026,Regression 74 Test Account,88776655,YOU BOUGHT,REGT74,REGT74 INC COMMON STOCK,Stock,20.00,50,,,,-1000.00,01/07/2026
02/10/2026,Regression 74 Test Account,88776655,DIVIDEND RECEIVED,REGT74,REGT74 INC COMMON STOCK,Cash,,,,,,62.50,02/12/2026
03/15/2026,Regression 74 Test Account,88776655,INTEREST EARNED,REGT74,REGT74 INC COMMON STOCK,Cash,,,,,,12.30,03/17/2026
04/01/2026,Regression 74 Test Account,88776655,YOU BOUGHT,REG74B,REG74B CORP,Stock,8.50,100,,,,-850.00,04/03/2026
04/20/2026,Regression 74 Test Account,88776655,QUALIFIED DIVIDEND,REG74B,REG74B CORP,Cash,,,,,,18.75,04/22/2026
```

Notes on 74b rows:
- `INTEREST EARNED` and `QUALIFIED DIVIDEND` are expected to fall through to `unknownTransactions`
  unless the fix in Task 2 addresses them specifically. The AC requires `errors.length === 0`,
  not `unknownTransactions.length === 0` — warning accumulation is acceptable.
- If Story 74.1 identified one of these action strings as the specific root cause, that row must
  be present in 74b and must now import cleanly (not just warn).
- `REG74B` — a new ticker used only in 74b. It does not need to be pre-seeded if `YOU BOUGHT`
  auto-creates the universe entry (which `resolveSymbol(symbol, createIfNotFound: true)` does for
  buy actions); verify this behaviour is intact.

### Playwright MCP Notes

- Follow the upload flow established in Story 74.1 and the `csv-import-regression-69.spec.ts`
  reference pattern
- Intercept the response **before** clicking upload to avoid a race condition
- Assert `response.errors` (not `response.warnings`) is empty — unknown transactions produce
  warnings, not errors
- Both imports should show a success toast / snackbar in the Angular Material UI; the selector
  is typically a `mat-snack-bar-container` or `[role="status"]` with text matching
  `/successfully imported/i` or `/import complete/i`

### Playwright MCP Verification Results (fill in during execution)

| Import | HTTP Status | `success` | `imported` count | `errors` | `warnings` |
|--------|-------------|-----------|-----------------|----------|------------|
| `fidelity-regression-74.csv` | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| `fidelity-regression-74b.csv` | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |

### References

- [Story 74.1](74-1-diagnose-csv-import-residual-error.md) — **MUST READ**: root cause findings,
  failing unit test, and fixture `fidelity-regression-74.csv`
- [Story 69.3](69-3-harden-csv-import-regression-suite.md) — reference for regression suite
  structure and e2e seed/cleanup patterns
- `fidelity-data-mapper.function.ts` `mapSingleRow` — definitive list of handled action strings
  (currently: `YOU BOUGHT`/`PURCHASE INTO CORE ACCOUNT`/`REINVESTMENT`, `YOU SOLD`/`REDEMPTION
  FROM CORE ACCOUNT`, `DIVIDEND RECEIVED`, `ELECTRONIC FUNDS TRANSFER`, `MONEY LINE RECEIVED`,
  split rows via `isSplitRow`, in-lieu rows via `isInLieuRow`)
- `fidelity-csv-parser.function.ts` `parseNumericField` — throws on NaN; `cleanNumericValue`
  strips `$` and `,` but does not handle parenthesised negatives

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List

- `apps/server/src/app/routes/import/fidelity-import-service.function.ts` (modified — production fix)
- `apps/server/src/app/routes/import/fidelity-import-service.function.spec.ts` (modified — remove `test.fails()`)
- `apps/dms-material-e2e/fixtures/fidelity-regression-74b.csv` (new)
