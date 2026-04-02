import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedUniverseE2eData } from './helpers/seed-universe-e2e-data.helper';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Clear sort-filter state from localStorage.
 */
async function clearSortFilterState(page: Page): Promise<void> {
  await page.evaluate(function removeSortFilterState(): void {
    localStorage.removeItem('dms-sort-filter-state');
  });
}

/**
 * Wait for dms-base-table and at least one data row.
 */
async function waitForTableRows(page: Page): Promise<void> {
  await expect(page.locator('dms-base-table')).toBeVisible({ timeout: 15000 });
  await page.waitForSelector('tr.mat-mdc-row', { timeout: 15000 });
}

// ─── Story 38.3: Universe Screen Sort/Filter State Persistence ───────────────
//
// These tests verify that the Universe Screen sort and filter state persists
// across page reloads. They confirm no regressions from Stories 38.1 and 38.2.

test.describe('Universe Sort/Filter Persistence (Story 38.3)', () => {
  let cleanup: () => Promise<void>;
  let symbols: string[];

  test.beforeAll(async () => {
    const seeder = await seedUniverseE2eData();
    cleanup = seeder.cleanup;
    symbols = seeder.symbols;
  });

  test.afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Sort Persistence
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Universe — sort persistence', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await clearSortFilterState(page);
      await page.goto('/global/universe');
      await waitForTableRows(page);
    });

    test('sort indicator on Symbol persists after page reload', async ({
      page,
    }) => {
      // Click "Symbol" column header to apply ascending sort
      const header = page.locator('[data-sort-header="symbol"]');
      await header.click();
      await page.waitForTimeout(500);

      // Capture exact sort direction before reload
      const sortBefore = await header.getAttribute('aria-sort');
      expect(sortBefore).toMatch(/ascending|descending/);

      // Reload the page
      await page.reload();
      await waitForTableRows(page);

      // After reload, sort indicator should show the same direction
      const restoredHeader = page.locator('[data-sort-header="symbol"]');
      await expect(restoredHeader).toHaveAttribute('aria-sort', sortBefore!);
    });

    test('sort indicator on Ex-Date persists after page reload', async ({
      page,
    }) => {
      // Click "Ex-Date" column header to apply ascending sort
      const header = page.locator('[data-sort-header="ex_date"]');
      await header.click();
      await page.waitForTimeout(500);

      // Capture exact sort direction before reload
      const sortBefore = await header.getAttribute('aria-sort');
      expect(sortBefore).toMatch(/ascending|descending/);

      // Reload the page
      await page.reload();
      await waitForTableRows(page);

      // After reload, sort indicator should show the same direction
      const restoredHeader = page.locator('[data-sort-header="ex_date"]');
      await expect(restoredHeader).toHaveAttribute('aria-sort', sortBefore!);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Filter Persistence
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Universe — filter persistence', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await clearSortFilterState(page);
      await page.goto('/global/universe');
      await waitForTableRows(page);
    });

    test('symbol filter value persists after page reload', async ({ page }) => {
      // Use a seeded symbol prefix to verify both input and data persistence
      const filterValue = symbols[0];
      const symbolInput = page.getByPlaceholder('Search Symbol');
      await symbolInput.fill(filterValue);
      // Wait for debounced save (300ms) plus buffer
      await page.waitForTimeout(600);

      // Verify filtered data is visible before reload
      const rowsBefore = page.locator('tr.mat-mdc-row');
      await expect(rowsBefore.first()).toBeVisible({ timeout: 10000 });

      // Reload the page
      await page.reload();
      await waitForTableRows(page);

      // After reload, filter input should still contain the value
      const restoredInput = page.getByPlaceholder('Search Symbol');
      await expect(restoredInput).toHaveValue(filterValue);

      // After reload, filtered data should still be visible
      const rowsAfter = page.locator('tr.mat-mdc-row');
      await expect(rowsAfter.first()).toBeVisible({ timeout: 10000 });
    });
  });
});
