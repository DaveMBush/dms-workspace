import path from 'path';
import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedNoOpenLotsE2eData } from './helpers/seed-no-open-lots-e2e-data.helper';
import { initializePrismaClient } from './helpers/shared-prisma-client.helper';

// ─── Story 63.1: Failing E2E — "No Open Lots" Split Ordering Bug ─────────────
//
// Root cause hypothesis:
//   mapFidelityTransactions calls handleSplitRow → calculateSplitRatio →
//   adjustLotsForSplit (or silently skips) DURING the mapping phase, before
//   processAllTransactions / processTrades has committed any buys to the DB.
//
//   Fidelity exports CSVs in reverse-chronological order, so the split row
//   (newer date: 09/20/2025) appears at line 2, before the buy rows
//   (06/01/2025 and 07/15/2025 at lines 3–4).
//
//   After the date-based sort inside mapFidelityTransactions, the buy rows
//   iterate before the split row — but the split processor queries the DB
//   for open lots, finding none because processTrades hasn't run yet.
//   The split is silently skipped, leaving 1000 unadjusted shares instead
//   of the correct 200 post-split shares.
//
// The test below confirms this bug: it asserts that the split IS applied
// (TSTX open lots total 200 after a 1-for-5 reverse split of 1000 shares).
// This assertion currently FAILS, making the test a red TDD driver for Story 63.2.
//
// Once Story 63.2 defers split processing until after processTrades, this
// test will turn green without modification.

const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');
const TSTX_SYMBOL = 'TSTX';

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

// Serial mode required: Test 1 imports the CSV, Test 2 verifies the DB state.
test.describe.configure({ mode: 'serial' });

test.describe('No Open Lots Split Ordering Bug (Story 63.1)', () => {
  let universeId = '';
  let cleanup: (() => Promise<void>) | null = null;

  test.beforeAll(async () => {
    const seedResult = await seedNoOpenLotsE2eData();
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
   * Imports a CSV whose split row appears before its buy rows (Fidelity reverse-date order).
   *
   * Fixture layout:
   *   Line 2: 09/20/2025 split FROM row   (post-split qty = 200)
   *   Line 3: 07/15/2025 BUY 500 @ $4.00
   *   Line 4: 06/01/2025 BUY 500 @ $3.80
   *
   * Expected after a correct 1-for-5 reverse split:
   *   Total open lots = 1000 / 5 = 200 shares
   *
   * Bug: the split is skipped because the lot query runs during mapping before
   * processTrades writes the buys to the DB.  The actual total remains 1000.
   *
   * This test FAILS against the buggy implementation (total = 1000, expected 200).
   * It will turn GREEN once Story 63.2 defers split processing.
   */
  test('should apply reverse split when split row precedes buy rows in CSV (reverse-date order)', async ({
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
    await uploadFile(page, 'fidelity-split-order-bug.csv');
    await clickUpload(page);

    const response = await responsePromise;
    const body = (await response.json()) as {
      success: boolean;
      imported: number;
      errors: string[];
      warnings: string[];
    };

    // The import itself should succeed with no errors.
    expect(body.success).toBe(true);
    expect(body.errors).toHaveLength(0);

    // Dialog should close automatically on success.
    await expect(
      page.getByRole('heading', { name: 'Import Fidelity Transactions' })
    ).not.toBeVisible({ timeout: 10000 });

    // Verify via direct DB query that the reverse split was applied.
    // After a 1-for-5 split of 1000 pre-split shares: expected total = 200.
    // BUG: the split is skipped during mapping, so actual total = 1000.
    // This assertion FAILS, confirming the ordering bug described in Story 63.1.
    const prisma = await initializePrismaClient();
    try {
      const openLots = await prisma.trades.findMany({
        where: { universeId, sell_date: null },
        select: { quantity: true, buy: true },
      });

      // Expect two lots with post-split quantities (500/5=100 each)
      expect(openLots).toHaveLength(2);

      const totalQty = openLots.reduce(function sumQty(
        sum: number,
        lot: { quantity: number }
      ) {
        return sum + lot.quantity;
      },
      0);

      // 1000 pre-split shares ÷ 5 = 200 post-split shares.
      // FAILS while bug is present (actual total = 1000 because split was skipped).
      expect(totalQty).toBe(200);

      // Post-split buy prices should be multiplied by 5: $4.00→$20, $3.80→$19
      const sortedBuyPrices = openLots
        .map(function getBuyPrice(lot: { buy: number }) {
          return lot.buy;
        })
        .sort(function ascending(a: number, b: number) {
          return a - b;
        });
      expect(sortedBuyPrices).toEqual([19, 20]);
    } finally {
      await prisma.$disconnect();
    }
  });

  /**
   * Verifies the TSTX symbol appears in the Universe table after the import.
   * This secondary check runs after Test 1 has imported the CSV.
   */
  test('should display TSTX in universe table after import', async ({
    page,
  }) => {
    await navigateToUniverse(page);
    await page.waitForSelector('tr.mat-mdc-row', { timeout: 15000 });

    const tstxRow = page
      .locator('tr.mat-mdc-row')
      .filter({ hasText: TSTX_SYMBOL });
    await expect(tstxRow).toHaveCount(1, { timeout: 10000 });
  });
});
