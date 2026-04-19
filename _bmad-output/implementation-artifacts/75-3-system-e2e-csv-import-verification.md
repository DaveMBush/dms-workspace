# Story 75.3: Add Fidelity CSV Import Verification to System E2E Test

Status: Approved

## Story

As a developer,
I want the system e2e test to import synthetic Fidelity CSV fixtures and assert error-free
completion,
so that any regression in the CSV import pipeline is caught as part of the full-workflow test.

## Acceptance Criteria

1. **Given** synthetic fixture files at `apps/dms-material-e2e/fixtures/system-fidelity-2025.csv`
   and `apps/dms-material-e2e/fixtures/system-fidelity-2026.csv` (no real account numbers,
   modelled on actual Fidelity export format with a representative spread of transaction types),
   **When** the Playwright test navigates to the Universe screen, clicks "Import Fidelity CSV",
   and uploads `system-fidelity-2025.csv`,
   **Then** the import completes without an error dialog, and a success result is shown in the
   import dialog's `[data-testid="import-result"]` area.

2. **Given** the first CSV was imported successfully,
   **When** the test closes the import dialog and reopens it, then uploads
   `system-fidelity-2026.csv` via the same import dialog,
   **Then** the second import also completes without errors (response `success: true`,
   `imported > 0`).

3. **Given** both CSV files have been imported,
   **When** the test asserts the sum of `imported` counts from both import responses,
   **Then** the total is ≥ 2, confirming rows from both files were persisted to the database.

4. **Given** the fully populated system e2e test (DB clear → screener refresh → universe sync →
   distributions check → CSV × 2),
   **When** the complete spec is run from scratch with
   `pnpm nx run dms-material-e2e:e2e --project=integration`,
   **Then** every assertion passes and the process exits with status 0.

5. **Given** the integration spec,
   **When** `pnpm all` (standard, without `--project=integration`) runs,
   **Then** the integration spec is skipped and all other tests continue to pass.

## Tasks / Subtasks

### Task 1 — Create synthetic fixture CSVs
- [ ] 1.1 Create `apps/dms-material-e2e/fixtures/system-fidelity-2025.csv` using the 14-column
  Fidelity web-export header format (see Dev Notes for exact column order and fixture content).
  - Account name: `System E2E Test Account`
  - Account number: `11223344` (synthetic — no real data)
  - Symbols: `OXLC` and `NHS` (both will be present in the universe after Stories 75.1 + 75.2 run)
  - Rows: two `YOU BOUGHT` and two `DIVIDEND RECEIVED` rows (one pair per symbol)
  - All prices and amounts use invented values — no real market data
- [ ] 1.2 Create `apps/dms-material-e2e/fixtures/system-fidelity-2026.csv` using the same
  14-column format.
  - Same account name and number as the 2025 file
  - Symbols: `DHY` and `CIK` (both will be present in the universe after Stories 75.1 + 75.2)
  - Rows: two `YOU BOUGHT` and two `DIVIDEND RECEIVED` rows (one pair per symbol)
- [ ] 1.3 Verify each fixture has exactly 14 fields per row (count commas) and that no real
  personal data or account numbers are present.

### Task 2 — Add system test account creation to `beforeAll`
- [ ] 2.1 Open `apps/dms-material-e2e/src/system-integration.spec.ts`.
- [ ] 2.2 Add a `POST /api/accounts/add` call to the `test.beforeAll` fixture, **after** the
  existing `DELETE /api/test/reset` call:
  ```ts
  const accountRes = await request.post(
    'http://localhost:3000/api/accounts/add',
    { data: { name: 'System E2E Test Account' } }
  );
  if (!accountRes.ok()) {
    throw new Error(`Failed to create system test account: ${accountRes.status()}`);
  }
  ```
  > The account is needed because the Fidelity import service matches CSV rows to accounts by name.
  > The `DELETE /api/test/reset` does not clear the `accounts` table, but the account may already
  > exist from a previous run — add a guard or use upsert if the endpoint supports it. If the
  > endpoint returns 409 for an existing name, catch the error and continue.
- [ ] 2.3 Confirm TypeScript compiles (`pnpm nx run dms-material-e2e:lint`).

### Task 3 — Add first CSV import test to `system-integration.spec.ts`
- [ ] 3.1 After the `'universe sync populates distributions_per_year for monthly payers'` test
  block (added in Story 75.2), append a new test inside the same
  `test.describe('System Integration — Epic 75', ...)` block:
  ```ts
  test('imports system-fidelity-2025.csv without errors', async ({ page, request }) => {
    // ... (see full implementation in Dev Notes)
  });
  ```
- [ ] 3.2 Follow the same steps as `csv-import-regression-69.spec.ts`:
  1. Register a `page.waitForResponse` promise before opening the dialog.
  2. Navigate to `/global/universe` and wait for `networkidle`.
  3. Click `[data-testid="import-transactions-button"]`.
  4. Assert the dialog heading "Import Fidelity Transactions" is visible.
  5. Set files on `input[type="file"]` to the absolute path of `system-fidelity-2025.csv`.
  6. Assert `[data-testid="upload-button"]` is enabled.
  7. Click upload.
  8. Await the intercepted response; assert `response.status() === 200`.
  9. Parse response body; assert `responseBody.success === true` and
     `responseBody.imported > 0`.
  10. Assert `[data-testid="import-result"]` is visible and contains the imported count.
  11. Store `responseBody.imported` in a variable for the trade-count assertion later.

### Task 4 — Add second CSV import test
- [ ] 4.1 After the first import test, add another test for `system-fidelity-2026.csv`:
  ```ts
  test('imports system-fidelity-2026.csv without errors', async ({ page, request }) => {
    // ... same flow as Task 3 but with system-fidelity-2026.csv
  });
  ```
- [ ] 4.2 Close the import dialog between the two tests by clicking
  `[data-testid="cancel-button"]` at the end of Task 3's test (or simply navigate to
  `/global/universe` at the start of Task 4's test, which resets page state).
  > **Preferred:** navigate to `/global/universe` at the start of each test to avoid any
  > leftover dialog state — this matches the `beforeEach` pattern used in regression-69 tests.
  > Since the system integration tests do NOT use `beforeEach` for navigation (shared state is
  > maintained across tests), explicitly navigate and `waitForLoadState('networkidle')` at the
  > start of each import test.

### Task 5 — Add trade-count assertion
- [ ] 5.1 After both import tests pass, add a third test that asserts the total import yield:
  ```ts
  test('both CSV imports persisted rows to the database', async ({ request }) => {
    // Re-run minimal imports or use a shared counter variable (see Dev Notes)
  });
  ```
  > **Preferred approach:** Because Playwright tests in a `describe` block run sequentially, you
  > can capture `imported` counts from Tasks 3 and 4 in outer-scope variables declared inside the
  > `describe` block, then assert them in this third test.
- [ ] 5.2 Assert:
  ```ts
  expect(totalImported).toBeGreaterThanOrEqual(2);
  ```
  Where `totalImported = firstImportCount + secondImportCount`.
- [ ] 5.3 Optionally assert each individual count is ≥ 1.

### Task 6 — Verify end-to-end
- [ ] 6.1 Ensure the full dev stack is running:
  ```sh
  pnpm nx run dms-material:serve   # port 4201
  pnpm nx run server:serve         # port 3000
  ```
- [ ] 6.2 Run the integration project end-to-end (all 5 tests: DB clear + screener + universe +
  2025 import + 2026 import + trade count):
  ```sh
  pnpm nx run dms-material-e2e:e2e --project=integration
  ```
  Confirm all tests green and exit code 0.
- [ ] 6.3 Run `pnpm all` and confirm `system-integration.spec.ts` is not executed by the
  `chromium` or `firefox` projects.

## Dev Notes

### Fixture CSV Format

Exact 14-column header (must match this order precisely):

```
Run Date,Account,Account Number,Action,Symbol,Description,Type,Price ($),Quantity,Commission ($),Fees ($),Accrued Interest ($),Amount ($),Settlement Date
```

**`system-fidelity-2025.csv` — full contents:**

```csv
Run Date,Account,Account Number,Action,Symbol,Description,Type,Price ($),Quantity,Commission ($),Fees ($),Accrued Interest ($),Amount ($),Settlement Date
03/15/2025,System E2E Test Account,11223344,YOU BOUGHT,OXLC,OXFORD LANE CAPITAL CORP,Stock,6.50,100,,,,-650.00,03/17/2025
05/20/2025,System E2E Test Account,11223344,DIVIDEND RECEIVED,OXLC,OXFORD LANE CAPITAL CORP,Dividend,,,,,, 39.00,05/22/2025
07/10/2025,System E2E Test Account,11223344,YOU BOUGHT,NHS,NHS HOLDINGS CORP,Stock,14.25,50,,,,-712.50,07/12/2025
09/30/2025,System E2E Test Account,11223344,DIVIDEND RECEIVED,NHS,NHS HOLDINGS CORP,Dividend,,,,,,49.50,10/02/2025
```

**`system-fidelity-2026.csv` — full contents:**

```csv
Run Date,Account,Account Number,Action,Symbol,Description,Type,Price ($),Quantity,Commission ($),Fees ($),Accrued Interest ($),Amount ($),Settlement Date
01/15/2026,System E2E Test Account,11223344,YOU BOUGHT,DHY,CREDIT SUISSE HIGH YIELD BOND FUND,Stock,3.20,200,,,,-640.00,01/17/2026
03/20/2026,System E2E Test Account,11223344,DIVIDEND RECEIVED,DHY,CREDIT SUISSE HIGH YIELD BOND FUND,Dividend,,,,,,12.80,03/22/2026
05/10/2026,System E2E Test Account,11223344,YOU BOUGHT,CIK,CREDIT SUISSE ASSET MGMT INCOME FUND,Stock,7.50,100,,,,-750.00,05/12/2026
07/15/2026,System E2E Test Account,11223344,DIVIDEND RECEIVED,CIK,CREDIT SUISSE ASSET MGMT INCOME FUND,Dividend,,,,,,52.20,07/17/2026
```

**Column notes:**
- `Commission ($)`, `Fees ($)`, `Accrued Interest ($)` are empty for all rows (the CSV parser
  handles empty fields as 0).
- `Amount ($)` for `YOU BOUGHT` rows is negative (a debit). For `DIVIDEND RECEIVED` rows it is
  positive.
- `Quantity` is empty for `DIVIDEND RECEIVED` rows — the import mapper skips quantity for
  dividend rows.
- Account number `11223344` is entirely synthetic. It matches what the import service reads from
  the CSV `Account Number` column to identify the Fidelity account.

**Why OXLC, NHS, DHY, CIK?**
These four symbols are the known monthly payers asserted in Story 75.2. After the screener
refresh (Story 75.1) and universe sync (Story 75.2), all four will have active universe entries.
The Fidelity import service looks up `universeId` by symbol; if the symbol is not found in the
universe, the row is added to `unknownTransactions` (a warning) rather than throwing an error.
Using symbols known to be in the universe ensures the `YOU BOUGHT` rows create actual `trades`
records rather than warnings.

### Playwright File Upload Pattern

Use `page.locator('input[type="file"]').setInputFiles(filePath)` — not `page.setInputFiles()`.
The native file input is visually hidden (class `hidden`) but is still interactable via
`setInputFiles`.

```ts
import path from 'path';

const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');

// Inside the test:
const filePath = path.join(FIXTURES_DIR, 'system-fidelity-2025.csv');
const fileInput = page.locator('input[type="file"]');
await fileInput.setInputFiles(filePath);
```

`path.resolve(__dirname, '..', 'fixtures')` resolves to
`apps/dms-material-e2e/fixtures/` because spec files live in
`apps/dms-material-e2e/src/` (one level up goes to `apps/dms-material-e2e/`).

### Import Dialog — Selector Reference

| Element | Selector | Notes |
|---------|----------|-------|
| Import button (toolbar) | `[data-testid="import-transactions-button"]` | On the Universe screen |
| Dialog heading | `page.getByRole('heading', { name: 'Import Fidelity Transactions' })` | Confirms dialog opened |
| Native file input | `input[type="file"]` | Hidden — use `setInputFiles()` only |
| Select file button | `[data-testid="select-file-button"]` | Styled button; triggers the hidden input |
| Upload button | `[data-testid="upload-button"]` | Disabled until file is selected |
| Cancel / close button | `[data-testid="cancel-button"]` | Closes dialog without uploading |
| Import result area | `[data-testid="import-result"]` | Shows imported count and errors after upload |

**Opening the dialog — confirmed from `global-universe.component.html` lines 34–36:**
```html
<button data-testid="import-transactions-button"
        matTooltip="Import Fidelity CSV"
        aria-label="Import Fidelity CSV">
```

### Success Verification Pattern

Intercept the `POST /api/import/fidelity` response **before** clicking upload (register the
promise first), then await it after clicking:

```ts
const responsePromise = page.waitForResponse(
  (res) => res.url().includes('/api/import/fidelity') && res.request().method() === 'POST'
);

// ... navigate, open dialog, set files, click upload button ...

const response = await responsePromise;
expect(response.status()).toBe(200);

const body = (await response.json()) as {
  success: boolean;
  imported: number;
  errors: string[];
  warnings: string[];
};
expect(body.success).toBe(true);
expect(body.errors).toHaveLength(0);
expect(body.imported).toBeGreaterThan(0);

// Assert result area is visible with import count
const resultArea = page.locator('[data-testid="import-result"]');
await expect(resultArea).toBeVisible({ timeout: 5_000 });
await expect(resultArea).toContainText(String(body.imported));
```

**No error dialog assertion:**
The import dialog does not spawn a separate `mat-dialog-container` for errors — it shows them
inline in `[data-testid="import-result"]`. Asserting `body.errors.toHaveLength(0)` and
`body.success === true` is the primary guard. Optionally assert:
```ts
await expect(page.locator('.snackbar-error')).not.toBeVisible();
```

### Trade-Count Verification via Captured Import Responses

There is no standalone `GET /api/trades/count` endpoint. The cleanest approach is to capture
the `imported` values from both import responses using outer-scope `describe`-level variables:

```ts
test.describe('System Integration — Epic 75', () => {
  // ...
  let firstImportCount = 0;
  let secondImportCount = 0;

  test('imports system-fidelity-2025.csv without errors', async ({ page }) => {
    // ...
    firstImportCount = body.imported;  // e.g. 4 (2 trades + 2 divDeposits)
  });

  test('imports system-fidelity-2026.csv without errors', async ({ page }) => {
    // ...
    secondImportCount = body.imported;
  });

  test('both CSV imports persisted rows — trade count check', async () => {
    expect(firstImportCount).toBeGreaterThanOrEqual(1);
    expect(secondImportCount).toBeGreaterThanOrEqual(1);
    expect(firstImportCount + secondImportCount).toBeGreaterThanOrEqual(2);
  });
});
```

> **Note:** Playwright runs `describe`-level tests in definition order when using the same
> worker, so the outer-scope variables are safely written before being read. Do NOT use
> `test.concurrent`.

### Account Creation in `beforeAll`

The Fidelity import service maps each CSV row's "Account" name to an existing account record.
The `accounts` table is **not** cleared by `DELETE /api/test/reset`, so a previously created
"System E2E Test Account" may already exist on a re-run.

Strategy: attempt to create the account and treat a duplicate-name error as acceptable:
```ts
test.beforeAll(async ({ request }) => {
  // 1. Clear DB tables
  const resetRes = await request.delete('http://localhost:3000/api/test/reset');
  if (!resetRes.ok()) {
    throw new Error(`DB reset failed: ${resetRes.status()} ${await resetRes.text()}`);
  }

  // 2. Ensure system test account exists
  const accountRes = await request.post('http://localhost:3000/api/accounts/add', {
    data: { name: 'System E2E Test Account' },
  });
  // Accept 200 (created) or 409 (already exists); throw on anything else
  if (!accountRes.ok() && accountRes.status() !== 409) {
    throw new Error(`Failed to create system test account: ${accountRes.status()}`);
  }
});
```

### Full Test Structure After Story 75.3

```
test.describe('System Integration — Epic 75', () => {
  let firstImportCount = 0;
  let secondImportCount = 0;

  test.beforeAll(...)           // DB reset + account ensure
  test('screener refresh ...')  // Story 75.1
  test('universe sync ...')     // Story 75.2
  test('imports system-fidelity-2025.csv without errors', ...)   // THIS STORY ← Task 3
  test('imports system-fidelity-2026.csv without errors', ...)   // THIS STORY ← Task 4
  test('both CSV imports persisted rows — trade count check', ...) // THIS STORY ← Task 5
})
```

### Key Files

| File | Action | Purpose |
|------|--------|---------|
| `apps/dms-material-e2e/fixtures/system-fidelity-2025.csv` | **Create** | Synthetic fixture — 2025 OXLC + NHS transactions |
| `apps/dms-material-e2e/fixtures/system-fidelity-2026.csv` | **Create** | Synthetic fixture — 2026 DHY + CIK transactions |
| `apps/dms-material-e2e/src/system-integration.spec.ts` | **Modify** | Add account creation to `beforeAll`, add 3 new test blocks |
| `apps/dms-material-e2e/src/csv-import-regression-69.spec.ts` | Read-only | Pattern reference for dialog interaction + response interception |
| `apps/dms-material/src/app/global/import-dialog/import-dialog.component.spec.ts` | Read-only | `[data-testid]` selector reference for dialog elements |
| `apps/server/src/app/routes/import/index.ts` | Read-only | Import route — confirms `POST /api/import/fidelity` response shape |
| `apps/server/src/app/routes/import/fidelity-import-service.function.ts` | Read-only | `{ success, imported, errors, warnings }` response shape |

### Architecture Context

**How file upload works in Playwright:**

The Angular import dialog uses a visually-hidden native `<input type="file">` element (CSS class
`hidden`). The styled `[data-testid="select-file-button"]` triggers a click on it for human
users. Playwright's `setInputFiles()` bypasses the visual button entirely and sets files
directly on the native input, which triggers the Angular `change` event and populates the
component's `selectedFile` property.

```ts
// Correct pattern — set files directly on the hidden input:
await page.locator('input[type="file"]').setInputFiles(absoluteFilePath);

// Do NOT use page.setInputFiles() without a locator — it requires a visible element.
// Do NOT click [data-testid="select-file-button"] — it opens the OS file picker,
//   which Playwright cannot interact with in headless mode.
```

**Import pipeline overview:**
1. `POST /api/import/fidelity` receives the multipart form with the CSV file.
2. `parseFidelityCsv()` detects web vs desktop format, parses rows into `ParsedRow[]`.
3. `mapFidelityTransactions()` routes each row by `Action` string:
   - `YOU BOUGHT` → trade buy entry (appended to `trades`)
   - `YOU SOLD` → trade sell entry (updates existing trade's `sell` / `sell_date`)
   - `DIVIDEND RECEIVED` → div deposit entry (appended to `divDeposits`)
4. `importFidelityTransactions()` orchestrates DB writes; returns
   `{ success, imported, errors, warnings }`.
5. The route handler returns HTTP 200 if `success: true`, HTTP 400 if `success: false`.

**Symbol prerequisite:**
Import rows for symbols not found in the `universe` table are added to `warnings` and skipped
(not errors). Using OXLC, NHS, DHY, CIK — all synced in Story 75.2 — ensures the `YOU BOUGHT`
rows are processed as real trades.

### Prerequisites

This story **requires** Stories 75.1 and 75.2 to be fully implemented and green. The import
tests are positioned as tests 4 and 5 within the describe block; they run after the universe
sync test (test 3), relying on OXLC, NHS, DHY, CIK being present in the `universe` table.

### References

- Story 75.1 (foundation): [75-1-system-e2e-db-clear-and-screener-refresh.md](75-1-system-e2e-db-clear-and-screener-refresh.md)
- Story 75.2 (previous): [75-2-system-e2e-universe-sync-distribution-check.md](75-2-system-e2e-universe-sync-distribution-check.md)
- Story 74.1 (fixture format): [74-1-diagnose-csv-import-residual-error.md](74-1-diagnose-csv-import-residual-error.md)
- Import regression pattern: `apps/dms-material-e2e/src/csv-import-regression-69.spec.ts`
- Import dialog selectors: `apps/dms-material/src/app/global/import-dialog/import-dialog.component.spec.ts`
- Import dialog template: `apps/dms-material/src/app/global/global-universe/global-universe.component.html`
- Import API: `apps/server/src/app/routes/import/index.ts`

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

/home/dave/.config/Code/User/workspaceStorage/9117f4dfebedc800a9f9baf39267cef9/GitHub.copilot-chat/debug-logs/45a87ae3-8f44-4b60-9b11-520c69db4789

### Completion Notes List

- Fixture symbols OXLC, NHS, DHY, CIK confirmed from Story 75.2 as known universe members.
- File upload pattern confirmed from `csv-import-regression-69.spec.ts` — use
  `page.locator('input[type="file"]').setInputFiles(filePath)`.
- `[data-testid="import-transactions-button"]` confirmed from `global-universe.component.html`
  and `global-universe-import.integration.spec.ts`.
- `[data-testid="import-result"]` confirmed from `import-dialog.component.spec.ts` as the
  inline result display (not a snackbar).
- No `GET /api/trades/count` endpoint exists — trade count assertion implemented via captured
  `imported` response fields.
- Account creation guard needed in `beforeAll` because `DELETE /api/test/reset` does not clear
  the `accounts` table; re-runs may encounter a duplicate name.
- `[data-testid="cancel-button"]` confirmed from `import-dialog.component.spec.ts` for closing
  the dialog between the two imports.

### File List

- `apps/dms-material-e2e/fixtures/system-fidelity-2025.csv` — **new**
- `apps/dms-material-e2e/fixtures/system-fidelity-2026.csv` — **new**
- `apps/dms-material-e2e/src/system-integration.spec.ts` — **modified** (beforeAll account
  creation + 3 new test blocks)
