import { expect, test } from 'playwright/test';

import { generateUniqueId } from './helpers/generate-unique-id.helper';
import { login } from './helpers/login.helper';
import { initializePrismaClient } from './helpers/shared-prisma-client.helper';
import { createRiskGroups } from './helpers/shared-risk-groups.helper';

/**
 * Date Editor Width Consistency Test (Story 39.1 — TDD RED phase)
 *
 * Verifies that the date editor input has the same width whether
 * it contains a date value or is empty. This test is expected to
 * FAIL against the current code because the empty date input has
 * no min-width, causing it to render narrower than a filled one.
 */

interface SeederResult {
  cleanup(): Promise<void>;
  symbolWithDate: string;
  symbolWithoutDate: string;
}

async function seedDateEditorWidthData(): Promise<SeederResult> {
  const prisma = await initializePrismaClient();
  const uniqueId = generateUniqueId();
  const symbolWithDate = `DWDA-${uniqueId}`;
  const symbolWithoutDate = `DWDB-${uniqueId}`;

  try {
    const riskGroups = await createRiskGroups(prisma);
    const eqId = riskGroups.equitiesRiskGroup.id;

    await prisma.universe.createMany({
      data: [
        {
          symbol: symbolWithDate,
          risk_group_id: eqId,
          distribution: 1.0,
          distributions_per_year: 4,
          last_price: 50.0,
          ex_date: new Date('2026-06-15'),
          most_recent_sell_date: null,
          most_recent_sell_price: null,
          expired: false,
          is_closed_end_fund: true,
        },
        {
          symbol: symbolWithoutDate,
          risk_group_id: eqId,
          distribution: 1.0,
          distributions_per_year: 4,
          last_price: 50.0,
          ex_date: null,
          most_recent_sell_date: null,
          most_recent_sell_price: null,
          expired: false,
          is_closed_end_fund: true,
        },
      ],
    });
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }

  return {
    cleanup: async function cleanupFunction(): Promise<void> {
      try {
        await prisma.universe.deleteMany({
          where: { symbol: { in: [symbolWithDate, symbolWithoutDate] } },
        });
      } finally {
        await prisma.$disconnect();
      }
    },
    symbolWithDate,
    symbolWithoutDate,
  };
}

test.describe('Date Editor Width Consistency', () => {
  let cleanup: () => Promise<void>;
  let symbolWithDate: string;
  let symbolWithoutDate: string;

  test.beforeAll(async () => {
    const seeder = await seedDateEditorWidthData();
    cleanup = seeder.cleanup;
    symbolWithDate = seeder.symbolWithDate;
    symbolWithoutDate = seeder.symbolWithoutDate;
  });

  test.afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');
    // Wait for the table to render
    await expect(page.locator('dms-base-table')).toBeVisible({
      timeout: 15000,
    });
    await page.waitForSelector('tr.mat-mdc-row', { timeout: 15000 });
  });

  test('empty date editor should have same width as filled date editor', async ({
    page,
  }) => {
    // — Step 1: Find the row with a date value and click its ex_date cell —
    const filledRow = page.locator('tr.mat-mdc-row', {
      has: page.locator(`text=${symbolWithDate}`),
    });
    await expect(filledRow).toBeVisible({ timeout: 10000 });

    // Click the ex_date cell (contains a formatted date like "06/15/2026")
    const filledDateCell = filledRow.locator('[data-testid^="ex-date-cell-"]');
    await filledDateCell.click();

    // Wait for edit mode — the date input should appear
    const filledInput = filledRow.locator('input[matinput]');
    await expect(filledInput).toBeVisible({ timeout: 5000 });

    // Measure width of the filled date input
    const filledWidth = await filledInput.evaluate(function measureWidth(
      el: HTMLInputElement
    ): number {
      return el.offsetWidth;
    });

    // Close the editor by pressing Escape
    await filledInput.press('Escape');
    await expect(filledInput).not.toBeVisible({ timeout: 5000 });

    // — Step 2: Find the row with no date and click its ex_date cell —
    const emptyRow = page.locator('tr.mat-mdc-row', {
      has: page.locator(`text=${symbolWithoutDate}`),
    });
    await expect(emptyRow).toBeVisible({ timeout: 10000 });

    // The empty date cell should show empty text; click it to enter edit mode
    const emptyDateCell = emptyRow.locator('[data-testid^="ex-date-cell-"]');
    await emptyDateCell.click();

    // Wait for edit mode
    const emptyInput = emptyRow.locator('input[matinput]');
    await expect(emptyInput).toBeVisible({ timeout: 5000 });

    // Measure width of the empty date input
    const emptyWidth = await emptyInput.evaluate(function measureWidth(
      el: HTMLInputElement
    ): number {
      return el.offsetWidth;
    });

    // — Step 3: Assert both widths are equal —
    // The empty input should be at least as wide as the filled input.
    // This test is expected to FAIL on current code (no min-width on empty date input).
    expect(emptyWidth).toBeGreaterThanOrEqual(filledWidth);
    expect(filledWidth).toBeGreaterThan(0);
  });
});
