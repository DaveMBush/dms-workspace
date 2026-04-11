import path from 'path';
import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedMultiSymbolE2eData } from './helpers/seed-multi-symbol-e2e-data.helper';
import { initializePrismaClient } from './helpers/shared-prisma-client.helper';

// ─── Story 63.3: Multi-symbol CSV — only split symbol is adjusted ─────────────
//
// Verifies that when a CSV contains rows for multiple symbols — some with
// splits and some without — only the symbol with a split row has its lots
// adjusted.  The non-split symbol's lots must remain untouched.
//
// Fixture: fidelity-split-multi-symbol.csv
//   Line 2: 09/20/2025 TSTX split FROM (post-split qty = 100, i.e. 1-for-5)
//   Line 3: 07/15/2025 TSTX BUY 500 @ $4.00
//   Line 4: 06/01/2025 ABCD BUY 100 @ $10.00  (no split for ABCD)
//
// After import:
//   TSTX: 1 open lot of 100 shares (500 / 5), buy price = $20 (4.00 × 5)
//   ABCD: 1 open lot of 100 shares, buy price = $10.00 (unchanged)

const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');
const TSTX_SYMBOL = 'TSTX';
const ABCD_SYMBOL = 'ABCD';

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

// Serial mode: test 1 imports the CSV, test 2 verifies DB state, test 3 checks UI.
test.describe.configure({ mode: 'serial' });

test.describe('Multi-Symbol Split Import (Story 63.3)', () => {
  let tstxUniverseId = '';
  let abcdUniverseId = '';
  let cleanup: (() => Promise<void>) | null = null;

  test.beforeAll(async () => {
    const seedResult = await seedMultiSymbolE2eData();
    tstxUniverseId = seedResult.tstxUniverseId;
    abcdUniverseId = seedResult.abcdUniverseId;
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
   * Imports a CSV containing TSTX (has a split) and ABCD (no split).
   *
   * After import:
   *   - TSTX: 1 open lot of 100 shares (500 ÷ 5 reverse split)
   *   - ABCD: 1 open lot of 100 shares (unchanged — no split applied)
   */
  test('should only adjust lots for the symbol with a split row', async ({
    page,
  }) => {
    await navigateToUniverse(page);

    const responsePromise = page.waitForResponse(function isImportResponse(
      response
    ) {
      return (
        response.url().includes('/api/import/fidelity') &&
        response.request().method() === 'POST' &&
        response.status() === 200
      );
    });

    await openImportDialog(page);
    await uploadFile(page, 'fidelity-split-multi-symbol.csv');
    await clickUpload(page);

    const response = await responsePromise;
    const body = (await response.json()) as {
      success: boolean;
      imported: number;
      errors: string[];
      warnings: string[];
    };

    expect(body.success).toBe(true);
    expect(body.errors).toHaveLength(0);

    await expect(
      page.getByRole('heading', { name: 'Import Fidelity Transactions' })
    ).not.toBeVisible({ timeout: 10000 });

    const prisma = await initializePrismaClient();
    try {
      // TSTX: 500 pre-split shares ÷ 5 = 100 post-split shares
      const tstxLots = await prisma.trades.findMany({
        where: { universeId: tstxUniverseId, sell_date: null },
        select: { quantity: true, buy: true },
      });

      expect(tstxLots).toHaveLength(1);
      expect(tstxLots[0].quantity).toBe(100);
      expect(tstxLots[0].buy).toBe(20); // $4.00 × 5

      // ABCD: 100 shares at $10.00 — split must NOT have been applied
      const abcdLots = await prisma.trades.findMany({
        where: { universeId: abcdUniverseId, sell_date: null },
        select: { quantity: true, buy: true },
      });

      expect(abcdLots).toHaveLength(1);
      expect(abcdLots[0].quantity).toBe(100);
      expect(abcdLots[0].buy).toBe(10);
    } finally {
      await prisma.$disconnect();
    }
  });

  test('should display both TSTX and ABCD in universe table after import', async ({
    page,
  }) => {
    await navigateToUniverse(page);
    await page.waitForSelector('tr.mat-mdc-row', { timeout: 15000 });

    const tstxRow = page
      .locator('tr.mat-mdc-row')
      .filter({ hasText: TSTX_SYMBOL });
    await expect(tstxRow).toHaveCount(1, { timeout: 10000 });

    const abcdRow = page
      .locator('tr.mat-mdc-row')
      .filter({ hasText: ABCD_SYMBOL });
    await expect(abcdRow).toHaveCount(1, { timeout: 10000 });
  });
});
