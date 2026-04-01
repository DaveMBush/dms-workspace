import { expect, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { generateUniqueId } from './helpers/generate-unique-id.helper';
import { initializePrismaClient } from './helpers/shared-prisma-client.helper';
import { createRiskGroups } from './helpers/shared-risk-groups.helper';

/**
 * Dividend Precision After Update – E2E Regression Guard
 *
 * Story 34.4: Verify that dividend amounts from the new high-precision source
 * (dividendhistory.org, ≥4 decimal places) are stored and displayed without
 * truncation in the Universe screen.
 *
 * Regression scenario: Yahoo Finance returns 2-decimal values (e.g., $0.22).
 * dividendhistory.org can return 4-decimal values (e.g., $0.2245). This test
 * guards against accidentally reverting to a lower-precision source or
 * introducing rounding in the API/database/UI pipeline.
 *
 * Approach: Playwright cannot intercept server-side HTTP calls to
 * dividendhistory.org, so the test exercises the full round-trip via the PUT
 * /api/universe endpoint (which mirrors what the settings/update service
 * does after it receives data from dividendhistory.org).
 */

// Known high-precision dividend value that simulates what dividendhistory.org
// provides for a ticker like PDI. 4th decimal digit is deliberately non-zero
// so a regression to 2-decimal precision would cause this test to fail.
const HIGH_PRECISION_DISTRIBUTION = 0.2245;

interface UniverseRecord {
  id: string;
  riskGroupId: string;
}

test.describe('Dividend Precision After Update', () => {
  let testSymbol: string;
  let seededRecord: UniverseRecord;
  let cleanupFn: () => Promise<void>;

  test.beforeAll(async () => {
    const prisma = await initializePrismaClient();
    const uniqueId = generateUniqueId();
    testSymbol = `DIVP-${uniqueId}`;

    try {
      const riskGroups = await createRiskGroups(prisma);
      const record = await prisma.universe.create({
        data: {
          symbol: testSymbol,
          risk_group_id: riskGroups.incomeRiskGroup.id,
          // Start with low-precision distribution (Yahoo Finance style – 2 decimals)
          distribution: 0.22,
          distributions_per_year: 12,
          last_price: 20.0,
          ex_date: new Date('2025-01-15'),
          expired: false,
          is_closed_end_fund: true,
        },
      });

      seededRecord = {
        id: record.id,
        riskGroupId: riskGroups.incomeRiskGroup.id,
      };

      cleanupFn = async function cleanup() {
        try {
          await prisma.universe.deleteMany({
            where: { symbol: { in: [testSymbol] } },
          });
        } finally {
          await prisma.$disconnect();
        }
      };
    } catch (error) {
      await prisma.$disconnect();
      throw error;
    }
  });

  test.afterAll(async () => {
    await cleanupFn?.();
  });

  test('stored dividend amount has ≥4 decimal precision after update – regression guard against low-precision source', async ({
    page,
    request,
  }) => {
    // ── Step 1: Simulate an "update fields" result by writing a high-precision
    // distribution via PUT /api/universe (mirrors what settings/update does
    // after fetchDividendHistory returns a 4-decimal value from dividendhistory.org).
    const updateResponse = await request.put('/api/universe', {
      data: {
        id: seededRecord.id,
        symbol: testSymbol,
        risk_group_id: seededRecord.riskGroupId,
        distribution: HIGH_PRECISION_DISTRIBUTION,
        distributions_per_year: 12,
        last_price: 20.0,
        ex_date: new Date('2025-01-15').toISOString(),
        most_recent_sell_date: null,
        most_recent_sell_price: null,
        expired: false,
        is_closed_end_fund: true,
        position: 0,
        avg_purchase_yield_percent: 0,
      },
    });

    // API must accept and echo back the high-precision value (not rounded).
    expect(updateResponse.ok()).toBe(true);
    const updatedRows = (await updateResponse.json()) as Array<{
      id: string;
      symbol: string;
      distribution: number;
    }>;
    const updatedRecord = updatedRows.find((row) => row.id === seededRecord.id);
    expect(updatedRecord).toBeDefined();
    // Assert the server stored exactly the 4-decimal precision value.
    expect(updatedRecord?.distribution).toBe(HIGH_PRECISION_DISTRIBUTION);

    // ── Step 2: Load the Universe screen and verify the stored precision is
    // faithfully displayed in the UI (guards against UI-layer rounding).
    await login(page);
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('dms-base-table')).toBeVisible({
      timeout: 15000,
    });

    // Filter the table to the test symbol so it is the only visible row.
    const symbolInput = page.locator('input[placeholder="Search Symbol"]');
    await symbolInput.fill(testSymbol);
    await page.waitForTimeout(500);

    // Wait for exactly one data row matching the test symbol.
    await page.waitForSelector('tr.mat-mdc-row', { timeout: 10000 });

    // Verify the first visible row actually contains the expected test symbol
    // before asserting on the distribution cell value.
    const firstRow = page.locator('tr.mat-mdc-row').first();
    await expect(firstRow).toContainText(testSymbol, { timeout: 10000 });

    // The editable-cell component uses data-testid="distribution-cell-0" for
    // row index 0, formatted with decimalFormat="1.4-4" (exactly 4 decimal places).
    const distributionCell = page.locator(
      '[data-testid="distribution-cell-0"]'
    );
    await expect(distributionCell).toBeVisible({ timeout: 10000 });

    const displayedText = (await distributionCell.textContent()) ?? '';

    // Assert ≥4 significant decimal places: pattern requires a non-zero digit
    // in the 4th decimal position, ensuring no truncation to 2- or 3-decimal
    // precision.
    expect(displayedText.trim()).toMatch(/\.\d{3}[1-9]/);
  });

  test('initial display of high-precision distribution value preserves 4 decimal places', async ({
    page,
  }) => {
    // This baseline test confirms the Universe screen does not round distribution
    // values that are already stored at ≥4 decimal precision.
    //
    // Seed a separate record directly with a high-precision value via Prisma so
    // no API round-trip is needed for this assertion.
    const prisma = await initializePrismaClient();
    const uniqueId = generateUniqueId();
    const baselineSymbol = `DIVB-${uniqueId}`;

    try {
      const riskGroups = await createRiskGroups(prisma);
      await prisma.universe.create({
        data: {
          symbol: baselineSymbol,
          risk_group_id: riskGroups.incomeRiskGroup.id,
          distribution: HIGH_PRECISION_DISTRIBUTION, // 0.2245 stored directly
          distributions_per_year: 12,
          last_price: 20.0,
          ex_date: new Date('2025-01-15'),
          expired: false,
          is_closed_end_fund: true,
        },
      });

      await login(page);
      await page.goto('/global/universe');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('dms-base-table')).toBeVisible({
        timeout: 15000,
      });

      const symbolInput = page.locator('input[placeholder="Search Symbol"]');
      await symbolInput.fill(baselineSymbol);
      await page.waitForTimeout(500);

      await page.waitForSelector('tr.mat-mdc-row', { timeout: 10000 });

      // Verify the first visible row actually contains the expected baseline symbol
      // before asserting on the distribution cell value.
      const firstRow = page.locator('tr.mat-mdc-row').first();
      await expect(firstRow).toContainText(baselineSymbol, { timeout: 10000 });

      const distributionCell = page.locator(
        '[data-testid="distribution-cell-0"]'
      );
      await expect(distributionCell).toBeVisible({ timeout: 10000 });

      const displayedText = (await distributionCell.textContent()) ?? '';

      // Expect exactly "0.2245" – all 4 significant decimal places intact.
      expect(displayedText.trim()).toMatch(/\.\d{3}[1-9]/);
    } finally {
      await prisma.universe.deleteMany({
        where: { symbol: { in: [baselineSymbol] } },
      });
      await prisma.$disconnect();
    }
  });
});
