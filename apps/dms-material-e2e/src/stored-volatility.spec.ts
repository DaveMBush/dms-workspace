import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedStoredVolatilityData } from './helpers/seed-stored-volatility-e2e-data.helper';
import { seedStoredVolatilityUpdateData } from './helpers/seed-stored-volatility-update-e2e-data.helper';

async function searchForSymbol(page: Page, symbol: string) {
  const searchInput = page.locator('input[placeholder="Search Symbol"]');
  const row = page.locator('.dms-body-row[role="row"]').filter({
    has: page.locator('.dms-body-cell[data-column="symbol"]', {
      hasText: symbol,
    }),
  });

  await searchInput.fill(symbol);
  await expect(row).toHaveCount(1, { timeout: 15_000 });
  await expect(
    row.locator('.dms-body-cell[data-column="symbol"]')
  ).toContainText(symbol);

  return row.first();
}

async function expectVolIconForSymbol(
  page: Page,
  symbol: string,
  expectedCategory: string
): Promise<void> {
  const row = await searchForSymbol(page, symbol);
  const ariaLabel = `Volatility: ${expectedCategory}`;
  await expect(
    row.locator(`.dms-body-cell[data-column="vol"] [aria-label="${ariaLabel}"]`)
  ).toBeVisible({ timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// AC#1 – Stored volatility icons are correct for known symbols
// ---------------------------------------------------------------------------

test.describe('Stored Volatility - correct icons for known symbols', function describeStoredVolatilityIcons() {
  let cleanup: (() => Promise<void>) | undefined;
  let steadySymbol: string;
  let increasingSymbol: string;
  let volatileSymbol: string;

  test.beforeAll(async function seedData() {
    const result = await seedStoredVolatilityData();
    cleanup = result.cleanup;
    steadySymbol = result.steadySymbol;
    increasingSymbol = result.increasingSymbol;
    volatileSymbol = result.volatileSymbol;
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

  test('steady symbol shows steady volatility icon', async function steadySymbolShowsSteadyIcon({
    page,
  }) {
    await expectVolIconForSymbol(page, steadySymbol, 'steady');
  });

  test('increasing symbol shows increasing volatility icon', async function increasingSymbolShowsIncreasingIcon({
    page,
  }) {
    await expectVolIconForSymbol(page, increasingSymbol, 'increasing');
  });

  test('volatile symbol shows volatile volatility icon', async function volatileSymbolShowsVolatileIcon({
    page,
  }) {
    await expectVolIconForSymbol(page, volatileSymbol, 'volatile');
  });
});

// ---------------------------------------------------------------------------
// AC#2 – Vol icon updates after a data-change trigger
// ---------------------------------------------------------------------------

test.describe('Stored Volatility - icon updates after data-change trigger', function describeStoredVolatilityUpdate() {
  let cleanup: (() => Promise<void>) | undefined;
  let symbol: string;
  let initialCategory: string;
  let universeRecord: Record<string, unknown>;
  let updateToVolatile: () => Promise<void>;

  test.beforeAll(async function seedUpdateData() {
    const result = await seedStoredVolatilityUpdateData();
    cleanup = result.cleanup;
    symbol = result.symbol;
    initialCategory = result.initialCategory;
    universeRecord = result.universeRecord;
    updateToVolatile = result.updateToVolatile;
  });

  test.afterAll(async function teardown() {
    if (cleanup !== undefined) {
      await cleanup();
    }
  });

  test('icon changes to volatile after divDeposits update triggers recalculation', async function iconUpdatesAfterTrigger({
    page,
    request,
  }) {
    // Verify initial icon reflects the pre-stored value
    await login(page);
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');
    await expectVolIconForSymbol(page, symbol, initialCategory);

    // Replace flat deposits with high-variance deposits
    await updateToVolatile();

    // Trigger server-side volatility recalculation via PUT /api/universe
    const response = await request.put('/api/universe', {
      data: universeRecord,
    });
    expect(response.ok()).toBeTruthy();

    // Navigate to the Universe screen so fresh data is fetched
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');

    // Poll until the icon reflects the newly recalculated 'volatile' category
    await expect
      .poll(
        async function pollForUpdatedIcon() {
          const row = await searchForSymbol(page, symbol);
          return row
            .locator('.dms-body-cell[data-column="vol"] mat-icon')
            .getAttribute('aria-label');
        },
        { timeout: 15_000, intervals: [500, 1000, 2000] }
      )
      .toBe('Volatility: volatile');
  });
});
