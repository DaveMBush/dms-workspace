import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedExpiredFilterE2eData } from './helpers/seed-expired-filter-e2e-data.helper';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Wait for the Universe table and at least one data row to be visible.
 */
async function waitForTableRows(page: Page): Promise<void> {
  await expect(page.locator('dms-base-table')).toBeVisible({ timeout: 15000 });
  await page.waitForSelector('tr.mat-mdc-row', { timeout: 15000 });
}

/**
 * Clear the saved sort-filter state so a pre-existing symbol filter does not
 * hide freshly-seeded rows.
 */
async function clearSortFilterState(page: Page): Promise<void> {
  await page.evaluate(function removeSortFilterState(): void {
    localStorage.removeItem('dms-sort-filter-state');
  });
}

/**
 * Type a symbol prefix into the Symbol search input to narrow the table, then
 * wait for the debounce to settle.
 */
async function filterBySymbol(page: Page, symbol: string): Promise<void> {
  const input = page.locator('input[placeholder="Search Symbol"]');
  await input.fill(symbol);
  // Allow Angular's debounce / change-detection cycle to complete.
  await page.waitForTimeout(600);
}

// ─── Epic 109 — Expired-No-Open Filter (Story 109.3) ─────────────────────────

test.describe(
  'Universe Expired-No-Open Filter (Epic 109 / Story 109.3)',
  function expiredFilterSuite() {
    let cleanup: () => Promise<void>;
    let absentSymbol: string;
    let presentSymbols: string[];

    test.beforeAll(async function seedData() {
      const seeder = await seedExpiredFilterE2eData();
      cleanup = seeder.cleanup;
      absentSymbol = seeder.absentSymbol;
      presentSymbols = seeder.presentSymbols;
    });

    test.afterAll(async function cleanupData() {
      if (cleanup) {
        await cleanup();
      }
    });

    test.beforeEach(async function navigateToUniverse({ page }) {
      await login(page);
      await clearSortFilterState(page);
      await page.goto('/global/universe');
      await waitForTableRows(page);
    });

    test(
      'row (a) expired-with-no-open is absent from the Universe screen',
      async function absentRowTest({ page }) {
        await filterBySymbol(page, absentSymbol);
        // After filtering by the exact symbol, no rows should match because
        // the server-side filter drops it before the response reaches the UI.
        const rows = page
          .locator('tr.mat-mdc-row')
          .filter({ hasText: absentSymbol });
        await expect(rows).toHaveCount(0, { timeout: 10000 });
      }
    );

    test(
      'row (b) expired-with-open is visible on the Universe screen',
      async function expiredWithOpenTest({ page }) {
        const symbol = presentSymbols[0];
        await filterBySymbol(page, symbol);
        const row = page
          .locator('tr.mat-mdc-row')
          .filter({ hasText: symbol });
        await expect(row).toHaveCount(1, { timeout: 10000 });
      }
    );

    test(
      'row (c) active-with-no-open is visible on the Universe screen',
      async function activeNoOpenTest({ page }) {
        const symbol = presentSymbols[1];
        await filterBySymbol(page, symbol);
        const row = page
          .locator('tr.mat-mdc-row')
          .filter({ hasText: symbol });
        await expect(row).toHaveCount(1, { timeout: 10000 });
      }
    );

    test(
      'row (d) active-with-open is visible on the Universe screen',
      async function activeWithOpenTest({ page }) {
        const symbol = presentSymbols[2];
        await filterBySymbol(page, symbol);
        const row = page
          .locator('tr.mat-mdc-row')
          .filter({ hasText: symbol });
        await expect(row).toHaveCount(1, { timeout: 10000 });
      }
    );
  }
);
