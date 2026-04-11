# Story 66.4: E2E Tests for CEF Classification on Symbol Add

Status: Approved

## Story

As a developer,
I want end-to-end Playwright tests that verify a known CEF is classified correctly when added
via both the CSV import and the + button,
so that any future regression in the CEF classification path is caught before it ships.

## Acceptance Criteria

1. **Given** the Playwright MCP server is used to add a known CEF symbol (e.g. OXLC) via the +
   button on the Universe screen,
   **When** the symbol is added and the Universe table refreshes,
   **Then** the symbol's Risk Group column shows the correct CEF classification (Income — not the
   generic equity default).

2. **Given** a CSV import contains a buy transaction for a known CEF symbol not yet in the universe,
   **When** the import completes and the Universe table is refreshed,
   **Then** the symbol's Risk Group column shows the correct CEF classification.

3. **Given** a non-CEF symbol (regular equity) is added via the + button,
   **When** the symbol is saved and the Universe table is refreshed,
   **Then** the symbol's Risk Group column shows the equity risk group — the CEF lookup has not
   altered it.

4. **Given** all E2E tests pass,
   **When** `pnpm all` runs,
   **Then** all tests pass with no regressions.

## Definition of Done

- [ ] Stories 66.1, 66.2, and 66.3 are complete
- [ ] Playwright MCP server used to verify a known CEF symbol (OXLC) is classified correctly via + button add before writing the test
- [ ] Playwright MCP server used to verify a known CEF symbol is classified correctly via CSV import before writing the test
- [ ] E2E test file `cef-classification-symbol-add.spec.ts` created in `apps/dms-material-e2e/src/`
- [ ] Tests cover: CEF via + button (AC: #1), CEF via CSV import (AC: #2), non-CEF via + button — equity default (AC: #3)
- [ ] All new tests pass green
- [ ] `pnpm run e2e:dms-material:chromium` passes
- [ ] `pnpm all` passes

## Tasks / Subtasks

- [ ] Task 1: Use Playwright MCP server to reproduce and verify the CEF classification behaviour (AC: #1, #2)
  - [ ] Subtask 1.1: Start the local dev server (or confirm it is running on `http://localhost:4200`)
  - [ ] Subtask 1.2: Use Playwright MCP server to navigate to the Universe screen and open the Add Symbol dialog
  - [ ] Subtask 1.3: Add OXLC via the + button; wait for the table to refresh; inspect the Risk Group column for the new OXLC row — confirm it shows "Income" (or whichever CEF classification applies)
  - [ ] Subtask 1.4: Prepare a minimal CSV with a buy transaction for a known CEF not already in the universe (e.g. `ECC` — Eagle Point Credit Company, a well-known CEF on CefConnect); use the import dialog to upload it; confirm the resulting universe row shows the correct CEF risk group
  - [ ] Subtask 1.5: Add a known plain equity (e.g. `AAPL`) via the + button and confirm its Risk Group shows "Equities" — verify the CEF lookup did not alter it
  - [ ] Subtask 1.6: Document the exact selectors observed (Risk Group column index, dialog input, add button label) in Dev Notes before writing tests

- [ ] Task 2: Create the E2E seed helper and test CSV fixture (AC: #1, #2)
  - [ ] Subtask 2.1: Check `apps/dms-material-e2e/src/helpers/` for an existing seeder pattern (e.g. `seed-split-import-e2e-data.helper.ts`) — follow the same pattern
  - [ ] Subtask 2.2: Create a seeder or `beforeEach` hook that ensures OXLC and the chosen CSV-import CEF are NOT in the universe before each test (clean state via direct Prisma delete)
  - [ ] Subtask 2.3: Create a test CSV file in `apps/dms-material-e2e/src/fixtures/` (or wherever existing CSVs live in the project — check `split-import-e2e.spec.ts` for the fixture upload pattern) containing a single buy transaction for the chosen CEF symbol
  - [ ] Subtask 2.4: The test CSV must follow the Fidelity format: `Account Name/Number,Symbol,Description,Type,Action,Quantity,Price,Amount,Settlement Date` — use the same format as existing fixture CSVs

- [ ] Task 3: Write the E2E test file (AC: #1, #2, #3, #4)
  - [ ] Subtask 3.1: Create `apps/dms-material-e2e/src/cef-classification-symbol-add.spec.ts`
  - [ ] Subtask 3.2: Follow test structure from `apps/dms-material-e2e/src/split-import-e2e.spec.ts` — `test.describe` wrapper, `beforeEach` seed/cleanup, `afterEach` cleanup
  - [ ] Subtask 3.3: Write test 1 — CEF added via + button:
    - Navigate to Universe screen
    - Click the Add Symbol (+) button (selector observed in Task 1)
    - Fill in ticker (e.g. OXLC) and submit
    - Wait for the row to appear in the table
    - Assert the Risk Group column shows the CEF classification (e.g. "Income")
    - Assert `is_closed_end_fund` attribute on the row (`data-is-cef="true"` if present)
  - [ ] Subtask 3.4: Write test 2 — CEF added via CSV import:
    - Navigate to the import screen / import button
    - Upload the fixture CSV (follow `uploadFile()` helper from `split-import-e2e.spec.ts`)
    - Navigate to Universe screen
    - Find the row for the imported symbol
    - Assert the Risk Group column shows the correct CEF classification
  - [ ] Subtask 3.5: Write test 3 — non-CEF symbol via + button:
    - Navigate to Universe screen
    - Add a known non-CEF equity (e.g. `AAPL` or another plain stock)
    - Assert the Risk Group column shows the equity risk group (not Income or Tax Free)
  - [ ] Subtask 3.6: Add `afterEach` or `afterAll` cleanup to remove the test symbols from the universe via Prisma (pattern from `split-import-e2e.spec.ts`)

- [ ] Task 4: Validate all tests pass (AC: #4)
  - [ ] Subtask 4.1: Run `pnpm run e2e:dms-material:chromium` — all new tests must be green
  - [ ] Subtask 4.2: Run `pnpm all` — no regressions in any other test file
  - [ ] Subtask 4.3: Confirm the test file is correctly included in the Playwright config (check `apps/dms-material-e2e/playwright.config.ts` or equivalent)

## Dev Notes

### Key Files

| File | Purpose |
|------|---------|
| `apps/dms-material-e2e/src/universe-table-workflows.spec.ts` | Reference for Add Symbol dialog selectors (lines 459–490): `button.add-symbol-btn` or `mat-dialog-container`, `Add Symbol` dialog text |
| `apps/dms-material-e2e/src/split-import-e2e.spec.ts` | Reference for CSV upload pattern: `uploadFile(page, 'filename.csv')` helper, `beforeEach` seed pattern, `afterAll` cleanup pattern |
| `apps/dms-material-e2e/src/helpers/` | Seeders and helper utilities — check for existing `uploadFile` and prisma cleanup helpers |
| `apps/dms-material-e2e/src/cef-classification-symbol-add.spec.ts` | **NEW FILE** — the E2E test file to create |
| `apps/server/src/app/routes/universe/add-symbol/index.ts` | Route definition confirms `POST /add-symbol` endpoint with `{ symbol, risk_group_id }` body |
| `prisma/schema.prisma` | Universe model: `risk_group_id String`, `is_closed_end_fund Boolean` — used for direct DB assertions |

### Architecture Context

**Universe table columns (observed from `universe-table-workflows.spec.ts`):**
- Column 1: Symbol
- Column 2: Risk Group
- Column 3: Distribution
- Column 4: Dist/Year
- Column 5: Yield %
- Column 13: Actions

The Risk Group column (column 2) displays the `risk_group.name` value — "Equities", "Income", or "Tax Free Income". Tests should assert on this visible text.

**Add Symbol dialog (from `universe-table-workflows.spec.ts`, line 460–480):**
- Dialog is opened by clicking the add button
- Dialog contains text "Add Symbol"
- The selector for "add symbol dialog" is `mat-dialog-container` with text "Add Symbol"
- The existing tests at lines 460–490 already cover opening the dialog — use these selectors as the starting point

**Known CEF symbols for testing:**
- **OXLC** (Oxford Lane Capital Corp) — monthly payer, confirms as CEF on CefConnect, CategoryId in Income range (11–20) → Risk Group: "Income"
- **ECC** (Eagle Point Credit Company) — also an Income CEF, good choice for CSV import test
- **AAPL** (Apple Inc) — plain equity, NOT on CefConnect, good for the non-CEF test case

**Note on test isolation:** Each test must clean up created symbols. OXLC may already exist in the seeded test database — check if the pre-seed data includes it, and adjust accordingly (e.g., use a less common CEF for the add test, or ensure the seed clears and re-adds).

**Playwright MCP server must be used** to verify the actual UI state before writing assertions. The selector details (especially the Add Symbol button selector and Risk Group column text) must be confirmed against the live application — do not assume from the spec comments alone.

**CSV fixture format (Fidelity):** Based on existing test CSVs in the project:
```
Account Name/Number,Symbol,Description,Type,Action,Quantity,Price,Amount,Settlement Date
TEST ACCOUNT,ECC,Eagle Point Credit,Margin,Buy,100,10.00,-1000.00,04/15/2026
```

### Technical Guidance

- **Playwright MCP server is mandatory before any code changes** (per NFR3) — use it to confirm the CEF classification is working and to capture the exact selectors.
- The RiskGroup column text may be truncated in narrow viewports — use `toContainText()` rather than `toBe()` if needed.
- If OXLC already exists in the test seed database, the "add via + button" test must either: (a) delete OXLC before the test and re-add it, or (b) choose a different known CEF that is not in the seed. Check the seed data before deciding.
- For the CSV import test, the fixture CSV must be placed where `uploadFile()` helper can find it — check the existing helper to find the fixtures directory.
- Do not assert on `data-is-cef` attributes unless they exist in the DOM — first confirm with Playwright MCP server. Prefer text-based assertions on the Risk Group column.

### Testing Standards
- E2E tests: Playwright in `apps/dms-material-e2e/src/`
- Test file: `cef-classification-symbol-add.spec.ts`
- `pnpm run e2e:dms-material:chromium` must pass
- `pnpm all` must pass

### Project Structure Notes
- E2E tests use `test.describe` / `test` (not `describe` / `it`) — Playwright API
- `beforeEach` for setup, `afterEach` / `afterAll` for cleanup
- Follow the import pattern from existing spec files: `import { test, expect } from '@playwright/test'`
- Prisma client can be imported directly in E2E specs for DB assertions (see `split-import-e2e.spec.ts` pattern)

### References
- [Source: `_bmad-output/planning-artifacts/epics-2026-04-10.md`#Epic 66 / Story 66.4]
- [Add Symbol dialog: `apps/dms-material-e2e/src/universe-table-workflows.spec.ts`#L459]
- [CSV upload pattern: `apps/dms-material-e2e/src/split-import-e2e.spec.ts`#L65]
- [Universe schema: `prisma/schema.prisma`#universe]

## Dev Agent Record

### Agent Model Used

_[to be filled by dev agent]_

### Debug Log References

### Completion Notes List

### File List
