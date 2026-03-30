import { expect, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedScrollUniverseData } from './helpers/seed-scroll-universe-data.helper';
import { verifyMonotonicScroll } from './helpers/verify-smooth-scroll';

const VIEWPORT_SELECTOR = 'cdk-virtual-scroll-viewport';

// ─── Universe Smooth Scroll Tests ────────────────────────────────────────────

test.describe('Universe Smooth Scroll', () => {
  let cleanup: () => Promise<void>;

  test.beforeAll(async () => {
    const seeder = await seedScrollUniverseData();
    cleanup = seeder.cleanup;
  });

  test.afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/universe');
    await expect(page.locator('dms-base-table')).toBeVisible({
      timeout: 15000,
    });
    await page.waitForSelector('tr.mat-mdc-row', { timeout: 15000 });
  });

  test('scrolling universe table should be monotonically non-decreasing', async ({
    page,
  }) => {
    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });

    const finalScrollTop = await verifyMonotonicScroll(page, VIEWPORT_SELECTOR);

    expect(finalScrollTop).toBeGreaterThan(0);
  });
});
