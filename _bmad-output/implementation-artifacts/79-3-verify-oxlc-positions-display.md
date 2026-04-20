# Story 79.3: Verify All OXLC Positions and Dividends Display Correctly

Status: Approved

## Story

As Dave,
I want to see all OXLC positions and dividends for my Joint Brokerage account in the app after re-importing the Fidelity CSV,
so that my portfolio data is accurate and complete.

## Acceptance Criteria

1. **Given** fixed import pipeline and re-imported CSV,
   **When** Dave opens Positions screen filtered to Joint Brokerage account,
   **Then** OXLC positions appear with correct quantities and values matching Fidelity CSV.

2. **Given** same import state,
   **When** Dave opens Dividends/Distributions screen for OXLC in Joint Brokerage,
   **Then** all OXLC dividend rows from CSV appear with correct dates, amounts, and account attribution.

3. **Given** Playwright E2E test written to verify OXLC Joint Brokerage visibility,
   **When** test imports CSV and navigates to Positions screen,
   **Then** test asserts at least one OXLC row visible for Joint Brokerage.

4. **Given** `pnpm all` runs,
   **Then** new E2E test passes along with all pre-existing tests.

## Tasks / Subtasks

- [ ] Task 1: Locate Positions and Distributions screens in Angular app (AC: #1, #2)
  - [ ] Find Angular router config: `apps/dms-material/src/app/app.routes.ts` or equivalent
  - [ ] Identify route paths for Positions screen and Distributions/Dividends screen
  - [ ] Navigate to each screen in the running app using Playwright MCP server to confirm OXLC rows appear after fix from 79.2
  - [ ] Verify Joint Brokerage filter is applied and OXLC rows are present with correct quantities/values

- [ ] Task 2: Visual verification with Playwright MCP server (AC: #1, #2)
  - [ ] Use Playwright MCP server to open the app
  - [ ] Navigate to Positions screen, apply Joint Brokerage filter
  - [ ] Confirm at least one OXLC row visible with correct data
  - [ ] Navigate to Distributions/Dividends screen, filter by OXLC / Joint Brokerage
  - [ ] Confirm all OXLC dividend rows visible with correct dates and amounts

- [ ] Task 3: Create E2E test spec for OXLC Joint Brokerage verification (AC: #3)
  - [ ] Identify existing E2E import patterns: look for `csv-import*.spec.ts` or similar in `apps/dms-material-e2e/src/`
  - [ ] Find the CSV import endpoint: look for `POST /api/import` or `POST /api/csv` in server routes
  - [ ] Create new spec file in `apps/dms-material-e2e/src/` (e.g., `oxlc-joint-brokerage.spec.ts`)
  - [ ] In `beforeAll`: call CSV import endpoint with Fidelity CSV data containing OXLC rows
  - [ ] Login using existing login helper from `apps/dms-material-e2e/src/helpers/login.helper.ts`
  - [ ] Navigate to Positions screen and apply Joint Brokerage filter
  - [ ] Assert at least one row with OXLC ticker is visible
  - [ ] Navigate to Distributions screen and assert at least one OXLC dividend row is visible

- [ ] Task 4: Run full test suite (AC: #4)
  - [ ] Run `pnpm all` and confirm all tests pass including new E2E spec
  - [ ] Run Chromium E2E specifically: `pnpm e2e:dms-material:chromium`
  - [ ] Do not modify pre-existing tests

## Dev Notes

### Prerequisites

- Stories 79.1 and 79.2 must be completed: the fix is applied and the CSV has been re-imported
- The app must be running locally for manual verification and E2E tests

### E2E Test Pattern

Look at existing CSV import E2E tests for the import seeding pattern. The new test structure should follow:

```typescript
// oxlc-joint-brokerage.spec.ts
import { test, expect } from '@playwright/test';
import { login } from './helpers/login.helper'; // adjust path

test.describe('OXLC Joint Brokerage', () => {
  test.beforeAll(async ({ request }) => {
    // Seed: import CSV containing OXLC rows
    // Find the actual import endpoint URL from server routes
    const response = await request.post('/api/import', {
      multipart: { file: { name: 'Fidelity-2025.csv', mimeType: 'text/csv', buffer: /* CSV bytes */ } },
    });
    expect(response.ok()).toBeTruthy();
  });

  test('OXLC position appears in Joint Brokerage on Positions screen', async ({ page }) => {
    await login(page);
    await page.goto('/positions'); // adjust route from Angular router config
    // Apply Joint Brokerage filter (find UI control: dropdown/tab)
    await page.getByRole('option', { name: 'Joint Brokerage' }).click(); // adjust selector
    await expect(page.getByText('OXLC')).toBeVisible();
  });

  test('OXLC dividends appear in Distributions screen for Joint Brokerage', async ({ page }) => {
    await login(page);
    await page.goto('/distributions'); // adjust route from Angular router config
    // Filter by OXLC / Joint Brokerage
    await expect(page.getByText('OXLC')).toBeVisible();
  });
});
```

### Locating Screen Routes

| Screen | Likely Route | Where to Confirm |
|--------|-------------|-----------------|
| Positions | `/positions` or `/accounts` | `apps/dms-material/src/app/app.routes.ts` |
| Distributions/Dividends | `/distributions` or `/dividends` | Same router config file |

### Account Filter

Find how the Joint Brokerage account filter is implemented in the UI — it may be:
- A dropdown with account names
- A tab component
- A URL query parameter (`?account=Joint+Brokerage`)

Look for the filter in the Positions component template to determine the correct Playwright selector.

### Key Commands

| Purpose | Command |
|---------|---------|
| Run all tests | `pnpm all` |
| Run Chromium E2E only | `pnpm e2e:dms-material:chromium` |
| Find import endpoint in server | `grep -r "import\|csv" apps/server/src/app/routes/ --include="*.ts" -l` |
| Find Angular routes | `cat apps/dms-material/src/app/app.routes.ts` |
| Find existing E2E import specs | `ls apps/dms-material-e2e/src/` |
| Find login helper | `find apps/dms-material-e2e/src/ -name "*.helper.ts"` |

### Key Files

| File | Purpose |
|------|---------|
| `79-2-fix-csv-import-split-logic.md` | Prerequisite story — fix must be applied first |
| `apps/dms-material/src/app/app.routes.ts` | Angular router config — find positions/distributions routes |
| `apps/dms-material-e2e/src/` | E2E test directory — find import patterns and login helper |
| `apps/dms-material-e2e/src/helpers/login.helper.ts` | Login helper for E2E tests |
| `apps/server/src/app/routes/` | Server routes — find CSV import endpoint URL |
| `/home/dave/Fidelity-2025.csv` | Source CSV with OXLC data for E2E seeding |

### Constraints

- Tests are authoritative — do not modify pre-existing E2E tests
- Use `inject()`, `OnPush`, and signal-first patterns if any Angular code needs adjusting
- Playwright MCP server must be used for visual verification
- No anonymous arrow function callbacks in E2E test code

## Dev Agent Record

### Agent Model Used

_TBD_

### Debug Log References

### Completion Notes List

### File List
