import { test, expect } from 'playwright/test';

import { login } from './helpers/login.helper';

/**
 * Universe Screen Column Filter Width E2E Tests (Story 46.2)
 *
 * Verifies that column filter inputs on the Universe screen are fully contained
 * within their column boundaries after the Story 46.1 fix (w-24 → w-full).
 *
 * Tests target the two narrowest columns that have text filter inputs:
 *   - Symbol column: 80px wide (filter: "Search Symbol")
 *   - Yield % column: 90px wide (filter: "Min Yield %")
 */

test.describe('Universe Column Filter Width', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('dms-base-table')).toBeVisible({ timeout: 15000 });
  });

  test('Symbol column filter should not overflow the column boundary', async ({
    page,
  }) => {
    // The Symbol column header cell (regular header row) gives the column boundary
    const symbolHeader = page.getByRole('columnheader', { name: 'Symbol', exact: true });
    await expect(symbolHeader).toBeVisible({ timeout: 10000 });

    // The Symbol filter form field is in the filter row
    const symbolFilterField = page
      .locator('tr.filter-row th')
      .filter({ has: page.locator('input[placeholder="Search Symbol"]') })
      .locator('mat-form-field');
    await expect(symbolFilterField).toBeVisible({ timeout: 10000 });

    // Get bounding boxes
    const colBox = await symbolHeader.boundingBox();
    const filterBox = await symbolFilterField.boundingBox();

    expect(colBox).not.toBeNull();
    expect(filterBox).not.toBeNull();

    // Filter form field left edge must be at or to the right of the column left edge
    expect(filterBox!.x).toBeGreaterThanOrEqual(colBox!.x - 1);

    // Filter form field right edge must not exceed the column right edge (no overflow)
    expect(filterBox!.x + filterBox!.width).toBeLessThanOrEqual(
      colBox!.x + colBox!.width + 1
    );
  });

  test('Yield % column filter should not overflow the column boundary', async ({
    page,
  }) => {
    // The Yield % column header cell (regular header row) gives the column boundary
    const yieldHeader = page.getByRole('columnheader', {
      name: 'Yield %',
      exact: true,
    });
    await expect(yieldHeader).toBeVisible({ timeout: 10000 });

    // The Yield % filter form field is in the filter row
    const yieldFilterField = page
      .locator('tr.filter-row th')
      .filter({ has: page.locator('input[placeholder="Min Yield %"]') })
      .locator('mat-form-field');
    await expect(yieldFilterField).toBeVisible({ timeout: 10000 });

    // Get bounding boxes
    const colBox = await yieldHeader.boundingBox();
    const filterBox = await yieldFilterField.boundingBox();

    expect(colBox).not.toBeNull();
    expect(filterBox).not.toBeNull();

    // Filter form field left edge must be at or to the right of the column left edge
    expect(filterBox!.x).toBeGreaterThanOrEqual(colBox!.x - 1);

    // Filter form field right edge must not exceed the column right edge (no overflow)
    expect(filterBox!.x + filterBox!.width).toBeLessThanOrEqual(
      colBox!.x + colBox!.width + 1
    );
  });
});
