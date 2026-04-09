import path from 'path';
import { expect, Page, test } from 'playwright/test';

import { seedOxlcCusipReverseSplitData } from './helpers/seed-oxlc-cusip-reverse-split.helper';
import { initializePrismaClient } from './helpers/shared-prisma-client.helper';
import { login } from './helpers/login.helper';

const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');

async function navigateToUniverse(page: Page): Promise<void> {
  await page.goto('/global/universe');
  await page.waitForLoadState('networkidle');
}

async function openImportDialog(page: Page): Promise<void> {
  const importButton = page.locator(
    '[data-testid="import-transactions-button"]'
  );
  await expect(importButton).toBeVisible({ timeout: 10000 });
  await importButton.click();
  await expect(
    page.getByRole('heading', { name: 'Import Fidelity Transactions' })
  ).toBeVisible({ timeout: 5000 });
}

async function uploadFile(page: Page, filename: string): Promise<void> {
  const filePath = path.join(FIXTURES_DIR, filename);
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(filePath);
}

async function clickUpload(page: Page): Promise<void> {
  const uploadButton = page.locator('[data-testid="upload-button"]');
  await expect(uploadButton).toBeEnabled({ timeout: 5000 });
  await uploadButton.click();
}

// Serial mode is required because the import modifies shared DB state.
test.describe.configure({ mode: 'serial' });

test.describe('OXLC CUSIP-Stored Lots Reverse Split E2E', () => {
  let cusipUniverseId = '';
  let cleanup: (() => Promise<void>) | null = null;

  test.beforeAll(async () => {
    const seedResult = await seedOxlcCusipReverseSplitData();
    cusipUniverseId = seedResult.cusipUniverseId;
    cleanup = seedResult.cleanup;
  });

  test.afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  /**
   * Story 61.1: Failing E2E test for CUSIP-stored lots reverse-split import.
   *
   * Pre-split lots were imported under the raw CUSIP symbol `691543102` rather
   * than the ticker `OXLC`. When the 1-for-5 reverse split CSV is imported
   * (which uses `OXLC` as the split symbol), the current implementation cannot
   * find the CUSIP-stored lots and therefore does not adjust them.
   *
   * This test is marked `test.fail()` to document the known bug. It will be
   * converted to a passing test once Story 61.2 fixes the root cause.
   *
   * Expected post-split quantities (1-for-5):
   *   300 shares @ $4.50 → 60 shares @ $22.50
   *   150 shares @ $4.49 → 30 shares @ $22.45
   *   500 shares @ $4.06 → 100 shares @ $20.30
   *   580 shares @ $3.44 → 116 shares @ $17.20
   */
  test.fail(
    'should adjust CUSIP-stored lots for a 1-for-5 OXLC reverse split',
    async ({ page }) => {
      await navigateToUniverse(page);

      const responsePromise = page.waitForResponse((response) => {
        return (
          response.url().includes('/api/import/fidelity') &&
          response.request().method() === 'POST' &&
          response.status() === 200
        );
      });

      await openImportDialog(page);
      await uploadFile(page, 'fidelity-oxlc-cusip-reverse-split.csv');
      await clickUpload(page);

      await responsePromise;

      // Dialog closes automatically on success
      await expect(
        page.getByRole('heading', { name: 'Import Fidelity Transactions' })
      ).not.toBeVisible({ timeout: 10000 });

      // Query open lots under the CUSIP universe (where the pre-split lots live).
      // After a correct 1-for-5 reverse split adjustment, quantities should be
      // 60, 30, 100, 116 (ordered by buy_date ascending).
      const prisma = await initializePrismaClient();
      try {
        const openLots = await prisma.trades.findMany({
          where: { universeId: cusipUniverseId, sell_date: null },
          orderBy: { buy_date: 'asc' },
          select: { quantity: true, buy: true },
        });

        // Currently FAILS: the split adjustment does not find CUSIP-stored lots.
        // After Story 61.2 fix: adjustLotsForSplit will also look up CUSIP-mapped lots.
        expect(openLots.map((lot) => lot.quantity)).toEqual([60, 30, 100, 116]);
        expect(openLots.map((lot) => lot.buy)).toEqual([
          22.5, 22.45, 20.3, 17.2,
        ]);
      } finally {
        await prisma.$disconnect();
      }
    }
  );
});
