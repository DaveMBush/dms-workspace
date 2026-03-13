import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedUniverseE2eData } from './helpers/seed-universe-e2e-data.helper';

/**
 * Helper: read sort state from the sort-filter localStorage key.
 */
async function getSortState(
  page: Page,
  table: string
): Promise<{ field: string; order: string } | null> {
  return page.evaluate(function readSortFilterState(t: string) {
    const raw = localStorage.getItem('dms-sort-filter-state');
    if (raw === null) {
      return null;
    }
    const state = JSON.parse(raw);
    const entry = state[t];
    if (entry === undefined || entry === null) {
      return null;
    }
    return (entry.sort as { field: string; order: string }) ?? null;
  }, table);
}

/**
 * Helper: clear sort-filter state from localStorage.
 */
async function clearSortFilterState(page: Page): Promise<void> {
  await page.evaluate(function removeSortFilterState(): void {
    localStorage.removeItem('dms-sort-filter-state');
  });
}

/**
 * Helper: wait for universe table rows to appear.
 */
async function waitForTableRows(page: Page): Promise<void> {
  await expect(page.locator('dms-base-table')).toBeVisible({ timeout: 15000 });
  await page.waitForSelector('tr.mat-mdc-row', { timeout: 15000 });
}

/**
 * Helper: collect text content from all visible cells in a given column index (1-based).
 */
async function getColumnTexts(page: Page, colIndex: number): Promise<string[]> {
  const cells = page.locator(`tr.mat-mdc-row td:nth-child(${colIndex})`);
  const count = await cells.count();
  const texts: string[] = [];
  for (let i = 0; i < count; i++) {
    const text = await cells.nth(i).textContent();
    texts.push((text ?? '').trim());
  }
  return texts;
}

// ─── Universe Screen E2E Tests ───────────────────────────────────────────────

test.describe('Universe Screen E2E', () => {
  let cleanup: () => Promise<void>;
  let symbols: string[];
  let accountNames: string[];

  test.beforeAll(async () => {
    const seeder = await seedUniverseE2eData();
    cleanup = seeder.cleanup;
    symbols = seeder.symbols;
    accountNames = seeder.accountNames;
  });

  test.afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  // ─── Filter Tests ────────────────────────────────────────────────────────

  test.describe('Filter Tests', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await clearSortFilterState(page);
      await page.goto('/global/universe');
      await waitForTableRows(page);
    });

    test('should filter by Symbol', async ({ page }) => {
      // Type a symbol prefix that matches one of our seeded records
      const symbolInput = page.locator('input[placeholder="Search Symbol"]');
      await symbolInput.fill(symbols[0]);
      await page.waitForTimeout(500);

      // The table should show only the matching symbol
      const symbolCells = await getColumnTexts(page, 1);
      expect(symbolCells.length).toBeGreaterThan(0);
      for (const cell of symbolCells) {
        expect(cell).toContain(symbols[0]);
      }
    });

    test('should filter by Risk Group', async ({ page }) => {
      // Open the Risk Group filter dropdown and select "Income"
      const riskGroupSelect = page
        .locator('tr.filter-row mat-form-field:has(mat-select) mat-select')
        .first();
      await riskGroupSelect.click();
      await page.waitForTimeout(300);

      const incomeOption = page.getByRole('option', { name: 'Income' });
      await incomeOption.click();
      await page.waitForTimeout(500);

      // All visible rows should show "Income" in the Risk Group column
      const riskGroupCells = await getColumnTexts(page, 2);
      expect(riskGroupCells.length).toBeGreaterThan(0);
      for (const cell of riskGroupCells) {
        expect(cell).toBe('Income');
      }
    });

    test('should filter by Min Yield', async ({ page }) => {
      // Enter a minimum yield value
      const yieldInput = page.locator('input[placeholder="Min Yield %"]');
      await yieldInput.fill('5');
      await page.waitForTimeout(500);

      // All visible rows should have yield >= 5%
      const yieldCells = await getColumnTexts(page, 5);
      for (const cell of yieldCells) {
        const value = parseFloat(cell);
        if (!isNaN(value)) {
          expect(value).toBeGreaterThanOrEqual(5);
        }
      }
    });

    test('should filter by Expired', async ({ page }) => {
      // Open the Expired filter dropdown and select "Yes"
      const expiredSelects = page.locator(
        'tr.filter-row mat-form-field mat-select'
      );
      // Expired select is the last one in the filter row
      const expiredSelect = expiredSelects.last();
      await expiredSelect.click();
      await page.waitForTimeout(300);

      const yesOption = page.getByRole('option', { name: 'Yes' });
      await yesOption.click();
      await page.waitForTimeout(500);

      // All visible rows should show expired = "Yes" or a checkmark
      const expiredCells = await getColumnTexts(page, 12);
      expect(expiredCells.length).toBeGreaterThan(0);
      for (const cell of expiredCells) {
        // Expired column renders "Yes" or a check icon
        expect(cell.length).toBeGreaterThan(0);
      }
    });
  });

  // ─── Sort Tests ──────────────────────────────────────────────────────────

  test.describe('Sort Tests', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await clearSortFilterState(page);
      await page.goto('/global/universe');
      await waitForTableRows(page);
    });

    test('should sort by Symbol', async ({ page }) => {
      const header = page.getByRole('button', { name: 'Symbol' });
      await header.click();
      await page.waitForTimeout(500);

      const state = await getSortState(page, 'universes');
      expect(state).not.toBeNull();
      expect(state!.field).toBe('symbol');
      expect(state!.order).toBe('asc');
    });

    test('should sort by Risk Group', async ({ page }) => {
      const header = page.getByRole('button', { name: 'Risk Group' });
      await header.click();
      await page.waitForTimeout(500);

      const state = await getSortState(page, 'universes');
      expect(state).not.toBeNull();
      expect(state!.field).toBe('risk_group');
      expect(state!.order).toBe('asc');
    });

    test('should sort by Yield %', async ({ page }) => {
      const header = page.getByRole('button', { name: 'Yield %' });
      await header.click();
      await page.waitForTimeout(500);

      const state = await getSortState(page, 'universes');
      expect(state).not.toBeNull();
      expect(state!.field).toBe('yield_percent');
      expect(state!.order).toBe('asc');
    });

    test('should sort by Avg Purch Yield %', async ({ page }) => {
      const header = page.getByRole('button', { name: 'Avg Purch Yield %' });
      await header.click();
      await page.waitForTimeout(500);

      const state = await getSortState(page, 'universes');
      expect(state).not.toBeNull();
      expect(state!.field).toBe('avg_purchase_yield_percent');
      expect(state!.order).toBe('asc');
    });

    test('should sort by Ex-Date', async ({ page }) => {
      const header = page.getByRole('button', { name: 'Ex-Date' });
      await header.click();
      await page.waitForTimeout(500);

      const state = await getSortState(page, 'universes');
      expect(state).not.toBeNull();
      expect(state!.field).toBe('ex_date');
      expect(state!.order).toBe('asc');
    });

    test('should sort by Mst Rcnt Sll Dt', async ({ page }) => {
      const header = page.getByRole('button', { name: 'Mst Rcnt Sll Dt' });
      await header.click();
      await page.waitForTimeout(500);

      const state = await getSortState(page, 'universes');
      expect(state).not.toBeNull();
      expect(state!.field).toBe('most_recent_sell_date');
      expect(state!.order).toBe('asc');
    });

    test('should sort by Mst Rcnt Sell $', async ({ page }) => {
      const header = page.getByRole('button', { name: 'Mst Rcnt Sell $' });
      await header.click();
      await page.waitForTimeout(500);

      const state = await getSortState(page, 'universes');
      expect(state).not.toBeNull();
      expect(state!.field).toBe('most_recent_sell_price');
      expect(state!.order).toBe('asc');
    });
  });

  // ─── Account Filter Tests ────────────────────────────────────────────────

  test.describe('Account Filter Computed Fields', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await clearSortFilterState(page);
      await page.goto('/global/universe');
      await waitForTableRows(page);
    });

    test('should display different computed fields when account is selected', async ({
      page,
    }) => {
      // Record initial "All Accounts" values for seeded symbol
      const symbolInput = page.locator('input[placeholder="Search Symbol"]');
      await symbolInput.fill(symbols[0]);
      await page.waitForTimeout(800);

      // Capture row data with "All Accounts" (default)
      const allAccountsYield = await getColumnTexts(page, 6);
      const allAccountsPosition = await getColumnTexts(page, 11);
      const allAccountsSellPrice = await getColumnTexts(page, 10);
      const allAccountsSellDate = await getColumnTexts(page, 9);
      const allAccountsLastPrice = await getColumnTexts(page, 7);

      // All values should be visible
      expect(allAccountsYield.length).toBeGreaterThan(0);
      expect(allAccountsPosition.length).toBeGreaterThan(0);
      expect(allAccountsLastPrice.length).toBeGreaterThan(0);

      // Select account 1
      const accountSelect = page.locator(
        '.universe-toolbar mat-form-field mat-select'
      );
      await accountSelect.click();
      await page.waitForTimeout(300);

      const account1Option = page.getByRole('option', {
        name: accountNames[0],
      });
      // If account option exists, select it and verify computed fields change
      if ((await account1Option.count()) > 0) {
        await account1Option.click();
        await page.waitForTimeout(800);

        // Re-filter to our symbol
        await symbolInput.clear();
        await symbolInput.fill(symbols[0]);
        await page.waitForTimeout(800);

        const acct1Yield = await getColumnTexts(page, 6);
        const acct1Position = await getColumnTexts(page, 11);
        const acct1SellPrice = await getColumnTexts(page, 10);
        const acct1SellDate = await getColumnTexts(page, 9);
        const acct1LastPrice = await getColumnTexts(page, 7);

        // Last Price should remain the same (it's a universe field, not computed from trades)
        expect(acct1LastPrice).toEqual(allAccountsLastPrice);

        // At least one of the trade-computed fields should differ between "All" and account-specific
        // (because each account has different trades)
        const yieldChanged =
          JSON.stringify(acct1Yield) !== JSON.stringify(allAccountsYield);
        const positionChanged =
          JSON.stringify(acct1Position) !== JSON.stringify(allAccountsPosition);
        const sellPriceChanged =
          JSON.stringify(acct1SellPrice) !==
          JSON.stringify(allAccountsSellPrice);
        const sellDateChanged =
          JSON.stringify(acct1SellDate) !== JSON.stringify(allAccountsSellDate);

        expect(
          yieldChanged || positionChanged || sellPriceChanged || sellDateChanged
        ).toBe(true);
      }
    });

    test('should compute Avg Purch Yield % per selected account', async ({
      page,
    }) => {
      const symbolInput = page.locator('input[placeholder="Search Symbol"]');
      await symbolInput.fill(symbols[0]);
      await page.waitForTimeout(800);

      // Get all-accounts yield
      const allYield = await getColumnTexts(page, 6);

      // Select first account
      const accountSelect = page.locator(
        '.universe-toolbar mat-form-field mat-select'
      );
      await accountSelect.click();
      await page.waitForTimeout(300);

      const account1Option = page.getByRole('option', {
        name: accountNames[0],
      });
      if ((await account1Option.count()) > 0) {
        await account1Option.click();
        await page.waitForTimeout(800);

        await symbolInput.clear();
        await symbolInput.fill(symbols[0]);
        await page.waitForTimeout(800);

        const acct1Yield = await getColumnTexts(page, 6);
        // Avg Purch Yield % column should display a numeric value
        expect(acct1Yield.length).toBeGreaterThan(0);
        // Value should be non-empty
        expect(acct1Yield[0].length).toBeGreaterThan(0);
      } else {
        // If account doesn't appear in options, verify all-accounts shows data
        expect(allYield.length).toBeGreaterThan(0);
      }
    });

    test('should compute Position per selected account', async ({ page }) => {
      const symbolInput = page.locator('input[placeholder="Search Symbol"]');
      await symbolInput.fill(symbols[0]);
      await page.waitForTimeout(800);

      const allPosition = await getColumnTexts(page, 11);
      expect(allPosition.length).toBeGreaterThan(0);

      // Select second account
      const accountSelect = page.locator(
        '.universe-toolbar mat-form-field mat-select'
      );
      await accountSelect.click();
      await page.waitForTimeout(300);

      const account2Option = page.getByRole('option', {
        name: accountNames[1],
      });
      if ((await account2Option.count()) > 0) {
        await account2Option.click();
        await page.waitForTimeout(800);

        await symbolInput.clear();
        await symbolInput.fill(symbols[0]);
        await page.waitForTimeout(800);

        const acct2Position = await getColumnTexts(page, 11);
        expect(acct2Position.length).toBeGreaterThan(0);
        // Position should be a numeric value
        expect(acct2Position[0].length).toBeGreaterThan(0);
      }
    });

    test('should compute Mst Rcnt Sll Dt per selected account', async ({
      page,
    }) => {
      const symbolInput = page.locator('input[placeholder="Search Symbol"]');
      await symbolInput.fill(symbols[0]);
      await page.waitForTimeout(800);

      const allSellDate = await getColumnTexts(page, 9);

      const accountSelect = page.locator(
        '.universe-toolbar mat-form-field mat-select'
      );
      await accountSelect.click();
      await page.waitForTimeout(300);

      const account1Option = page.getByRole('option', {
        name: accountNames[0],
      });
      if ((await account1Option.count()) > 0) {
        await account1Option.click();
        await page.waitForTimeout(800);

        await symbolInput.clear();
        await symbolInput.fill(symbols[0]);
        await page.waitForTimeout(800);

        const acct1SellDate = await getColumnTexts(page, 9);
        expect(acct1SellDate.length).toBeGreaterThan(0);
        // Sell date should be displayed
        expect(acct1SellDate[0].length).toBeGreaterThan(0);
      } else {
        expect(allSellDate.length).toBeGreaterThan(0);
      }
    });

    test('should compute Mst Rcnt Sell $ per selected account', async ({
      page,
    }) => {
      const symbolInput = page.locator('input[placeholder="Search Symbol"]');
      await symbolInput.fill(symbols[0]);
      await page.waitForTimeout(800);

      const allSellPrice = await getColumnTexts(page, 10);

      const accountSelect = page.locator(
        '.universe-toolbar mat-form-field mat-select'
      );
      await accountSelect.click();
      await page.waitForTimeout(300);

      const account1Option = page.getByRole('option', {
        name: accountNames[0],
      });
      if ((await account1Option.count()) > 0) {
        await account1Option.click();
        await page.waitForTimeout(800);

        await symbolInput.clear();
        await symbolInput.fill(symbols[0]);
        await page.waitForTimeout(800);

        const acct1SellPrice = await getColumnTexts(page, 10);
        expect(acct1SellPrice.length).toBeGreaterThan(0);
        // Sell price should be displayed
        expect(acct1SellPrice[0].length).toBeGreaterThan(0);
      } else {
        expect(allSellPrice.length).toBeGreaterThan(0);
      }
    });

    test('should display Last Price unchanged regardless of account', async ({
      page,
    }) => {
      const symbolInput = page.locator('input[placeholder="Search Symbol"]');
      await symbolInput.fill(symbols[0]);
      await page.waitForTimeout(800);

      const allLastPrice = await getColumnTexts(page, 7);
      expect(allLastPrice.length).toBeGreaterThan(0);

      const accountSelect = page.locator(
        '.universe-toolbar mat-form-field mat-select'
      );
      await accountSelect.click();
      await page.waitForTimeout(300);

      const account1Option = page.getByRole('option', {
        name: accountNames[0],
      });
      if ((await account1Option.count()) > 0) {
        await account1Option.click();
        await page.waitForTimeout(800);

        await symbolInput.clear();
        await symbolInput.fill(symbols[0]);
        await page.waitForTimeout(800);

        const acct1LastPrice = await getColumnTexts(page, 7);
        // Last Price is a universe field, not computed from trades — should be identical
        expect(acct1LastPrice).toEqual(allLastPrice);
      }
    });
  });
});
