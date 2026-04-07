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

// ─── Story 54.1: Universe Screen Sort State Stickiness Across Navigation ──────
//
// This test documents the expected behaviour: the Universe sort state (stored in
// localStorage under 'dms-sort-filter-state') MUST be restored when the user
// navigates away from the Universe screen and returns via Angular SPA routing.
//
// The sort state is loaded from localStorage in the GlobalUniverseComponent
// signal initialiser and passed to BaseTableComponent via [sortColumns] input,
// which drives both the visual sort indicator and the client-side data order.

test.describe('Universe Sort State Stickiness (Story 54.1)', () => {
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

  test('sort state persists after SPA navigation away and back', async ({
    page,
  }) => {
    // Setup: login, go to Universe via full page load, then clear any sort state
    await login(page);
    await page.goto('/global/universe');
    await waitForTableRows(page);
    await clearSortFilterState(page);

    // Reload to start clean (no saved sort state in localStorage)
    await page.reload();
    await waitForTableRows(page);

    // Step 1: Click the Symbol column header twice to apply Symbol descending sort
    const symbolHeader = page.locator('[data-sort-header="symbol"]');
    await symbolHeader.click();
    await expect(symbolHeader).toHaveAttribute('aria-sort', 'ascending');
    await symbolHeader.click();
    await expect(symbolHeader).toHaveAttribute('aria-sort', 'descending');

    // Step 2: Navigate away using Angular SPA routing (click the nav link)
    // This is a client-side navigation — the Universe component is destroyed
    await page.click('[data-testid="global-nav-screener"]');
    await expect(page).toHaveURL(/screener/, { timeout: 10000 });

    // Step 3: Navigate back to Universe using Angular SPA routing (click the nav link)
    // The Universe component is re-created and reads sort state from localStorage
    await page.click('[data-testid="global-nav-universe"]');
    await waitForTableRows(page);

    // Step 4: Assert the sort indicator is restored after SPA navigation.
    // The sort state is read from localStorage via GlobalUniverseComponent's
    // sortColumns$ signal and passed to BaseTableComponent via [sortColumns].
    const restoredHeader = page.locator('[data-sort-header="symbol"]');
    await expect(restoredHeader).toHaveAttribute('aria-sort', 'descending');
  });
});
