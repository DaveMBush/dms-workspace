import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedVolatilityNewCategoriesData } from './helpers/seed-volatility-new-categories.helper';

async function searchForSymbol(page: Page, symbol: string) {
  const searchInput = page.locator('input[placeholder="Search Symbol"]');
  const row = page.locator('.dms-body-row[role="row"]').filter({
    has: page.locator('.dms-body-cell[data-column="symbol"]', {
      hasText: symbol,
    }),
  });

  await searchInput.fill(symbol);
  await expect(row).toHaveCount(1, { timeout: 10_000 });
  await expect(
    row.locator('.dms-body-cell[data-column="symbol"]')
  ).toContainText(symbol);

  return row.first();
}

async function expectVolatilityIconForSymbol(
  page: Page,
  symbol: string,
  ariaLabel: string
) {
  const row = await searchForSymbol(page, symbol);

  await expect(
    row.locator('.dms-body-cell[data-column="position"]')
  ).toContainText('0.00');
  await expect(
    row.locator(`.dms-body-cell[data-column="vol"] [aria-label="${ariaLabel}"]`)
  ).toBeVisible({ timeout: 10_000 });
}

test.describe('Volatility - new icon categories', function describeNewCategories() {
  let cleanup: (() => Promise<void>) | undefined;
  let flatSymbol: string;
  let upThenDownSymbol: string;
  let downThenUpSymbol: string;

  test.beforeAll(async function seedData() {
    const result = await seedVolatilityNewCategoriesData();
    cleanup = result.cleanup;
    flatSymbol = result.flatSymbol;
    upThenDownSymbol = result.upThenDownSymbol;
    downThenUpSymbol = result.downThenUpSymbol;
  });

  test.afterAll(async function teardown() {
    if (cleanup !== undefined) {
      await cleanup();
    }
  });

  test.beforeEach(async function navigateToUniverse({ page }) {
    await login(page);
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');
  });

  test('flat symbol shows flat icon', async function flatSymbolShowsFlatIcon({
    page,
  }) {
    await expectVolatilityIconForSymbol(page, flatSymbol, 'Volatility: flat');
  });

  test('up-then-down symbol shows up-then-down icon', async function upThenDownSymbolShowsIcon({
    page,
  }) {
    await expectVolatilityIconForSymbol(
      page,
      upThenDownSymbol,
      'Volatility: up-then-down'
    );
  });

  test('down-then-up symbol shows down-then-up icon', async function downThenUpSymbolShowsIcon({
    page,
  }) {
    await expectVolatilityIconForSymbol(
      page,
      downThenUpSymbol,
      'Volatility: down-then-up'
    );
  });
});
