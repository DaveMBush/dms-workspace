import { expect, test } from 'playwright/test';

import { login } from './helpers/login.helper';

const TARGET_SYMBOLS = ['OXLC', 'NHS', 'DHY', 'CIK', 'DMB'];

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

  test('universe sync populates distributions_per_year for monthly payers', async ({
    page,
    request,
  }) => {
    await login(page);
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');

    const button = page.locator('[data-testid="update-universe-button"]');
    const overlay = page.locator('[data-testid="loading-overlay"]');

    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    await button.click();

    // Overlay must appear quickly after click
    await expect(overlay).toBeVisible({ timeout: 10_000 });

    // Wait for universe sync to complete — can take 60–90 s for a full universe
    await expect(overlay).toBeHidden({ timeout: 120_000 });

    // Assert at least one row is visible in the universe table
    const rows = page.locator('tr.mat-mdc-row');
    await expect(rows.first()).toBeVisible({ timeout: 5_000 });

    // Verify distributions_per_year via the API for known monthly payers
    const universeResponse = await request.get(
      'http://localhost:3000/api/universe'
    );
    expect(universeResponse.ok()).toBeTruthy();
    const universes = (await universeResponse.json()) as any[];

    const bySymbol = Object.fromEntries(universes.map((u) => [u.symbol, u]));
    for (const sym of TARGET_SYMBOLS) {
      expect(bySymbol[sym], `${sym} not found in universe`).toBeDefined();
      expect(
        bySymbol[sym].distributions_per_year,
        `${sym} distributions_per_year`
      ).toBe(12);
    }
  });
});
