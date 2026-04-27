/**
 * Story 86.3: E2E Tests — SVol Column on Universe Screen
 *
 * Verifies:
 * 1. "Vol" is the 1st column header and "SVol" is the 2nd column header.
 * 2. Hovering over the "SVol" column header shows a tooltip containing
 *    "Short-Term Volatility".
 * 3. At least one row in the "SVol" column displays a mat-icon whose
 *    aria-label starts with "Short-Term Volatility:".
 */

import { expect, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedSvolColumnE2eData } from './helpers/seed-svol-column-e2e-data.helper';

const HEADER_ROW = 'tr.mat-mdc-header-row:not(.filter-row)';
const COLUMN_HEADER = '[role="columnheader"]';

test.describe('SVol Column', function describeSvolColumn() {
  let cleanup: (() => Promise<void>) | undefined;
  let symbol: string;

  test.beforeAll(async function seedData() {
    const result = await seedSvolColumnE2eData();
    cleanup = result.cleanup;
    symbol = result.symbol;
  });

  test.afterAll(async function teardown() {
    if (cleanup !== undefined) {
      await cleanup();
    }
  });

  test.beforeEach(async function navigateToUniverse({ page }) {
    await login(page);
    await page.goto('/global/universe');
    // Wait for the header row to be visible instead of networkidle
    await expect(
      page.locator(HEADER_ROW).locator(COLUMN_HEADER).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('first column header has text Vol and second column header has text SVol', async function firstTwoColumnsAreVolAndSvol({
    page,
  }) {
    const headers = page.locator(HEADER_ROW).locator(COLUMN_HEADER);
    await expect(headers.nth(0)).toContainText('Vol');
    await expect(headers.nth(1)).toContainText('SVol');
  });

  test('hovering SVol header shows tooltip Short-Term Volatility', async function svolTooltipShowsShortTermVolatility({
    page,
  }) {
    const svolHeader = page.getByRole('columnheader', { name: 'SVol' });
    await svolHeader.hover();
    await expect(page.locator('.mat-mdc-tooltip')).toContainText(
      'Short-Term Volatility'
    );
  });

  test('at least one row in SVol column shows an icon with aria-label matching Short-Term Volatility', async function svolColumnShowsIcon({
    page,
  }) {
    const searchInput = page.locator('input[placeholder="Search Symbol"]');
    await searchInput.fill(symbol);
    await expect(
      page.locator('td.mat-column-svol mat-icon').first()
    ).toBeVisible({ timeout: 10000 });
    const ariaLabel = await page
      .locator('td.mat-column-svol mat-icon')
      .first()
      .getAttribute('aria-label');
    expect(ariaLabel).toMatch(/^Short-Term Volatility:/);
  });
});
