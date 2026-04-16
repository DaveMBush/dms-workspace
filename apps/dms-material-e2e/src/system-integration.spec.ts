import { expect, test } from '@playwright/test';

import { login } from './helpers/login.helper';

test.describe('System Integration — Epic 75', () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.delete(
      'http://localhost:3000/api/test/reset'
    );
    if (!response.ok()) {
      throw new Error(
        `DB reset failed: ${response.status()} ${await response.text()}`
      );
    }
  });

  test('screener refresh populates the screener table', async ({ page }) => {
    await login(page);
    await page.goto('/global/screener');
    await page.waitForLoadState('networkidle');

    const button = page.locator('[data-testid="refresh-button"]');
    const overlay = page.locator('[data-testid="loading-overlay"]');

    await expect(button).toBeVisible();
    await button.click();

    // Overlay must appear quickly after click
    await expect(overlay).toBeVisible({ timeout: 10_000 });

    // Wait for CefConnect fetch to complete (live network — allow up to 2 min)
    await expect(overlay).toBeHidden({ timeout: 120_000 });

    // Assert at least one row is present in the screener table
    const rows = page.locator('.ag-row');
    await expect(rows.first()).toBeVisible({ timeout: 5_000 });
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });
});
