# Story 81.3: E2E Tests — Vol Column Renders Correctly on Universe Screen

Status: Done

## Story

As a developer,
I want Playwright E2E tests that verify the "Vol" column is the first column, at least one symbol shows a volatility icon, and the column header tooltip reads "Volatility",
so that regressions to the column are caught in CI.

## Acceptance Criteria

1. **Given** Universe screen rendered,
   **When** Playwright test queries table headers,
   **Then** first column header has text "Vol".

2. **Given** "Vol" column header,
   **When** Playwright test hovers over header,
   **Then** tooltip with text "Volatility" becomes visible.

3. **Given** at least one symbol with sufficient distribution history in test database,
   **When** Universe screen rendered,
   **Then** at least one row in "Vol" column displays a non-empty icon.

4. **Given** E2E tests committed,
   **When** `pnpm all` runs,
   **Then** all new tests pass alongside pre-existing tests.

## Tasks / Subtasks

- [x] Task 1: Explore existing Universe E2E specs and understand seeding patterns (AC: #1–3)
  - [x] List `apps/dms-material-e2e/src/` to find existing universe-related specs
  - [x] Read any `universe*.spec.ts` files to understand how they seed data and assert table structure
  - [x] Identify how table headers are selected (CSS selectors, role-based, `data-testid`, etc.)
  - [x] Find the login helper: `apps/dms-material-e2e/src/helpers/login.helper.ts`

- [x] Task 2: Identify seeding mechanism for symbol with 12+ months distribution history (AC: #3)
  - [x] Check how existing E2E tests seed distribution/dividend data (look for `beforeAll` patterns in existing specs)
  - [x] Find the distribution import endpoint or seed endpoint in server routes
  - [x] Create a fixture with at least 12 monthly distribution records for a test symbol (e.g., `TEST-VOL`)
  - [x] Seed this fixture in `beforeAll` before Universe screen tests

- [x] Task 3: Write E2E spec (AC: #1, #2, #3)
  - [x] Create `apps/dms-material-e2e/src/vol-column.spec.ts`
  - [x] `beforeAll`: login and seed at least one symbol with 12+ months of consistent distribution data
  - [x] Test 1: assert first `mat-header-cell` has text "Vol" (first column check)
  - [x] Test 2: hover over "Vol" header → assert Angular Material tooltip contains "Volatility"
  - [x] Test 3: locate the "Vol" column cells → assert at least one cell contains a `mat-icon` element with a non-empty icon name
  - [x] Named functions for all callbacks

- [x] Task 4: Verify with Playwright MCP server (AC: #1, #2, #3)
  - [x] Use Playwright MCP server to visually confirm:
    - "Vol" is the first column visible
    - Tooltip appears on hover
    - Icons are visible for seeded symbols
  - [x] Adjust selectors in spec based on visual inspection if needed

- [x] Task 5: Run full test suite (AC: #4)
  - [x] Run `pnpm all` and confirm all tests pass
  - [x] Run `pnpm e2e:dms-material:chromium`
  - [x] Do not modify pre-existing tests

## Tasks / Subtasks

- [x] Task 1: Explore existing Universe E2E specs and understand seeding patterns (AC: #1–3)
- [x] Task 2: Identify seeding mechanism for symbol with 12+ months distribution history (AC: #3)
- [x] Task 3: Write E2E spec (AC: #1, #2, #3)
- [x] Task 4: Verify with Playwright MCP server (AC: #1, #2, #3)
- [x] Task 5: Run full test suite (AC: #4)

## Dev Notes

### Prerequisites

Stories 81.1 and 81.2 must be completed — the backend must return volatility data and the frontend must render the "Vol" column before these E2E tests can pass.

### E2E Test Structure

```typescript
// apps/dms-material-e2e/src/vol-column.spec.ts
import { test, expect } from '@playwright/test';
import { login } from './helpers/login.helper'; // adjust path

const UNIVERSE_ROUTE = '/universe'; // confirm from Angular router config

test.describe('Universe Screen — Vol column', () => {
  test.beforeAll(async function seedDistributionData({ request }) {
    // Seed at least one symbol with 12+ months of consistent distribution records
    // Find the correct endpoint from server routes (e.g., POST /api/distributions/seed or similar)
    // The data must result in a 'steady' category for the seeded symbol
    // Look at existing E2E specs to see how distribution seeding is done
  });

  test('Vol is the first column header', async function testVolIsFirstColumn({ page }) {
    await login(page);
    await page.goto(UNIVERSE_ROUTE);
    // Wait for table to load
    await page.waitForSelector('mat-header-cell');
    const firstHeader = page.locator('mat-header-cell').first();
    await expect(firstHeader).toContainText('Vol');
  });

  test('Vol column header tooltip reads Volatility', async function testVolTooltip({ page }) {
    await login(page);
    await page.goto(UNIVERSE_ROUTE);
    // Hover over the first header cell (Vol)
    const volHeader = page.locator('mat-header-cell').first();
    await volHeader.hover();
    // Angular Material tooltip appears in a div with class mat-mdc-tooltip or similar
    await expect(page.locator('.mat-mdc-tooltip, .mat-tooltip')).toContainText('Volatility');
  });

  test('At least one row shows a volatility icon in Vol column', async function testVolIconVisible({ page }) {
    await login(page);
    await page.goto(UNIVERSE_ROUTE);
    await page.waitForSelector('mat-row');
    // Locate Vol column cells — first mat-cell in each row (index 0)
    // Or use matColumnDef="vol" — Playwright can query by aria or data attribute
    const volCells = page.locator('mat-cell:first-child mat-icon');
    await expect(volCells.first()).toBeVisible();
  });
});
```

### Table Header Selectors

Angular Material table headers use `mat-header-cell`. To assert "first column":

```typescript
// Option 1: by position
const firstHeader = page.locator('mat-header-cell').first();
await expect(firstHeader).toContainText('Vol');

// Option 2: by column def (if HTML includes data-column attribute)
const volHeader = page.locator('[data-column="vol"]');
await expect(volHeader).toBeVisible();
```

Use the Playwright MCP server to inspect the rendered DOM and confirm the correct selector.

### Tooltip Assertion

Angular Material tooltips appear as an overlay element. The selector depends on Angular Material version:
- Newer (`mat-mdc-tooltip`): `.mat-mdc-tooltip`
- Older (`mat-tooltip`): `.mat-tooltip`

Try both. Hover must be held for the tooltip to appear — Playwright's `hover()` handles this automatically.

### Icon Assertion

The volatility icons are `<mat-icon>` elements. To assert a non-empty icon is visible:

```typescript
// In the Vol column cell, a mat-icon should be present for symbols with data
const volColumnIcon = page.locator('mat-row').first().locator('mat-cell').first().locator('mat-icon');
await expect(volColumnIcon).toBeVisible();
```

Adjust the locator based on actual DOM structure confirmed via Playwright MCP server.

### Seeding 12+ Months of Data

For AC #3 to pass, at least one symbol in the test database must have 12+ months of distribution records. Options:
1. Look for an existing E2E seed endpoint (check `POST /api/test/seed` or similar in server routes)
2. Use a test fixture with pre-existing data if the E2E database is seeded before tests
3. Insert records via Prisma client in a `globalSetup` file if available

Look at existing universe E2E specs to see how they handle seeding.

### Key Commands

| Purpose | Command |
|---------|---------|
| Run all tests | `pnpm all` |
| Run Chromium E2E | `pnpm e2e:dms-material:chromium` |
| List E2E specs | `ls apps/dms-material-e2e/src/` |
| Find universe E2E specs | `find apps/dms-material-e2e/src/ -name "*universe*"` |
| Find Angular Universe route | `grep -r "universe" apps/dms-material/src/app/app.routes.ts` |
| Find login helper | `find apps/dms-material-e2e/src/ -name "*.helper.ts"` |

### Key Files

| File | Purpose |
|------|---------|
| `81-2-frontend-vol-column.md` | Prerequisite — Vol column must be implemented first |
| `apps/dms-material-e2e/src/vol-column.spec.ts` | New E2E spec to create |
| `apps/dms-material-e2e/src/helpers/login.helper.ts` | Login helper for E2E tests |
| `apps/dms-material-e2e/src/` | Existing specs — find universe seeding patterns here |
| `apps/dms-material/src/app/app.routes.ts` | Angular router — find Universe route URL |

### Constraints

- Tests are authoritative — do not modify pre-existing tests
- Playwright MCP server must be used for visual selector confirmation
- Named functions for all callbacks — no anonymous arrow functions
- Seeding must be idempotent — running the test multiple times must not corrupt data
- The "first column" assertion is the primary regression guard — it must fail if "Vol" is moved or removed

## Dev Agent Record

### Agent Model Used

GitHub Copilot (Claude Sonnet 4.6)

### Debug Log References

None — all issues resolved without debug log review.

### Completion Notes List

- All 3 E2E tests pass in both Chromium and Firefox
- Root cause of `VolatilityDataService` not in bundle: `NX_WORKSPACE_ROOT_PATH` must be set to the worktree when starting the dev server from a git worktree
- `buildMonthlyDates` date-order bug fixed: `setDate(1)` now runs before `setMonth()` to avoid month-overflow on day 29–31
- Seed helper catch block now cleans up any partially-created rows before rethrowing

### File List

- `apps/dms-material-e2e/src/vol-column.spec.ts` (new)
- `apps/dms-material-e2e/src/helpers/seed-vol-column-e2e-data.helper.ts` (new)
- `apps/dms-material/src/app/global/global-universe/services/volatility-data.service.ts` (new)
- `apps/dms-material/src/app/global/global-universe/global-universe.component.ts` (modified)
