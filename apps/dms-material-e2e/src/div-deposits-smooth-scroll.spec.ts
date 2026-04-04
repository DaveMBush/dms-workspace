import { expect, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedScrollDivDepositsData } from './helpers/seed-scroll-div-deposits-data.helper';
import { verifyMonotonicScroll } from './helpers/verify-smooth-scroll';

const VIEWPORT_SELECTOR = 'cdk-virtual-scroll-viewport';

// ─── Dividend Deposits Smooth Scroll Tests ────────────────────────────────────

test.describe('Dividend Deposits Smooth Scroll', () => {
  let cleanup: () => Promise<void>;
  let accountId: string;

  test.beforeAll(async () => {
    const seeder = await seedScrollDivDepositsData();
    cleanup = seeder.cleanup;
    accountId = seeder.accountId;
  });

  test.afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`/account/${accountId}/div-dep`);
    await expect(page.locator('dms-base-table')).toBeVisible({
      timeout: 15000,
    });
    await page.waitForSelector('tr.mat-mdc-row', { timeout: 15000 });
  });

  test('scrolling dividend deposits table should be monotonically non-decreasing', async ({
    page,
  }) => {
    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });

    const finalScrollTop = await verifyMonotonicScroll(page, VIEWPORT_SELECTOR);

    expect(finalScrollTop).toBeGreaterThan(0);
  });
});
