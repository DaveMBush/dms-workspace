import { expect, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedVolColumnE2eData } from './helpers/seed-vol-column-e2e-data.helper';

test.describe('Volatility Column', function describeVolColumn() {
  let cleanup: (() => Promise<void>) | undefined;
  let symbol: string;

  test.beforeAll(async function seedData() {
    const result = await seedVolColumnE2eData();
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
    await page.waitForLoadState('networkidle');
  });

  test('first column header has text Vol', async function firstColumnIsVol({
    page,
  }) {
    await expect(page.locator('[role="columnheader"]').first()).toContainText(
      'Vol'
    );
  });

  test(
    'hovering Vol header shows tooltip Volatility',
    async function volTooltipShowsVolatility({ page }) {
      const volHeader = page.getByRole('columnheader', { name: 'Vol' });
      await volHeader.hover();
      await expect(
        page.locator('.mat-mdc-tooltip')
      ).toContainText('Volatility');
    }
  );

  test(
    'at least one row in Vol column shows an icon',
    async function volColumnShowsIcon({ page }) {
      const searchInput = page.locator('input[placeholder="Search Symbol"]');
      await searchInput.fill(symbol);
      await expect(
        page.locator('td.mat-column-vol mat-icon').first()
      ).toBeVisible({ timeout: 10000 });
    }
  );
});
