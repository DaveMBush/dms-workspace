/* eslint-disable sonarjs/no-empty-test-file -- test.fail() not recognized by plugin */
import { expect, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedUniverseData } from './helpers/seed-universe-data.helper';

test.describe('Universe Re-sort After Cell Edit', () => {
  let cleanup: () => Promise<void>;

  test.beforeEach(async function setupUniverseData({ page }) {
    const seeder = await seedUniverseData();
    cleanup = seeder.cleanup;

    await login(page);
    await page.goto('/global/universe');
    await expect(page.locator('dms-base-table')).toBeVisible();
    await page.waitForSelector('tr.mat-mdc-row', { timeout: 15000 });
  });

  test.afterEach(async function cleanupUniverseData() {
    await cleanup();
  });

  test.fail(
    'BUG(72-1): row does not re-sort after cell edit',
    async function verifyRowResortAfterCellEdit({ page }) {
      // Sort by Ex-Date ascending
      const exDateHeader = page.locator('[data-sort-header="ex_date"]');
      await exDateHeader.click();
      await page.waitForTimeout(500);

      // Verify sort is active
      const sortDir = await exDateHeader.getAttribute('aria-sort');
      expect(sortDir).toMatch(/ascending|descending/);

      // Record the first row's symbol before editing
      const firstRowSymbol = page.locator(
        'tr.mat-mdc-row:first-child td:first-child'
      );
      const originalSymbol = await firstRowSymbol.textContent();

      // Click the first row's ex-date cell to enter edit mode
      const exDateCell = page.locator('[data-testid="ex-date-cell-0"]');
      await exDateCell.click();

      // Wait for the datepicker input to appear
      const dateInput = page.locator('[data-testid="ex-date-picker"]');
      await expect(dateInput).toBeVisible({ timeout: 5000 });

      // Set the date to far in the future so the row should move to the bottom
      await dateInput.fill('12/31/2099');
      await page.keyboard.press('Enter');

      // Wait for the edit to be processed
      await page.waitForTimeout(500);

      // After the edit, the first row should have a DIFFERENT symbol
      // because the original first row (with the earliest date) now has
      // a date far in the future and should have moved to the bottom.
      const newFirstSymbol = await firstRowSymbol.textContent();
      expect(newFirstSymbol?.trim()).not.toBe(originalSymbol?.trim());
    }
  );
});
