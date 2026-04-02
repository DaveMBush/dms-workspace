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

  test.beforeAll(async () => {
    const seeder = await seedUniverseE2eData();
    cleanup = seeder.cleanup;
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

      // Verify sort indicator is active before reload
      await expect(header).toHaveAttribute('aria-sort', /ascending|descending/);

      // Reload the page
      await page.reload();
      await waitForTableRows(page);

      // After reload, sort indicator should still be visible
      const restoredHeader = page.locator('[data-sort-header="symbol"]');
      await expect(restoredHeader).toHaveAttribute(
        'aria-sort',
        /ascending|descending/
      );
    });

    test('sort indicator on Ex-Date persists after page reload', async ({
      page,
    }) => {
      // Click "Ex-Date" column header to apply ascending sort
      const header = page.locator('[data-sort-header="ex_date"]');
      await header.click();
      await page.waitForTimeout(500);

      // Verify sort indicator is active before reload
      await expect(header).toHaveAttribute('aria-sort', /ascending|descending/);

      // Reload the page
      await page.reload();
      await waitForTableRows(page);

      // After reload, sort indicator should still be visible
      const restoredHeader = page.locator('[data-sort-header="ex_date"]');
      await expect(restoredHeader).toHaveAttribute(
        'aria-sort',
        /ascending|descending/
      );
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
      // Type a filter value into the Symbol search input
      const symbolInput = page.getByPlaceholder('Search Symbol');
      await symbolInput.fill('TESTFILTER');
      // Wait for debounced save (300ms) plus buffer
      await page.waitForTimeout(600);

      // Reload the page
      await page.reload();
      // Wait for the table component to render (not data rows, since the
      // restored filter may legitimately exclude all seeded data)
      await expect(page.locator('dms-base-table')).toBeVisible({
        timeout: 15000,
      });

      // After reload, filter input should still contain the value
      const restoredInput = page.getByPlaceholder('Search Symbol');
      await expect(restoredInput).toHaveValue('TESTFILTER');
    });
  });
});
