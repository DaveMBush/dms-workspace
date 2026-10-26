import { expect, Page, test } from 'playwright/test';
import { login } from './helpers/login.helper';
import { seedOpenPositionsE2eData } from './helpers/seed-open-positions-e2e-data.helper';
import { seedSoldPositionsE2eData } from './helpers/seed-sold-positions-e2e-data.helper';

/**
 * Story 9.3: E2E proof that table dates render as MM/DD/YYYY (not shortDate M/d/yy).
 *
 * Screens covered:
 * - Sold Positions (uses shared defaultCell → `date: 'MM/dd/yyyy'`)
 * - Open Positions (uses custom #cellTemplate date case → `date: 'MM/dd/yyyy'`)
 */

const MM_DD_YYYY = /^\d{2}\/\d{2}\/\d{4}$/;

/**
 * Read innerText of all visible cells in a given data-column within body rows.
 * Returns trimmed text for each cell (empty string if cell has no content).
 */
async function getColumnCellTexts(
  page: Page,
  columnField: string,
): Promise<string[]> {
  const cells = page.locator(
    `.dms-body-row[role="row"] [data-column="${columnField}"]`,
  );
  const count = await cells.count();
  const texts: string[] = [];
  for (let i = 0; i < count; i++) {
    const text = await cells.nth(i).innerText();
    texts.push(text.trim());
  }
  return texts;
}

/**
 * Wait until at least one body row is rendered in the table.
 */
async function waitForBodyRows(page: Page): Promise<void> {
  await page.waitForSelector('.dms-body-row[role="row"]', { timeout: 15000 });
}

test.describe('Table Date Format MM/DD/YYYY (Story 9.3)', () => {
  // ─── Sold Positions ──────────────────────────────────────────────────────

  test.describe('Sold Positions date format', () => {
    let cleanup: () => Promise<void>;
    let accountId: string;
    let symbols: string[];

    test.beforeAll(async () => {
      const seeder = await seedSoldPositionsE2eData();
      cleanup = seeder.cleanup;
      accountId = seeder.accountId;
      symbols = seeder.symbols;
    });

    test.afterAll(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    test.beforeEach(async ({ page }) => {
      await login(page);
      await page.goto(`/account/${accountId}/sold`);
      await waitForBodyRows(page);
    });

    test('Buy Date cells render as MM/DD/YYYY', async ({ page }) => {
      // Filter to a known seeded symbol so we only read our rows.
      const searchInput = page.getByPlaceholder('Search Symbol');
      await searchInput.fill(symbols[0]);
      await expect(page.locator('.dms-body-row[role="row"]')).not.toHaveCount(0, {
        timeout: 15000,
      });

      const buyDateTexts = await getColumnCellTexts(page, 'buy_date');
      expect(buyDateTexts.length).toBeGreaterThan(0);
      for (const text of buyDateTexts) {
        expect(text).toMatch(MM_DD_YYYY);
      }
    });

    test('Sell Date cells render as MM/DD/YYYY', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search Symbol');
      await searchInput.fill(symbols[0]);
      await expect(page.locator('.dms-body-row[role="row"]')).not.toHaveCount(0, {
        timeout: 15000,
      });

      const sellDateTexts = await getColumnCellTexts(page, 'sell_date');
      expect(sellDateTexts.length).toBeGreaterThan(0);
      for (const text of sellDateTexts) {
        expect(text).toMatch(MM_DD_YYYY);
      }
    });
  });

  // ─── Open Positions ──────────────────────────────────────────────────────

  test.describe('Open Positions date format', () => {
    let cleanup: () => Promise<void>;
    let accountId: string;
    let symbols: string[];

    test.beforeAll(async () => {
      const seeder = await seedOpenPositionsE2eData();
      cleanup = seeder.cleanup;
      accountId = seeder.accountId;
      symbols = seeder.symbols;
    });

    test.afterAll(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    test.beforeEach(async ({ page }) => {
      await login(page);
      await page.goto(`/account/${accountId}/open`);
      await waitForBodyRows(page);
    });

    test('Buy Date cells render as MM/DD/YYYY', async ({ page }) => {
      const searchInput = page.locator('[data-testid="symbol-search-input"]');
      await searchInput.fill(symbols[0]);
      await expect(
        page.locator('.dms-body-row[role="row"]'),
      ).not.toHaveCount(0, { timeout: 15000 });

      const buyDateTexts = await getColumnCellTexts(page, 'buyDate');
      expect(buyDateTexts.length).toBeGreaterThan(0);
      for (const text of buyDateTexts) {
        expect(text).toMatch(MM_DD_YYYY);
      }
    });

    test('Ex-Date cells are empty or render as MM/DD/YYYY', async ({ page }) => {
      // Note: exDate is currently always null in the Trade API response
      // (Universe.ex_date not included), so cells render empty. This assertion
      // guards against a regression where a non-null value might be rendered
      // in an incorrect format. If/when exDate gets populated, it must match MM/DD/YYYY.
      const searchInput = page.locator('[data-testid="symbol-search-input"]');
      await searchInput.fill(symbols[0]);
      await expect(
        page.locator('.dms-body-row[role="row"]'),
      ).not.toHaveCount(0, { timeout: 15000 });

      const exDateTexts = await getColumnCellTexts(page, 'exDate');
      expect(exDateTexts.length).toBeGreaterThan(0);
      for (const text of exDateTexts) {
        // Empty is acceptable (null value); non-empty must be MM/DD/YYYY.
        if (text !== '') {
          expect(text).toMatch(MM_DD_YYYY);
        }
      }
    });
  });
});
