import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';

const LIVE_BASE_URL =
  process.env['VOLATILITY_VISIBILITY_BASE_URL'] ?? 'http://localhost:4201';
const CONTROL_SYMBOL_WITHOUT_POSITION = 'SPAXX';
const SYMBOL_WITHOUT_POSITION_AND_EMPTY_VOL = 'GCV';

async function searchForSymbol(page: Page, symbol: string) {
  const searchInput = page.locator('input[placeholder="Search Symbol"]');
  const row = page.locator('tbody tr').filter({
    has: page.locator('.dms-body-cell[data-column="symbol"]', { hasText: symbol }),
  });

  await searchInput.fill(symbol);

  await expect(row).toHaveCount(1, { timeout: 10_000 });
  await expect(row.locator('.dms-body-cell[data-column="symbol"]')).toContainText(symbol);

  return row.first();
}

test.use({ baseURL: LIVE_BASE_URL });

test.describe('Volatility visibility - symbols without positions', function describeVisibility() {
  test.beforeEach(async function navigateToUniverse({ page }) {
    test.skip(
      test.info().project.name !== 'integration',
      'This live-symbol investigation runs only against the integration project on :4201.'
    );

    await login(page);
    await page.goto('/global/universe');
    await expect(page.locator('dms-base-table')).toBeVisible({
      timeout: 15_000,
    });
    await page.waitForSelector('.dms-body-row[role="row"]', { timeout: 15_000 });
  });

  test('control: SPAXX has zero position and still shows a volatility icon', async function controlSymbolShowsIcon({
    page,
  }) {
    const row = await searchForSymbol(page, CONTROL_SYMBOL_WITHOUT_POSITION);

    await expect(row.locator('.dms-body-cell[data-column="symbol"]')).toContainText(
      CONTROL_SYMBOL_WITHOUT_POSITION
    );
    await expect(row.locator('.dms-body-cell[data-column="position"]')).toContainText('0.00');
    await expect(row.locator('.dms-body-cell[data-column="vol"] mat-icon')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('symbol with no positions still shows a volatility icon in the live Universe list', async function symbolWithNoPositionShowsVolIcon({
    page,
  }) {
    const row = await searchForSymbol(
      page,
      SYMBOL_WITHOUT_POSITION_AND_EMPTY_VOL
    );

    await expect(row.locator('.dms-body-cell[data-column="symbol"]')).toContainText(
      SYMBOL_WITHOUT_POSITION_AND_EMPTY_VOL
    );
    await expect(row.locator('.dms-body-cell[data-column="position"]')).toContainText('0.00');
    await expect(row.locator('.dms-body-cell[data-column="vol"] mat-icon')).toBeVisible({
      timeout: 10_000,
    });
  });
});
