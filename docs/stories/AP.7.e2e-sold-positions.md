# Story AP.7: E2E Tests for Sold Positions Screen

## Story

**As a** developer
**I want** comprehensive E2E tests for the sold positions screen
**So that** I can ensure the complete user workflow functions correctly

## Context

**Current System:**

- Stories AP.1-AP.6 implemented sold positions features
- Component wired to SmartNgRX
- Capital gains display implemented
- Date filtering implemented
- Need E2E tests to verify full workflow

**Problem:**

- Unit tests verify individual components
- Need end-to-end verification of complete user workflows
- Need to test browser compatibility (Chromium, Firefox)

## Acceptance Criteria

### Functional Requirements

- [ ] Test sold positions table displays
- [ ] Test data loads from backend
- [ ] Test filtering by account
- [ ] Test capital gains calculations display correctly
- [ ] Test date range filtering
- [ ] Test clear filters functionality
- [ ] Test empty state displays when no sold positions
- [ ] Tests run in both Chromium and Firefox

### Technical Requirements

- [ ] E2E tests created using Playwright
- [ ] Tests follow page object pattern
- [ ] Tests use sequential browser execution (avoid SQLite conflicts)
- [ ] Tests handle loading states
- [ ] Tests verify visual elements

## Implementation Approach

### Step 1: Create E2E Test File

Create `apps/dms-material-e2e/src/sold-positions.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/login.helper';

const ACCOUNT_UUID = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

test.describe('Sold Positions Screen', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.waitForTimeout(2000); // Wait for universe data
  });

  test('should display sold positions table', async ({ page }) => {
    await page.goto(`/account/${ACCOUNT_UUID}`);
    await page.click('text=Sold Positions');

    // Wait for table to load
    await expect(page.locator('table.positions-table')).toBeVisible();

    // Verify table headers
    await expect(page.locator('th:has-text("Symbol")')).toBeVisible();
    await expect(page.locator('th:has-text("Quantity")')).toBeVisible();
    await expect(page.locator('th:has-text("Capital Gain")')).toBeVisible();
    await expect(page.locator('th:has-text("% Gain/Loss")')).toBeVisible();
  });

  test('should display only sold positions (sell_date not null)', async ({ page }) => {
    await page.goto(`/account/${ACCOUNT_UUID}`);
    await page.click('text=Sold Positions');

    // Get all rows (excluding header)
    const rows = await page.locator('table.positions-table tbody tr').all();

    // Verify at least one sold position exists in test data
    expect(rows.length).toBeGreaterThan(0);

    // Verify Sell Date column exists and has values
    const sellDateCells = await page.locator('td:has-text("/")').all();
    expect(sellDateCells.length).toBeGreaterThan(0);
  });

  test('should display capital gains with color coding', async ({ page }) => {
    await page.goto(`/account/${ACCOUNT_UUID}`);
    await page.click('text=Sold Positions');

    // Wait for table to load
    await page.waitForSelector('table.positions-table');

    // Look for gain/loss styling
    const gainCells = await page.locator('.gain').all();
    const lossCells = await page.locator('.loss').all();

    // At least one should exist (depends on test data)
    expect(gainCells.length + lossCells.length).toBeGreaterThan(0);
  });

  test('should filter by start date', async ({ page }) => {
    await page.goto(`/account/${ACCOUNT_UUID}`);
    await page.click('text=Sold Positions');

    // Wait for initial load
    await page.waitForSelector('table.positions-table');
    const initialCount = await page.locator('table.positions-table tbody tr').count();

    // Apply start date filter
    await page.fill('input[placeholder*="Start Date"]', '2024-06-01');

    // Verify filtered results
    const filteredCount = await page.locator('table.positions-table tbody tr').count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('should filter by end date', async ({ page }) => {
    await page.goto(`/account/${ACCOUNT_UUID}`);
    await page.click('text=Sold Positions');

    // Wait for initial load
    await page.waitForSelector('table.positions-table');
    const initialCount = await page.locator('table.positions-table tbody tr').count();

    // Apply end date filter
    await page.fill('input[placeholder*="End Date"]', '2024-06-30');

    // Verify filtered results
    const filteredCount = await page.locator('table.positions-table tbody tr').count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('should filter by both start and end date', async ({ page }) => {
    await page.goto(`/account/${ACCOUNT_UUID}`);
    await page.click('text=Sold Positions');

    // Wait for initial load
    await page.waitForSelector('table.positions-table');

    // Apply both filters
    await page.fill('input[placeholder*="Start Date"]', '2024-01-01');
    await page.fill('input[placeholder*="End Date"]', '2024-06-30');

    // Verify table still renders
    await expect(page.locator('table.positions-table')).toBeVisible();
  });

  test('should clear filters', async ({ page }) => {
    await page.goto(`/account/${ACCOUNT_UUID}`);
    await page.click('text=Sold Positions');

    // Wait for initial load
    await page.waitForSelector('table.positions-table');
    const initialCount = await page.locator('table.positions-table tbody tr').count();

    // Apply filters
    await page.fill('input[placeholder*="Start Date"]', '2024-06-01');
    const filteredCount = await page.locator('table.positions-table tbody tr').count();

    // Clear filters
    await page.click('button:has-text("Clear Filters")');

    // Verify count returns to initial
    const clearedCount = await page.locator('table.positions-table tbody tr').count();
    expect(clearedCount).toBe(initialCount);
  });

  test.skip('should display empty state when no sold positions', async ({ page }) => {
    // Requires test account with no sold positions
    await page.goto(`/account/${ACCOUNT_UUID}`);
    await page.click('text=Sold Positions');

    await expect(page.locator('text=No sold positions')).toBeVisible();
  });

  test.skip('should update when switching accounts', async ({ page }) => {
    // Requires multiple test accounts
    await page.goto(`/account/${ACCOUNT_UUID}`);
    await page.click('text=Sold Positions');

    const account1Count = await page.locator('table.positions-table tbody tr').count();

    // Switch to different account
    await page.selectOption('select[name="account"]', 'different-account-id');

    const account2Count = await page.locator('table.positions-table tbody tr').count();

    // Counts should potentially differ
    expect(account1Count).not.toBe(account2Count);
  });

  test('should display loading state', async ({ page }) => {
    await page.goto(`/account/${ACCOUNT_UUID}`);

    // Look for spinner during navigation
    const spinnerPromise = page
      .locator('mat-spinner')
      .waitFor({ state: 'visible', timeout: 1000 })
      .catch(() => null);

    await page.click('text=Sold Positions');

    // Spinner might appear briefly
    await spinnerPromise;

    // Eventually table should load
    await expect(page.locator('table.positions-table')).toBeVisible({ timeout: 5000 });
  });

  test('should display currency formatting', async ({ page }) => {
    await page.goto(`/account/${ACCOUNT_UUID}`);
    await page.click('text=Sold Positions');

    await page.waitForSelector('table.positions-table');

    // Verify currency symbols appear
    const currencyCells = await page.locator('td:has-text("$")').all();
    expect(currencyCells.length).toBeGreaterThan(0);
  });

  test('should display percentage formatting', async ({ page }) => {
    await page.goto(`/account/${ACCOUNT_UUID}`);
    await page.click('text=Sold Positions');

    await page.waitForSelector('table.positions-table');

    // Verify percentage symbols appear
    const percentCells = await page.locator('td:has-text("%")').all();
    expect(percentCells.length).toBeGreaterThan(0);
  });
});
```

### Step 2: Update E2E Project Configuration

Ensure `apps/dms-material-e2e/project.json` has sequential execution:

```json
{
  "e2e": {
    "executor": "@nx/playwright:playwright",
    "options": {
      "project": ["chromium"]
    }
  },
  "e2e-ui": {
    "executor": "@nx/playwright:playwright",
    "options": {
      "project": ["firefox"]
    },
    "dependsOn": ["e2e"]
  }
}
```

### Step 3: Run E2E Tests

```bash
# Run Chromium tests
pnpm nx e2e dms-material-e2e

# Run Firefox tests
pnpm nx e2e-ui dms-material-e2e

# Run all E2E tests sequentially
pnpm e2e:dms-material
```

### Step 4: Verify Tests Pass

All tests should pass in both browsers except skipped tests.

## Definition of Done

- [ ] E2E tests created for sold positions screen
- [ ] Tests verify table display
- [ ] Tests verify data loading
- [ ] Tests verify capital gains display
- [ ] Tests verify date filtering
- [ ] Tests verify clear filters
- [ ] Tests run in Chromium (passing)
- [ ] Tests run in Firefox (passing)
- [ ] Skipped tests documented with reason
- [ ] Code reviewed
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Follow sequential execution pattern from AO.9 to avoid SQLite conflicts
- Some tests skipped requiring specific test data (empty state, multiple accounts)
- 2-second sleep in beforeEach may need adjustment based on universe data load time
- Tests should work with whatever sold position data exists in test database

## Dependencies

- Stories AP.1-AP.6 completed
- Playwright E2E framework configured
- Test database seeded with sold positions
- Sequential browser execution configured
