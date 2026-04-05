import path from 'path';
import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedSplitImportE2eData } from './helpers/seed-split-import-e2e-data.helper';
import { initializePrismaClient } from './helpers/shared-prisma-client.helper';

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

// Serial mode is required because Test 2 verifies UI state produced by Test 1.
test.describe.configure({ mode: 'serial' });

test.describe('OXLC Split Import E2E', () => {
  let accountId = '';
  let universeId = '';
  let cleanup: (() => Promise<void>) | null = null;

  test.beforeAll(async () => {
    const seedResult = await seedSplitImportE2eData();
    accountId = seedResult.accountId;
    universeId = seedResult.universeId;
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
   * AC1 + AC2: Import OXLC 1-for-5 reverse split CSV via the UI import dialog.
   * Verifies:
   *  - API response indicates success with no errors
   *  - Post-split open lots total exactly 306 shares (1530 / 5)
   *  - No fractional sale records created (1530 is exactly divisible by 5)
   *  - "IN LIEU OF FRX SHARE" row did not produce a duplicate sale
   */
  test('should import OXLC reverse split CSV and adjust open lots', async ({
    page,
  }) => {
    await navigateToUniverse(page);

    const responsePromise = page.waitForResponse(function matchImportApi(
      response
    ) {
      return response.url().includes('/api/import/fidelity');
    });

    await openImportDialog(page);
    await uploadFile(page, 'fidelity-split-oxlc.csv');
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

    // Dialog closes automatically on success
    await expect(
      page.getByRole('heading', { name: 'Import Fidelity Transactions' })
    ).not.toBeVisible({ timeout: 10000 });

    // Verify open lots via direct DB query (AC1: 1530 / 5 = 306)
    const prisma = await initializePrismaClient();
    try {
      const openLots = await prisma.trades.findMany({
        where: { universeId, sell_date: null },
        orderBy: { buy_date: 'asc' },
        select: { quantity: true, buy: true },
      });
      const totalQty = openLots.reduce(function sumQuantities(
        sum: number,
        trade: { quantity: number; buy: number }
      ) {
        return sum + trade.quantity;
      },
      0);
      expect(totalQty).toBe(306);
      // Per-lot split assertions: 500→100@$20, 500→100@$19, 530→106@$18
      expect(openLots.map((lot) => lot.quantity)).toEqual([100, 100, 106]);
      expect(openLots.map((lot) => lot.buy)).toEqual([20, 19, 18]);

      // AC2: 1530 / 5 = 306 exactly — no fractional remainder, so no fractional sale
      const closedTradeCount = await prisma.trades.count({
        where: { universeId, sell_date: { not: null } },
      });
      expect(closedTradeCount).toBe(0);
    } finally {
      await prisma.$disconnect();
    }
  });

  /**
   * AC3: After split import, the Account > Open Positions screen shows
   * exactly 3 OXLC rows totalling 306 shares (100 + 100 + 106).
   */
  test('should display adjusted OXLC quantities in open positions after split', async ({
    page,
  }) => {
    await page.goto(`/account/${accountId}/open`);
    await expect(
      page.locator('[data-testid="open-positions-table"]')
    ).toBeVisible({ timeout: 15000 });
    await page.waitForSelector('tr.mat-mdc-row', { timeout: 15000 });

    const oxlcRows = page.locator('tr.mat-mdc-row').filter({ hasText: 'OXLC' });
    await expect(oxlcRows).toHaveCount(3, { timeout: 10000 });

    let totalQty = 0;
    const buyPrices: number[] = [];
    for (let i = 0; i < 3; i++) {
      const qtyText = await oxlcRows
        .nth(i)
        .locator('[data-testid="editable-quantity"]')
        .textContent();
      totalQty += parseInt(qtyText?.trim() ?? '0', 10);

      // AC3: adjusted cost basis — read per-share buy price from UI
      const buyText = await oxlcRows
        .nth(i)
        .locator('[data-testid="editable-buy-price"]')
        .textContent();
      buyPrices.push(parseFloat((buyText?.trim() ?? '0').replace(/[$,]/g, '')));
    }
    expect(totalQty).toBe(306);
    // Post-split buy prices: $20, $19, $18 (sorted for row-order independence)
    buyPrices.sort(function byAscending(a, b) {
      return a - b;
    });
    expect(buyPrices).toEqual([18, 19, 20]);
  });
});
