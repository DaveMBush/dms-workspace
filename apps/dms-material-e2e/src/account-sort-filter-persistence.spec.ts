import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedDivDepositsE2eData } from './helpers/seed-div-deposits-e2e-data.helper';
import { seedOpenPositionsE2eData } from './helpers/seed-open-positions-e2e-data.helper';
import { seedSoldPositionsE2eData } from './helpers/seed-sold-positions-e2e-data.helper';

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

// ─── Story 38.1: Sort/Filter State Persistence on Account Screens ────────────
//
// These tests verify that sort and filter state persists across page reloads.
// They are expected to expose missing persistence — if the app does not restore
// the sort indicator or filter input value after reload, the test fails.

test.describe('Account Sort/Filter Persistence (Story 38.1)', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // Open Positions — Sort Persistence
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Open Positions — sort persistence', () => {
    let cleanupOpen: () => Promise<void>;
    let accountIdOpen: string;

    test.beforeAll(async () => {
      const seeder = await seedOpenPositionsE2eData();
      cleanupOpen = seeder.cleanup;
      accountIdOpen = seeder.accountId;
    });

    test.afterAll(async () => {
      if (cleanupOpen) {
        await cleanupOpen();
      }
    });

    test.beforeEach(async ({ page }) => {
      await login(page);
      await clearSortFilterState(page);
      await page.goto(`/account/${accountIdOpen}/open`);
      await waitForTableRows(page);
    });

    test('sort indicator on Buy Date persists after page reload', async ({
      page,
    }) => {
      // Click "Buy Date" column header to apply ascending sort
      const header = page.locator('[data-sort-header="buyDate"]');
      await header.click();
      await page.waitForTimeout(500);

      // Verify sort indicator is active before reload
      await expect(header).toHaveAttribute('aria-sort', /ascending|descending/);

      // Reload the page
      await page.reload();
      await waitForTableRows(page);

      // After reload, sort indicator should still be visible
      const restoredHeader = page.locator('[data-sort-header="buyDate"]');
      await expect(restoredHeader).toHaveAttribute(
        'aria-sort',
        /ascending|descending/
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Open Positions — Filter Persistence
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Open Positions — filter persistence', () => {
    let cleanupOpen: () => Promise<void>;
    let accountIdOpen: string;

    test.beforeAll(async () => {
      const seeder = await seedOpenPositionsE2eData();
      cleanupOpen = seeder.cleanup;
      accountIdOpen = seeder.accountId;
    });

    test.afterAll(async () => {
      if (cleanupOpen) {
        await cleanupOpen();
      }
    });

    test.beforeEach(async ({ page }) => {
      await login(page);
      await clearSortFilterState(page);
      await page.goto(`/account/${accountIdOpen}/open`);
      await waitForTableRows(page);
    });

    test('symbol filter value persists after page reload', async ({ page }) => {
      // Type a filter value into the Symbol search input
      const symbolInput = page.getByPlaceholder('Search Symbol');
      await symbolInput.fill('TEST');
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
      await expect(restoredInput).toHaveValue('TEST');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Closed Positions — Sort Persistence
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Closed Positions — sort persistence', () => {
    let cleanupClosed: () => Promise<void>;
    let accountIdClosed: string;

    test.beforeAll(async () => {
      const seeder = await seedSoldPositionsE2eData();
      cleanupClosed = seeder.cleanup;
      accountIdClosed = seeder.accountId;
    });

    test.afterAll(async () => {
      if (cleanupClosed) {
        await cleanupClosed();
      }
    });

    test.beforeEach(async ({ page }) => {
      await login(page);
      await clearSortFilterState(page);
      await page.goto(`/account/${accountIdClosed}/sold`);
      await waitForTableRows(page);
    });

    test('sort indicator on Sell Date persists after page reload', async ({
      page,
    }) => {
      // Click "Sell Date" column header to apply ascending sort
      const header = page.locator('[data-sort-header="sell_date"]');
      await header.click();
      await page.waitForTimeout(500);

      // Verify sort indicator is active before reload
      await expect(header).toHaveAttribute('aria-sort', /ascending|descending/);

      // Reload the page
      await page.reload();
      await waitForTableRows(page);

      // After reload, sort indicator should still be visible
      const restoredHeader = page.locator('[data-sort-header="sell_date"]');
      await expect(restoredHeader).toHaveAttribute(
        'aria-sort',
        /ascending|descending/
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Closed Positions — Filter Persistence
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Closed Positions — filter persistence', () => {
    let cleanupClosed: () => Promise<void>;
    let accountIdClosed: string;

    test.beforeAll(async () => {
      const seeder = await seedSoldPositionsE2eData();
      cleanupClosed = seeder.cleanup;
      accountIdClosed = seeder.accountId;
    });

    test.afterAll(async () => {
      if (cleanupClosed) {
        await cleanupClosed();
      }
    });

    test.beforeEach(async ({ page }) => {
      await login(page);
      await clearSortFilterState(page);
      await page.goto(`/account/${accountIdClosed}/sold`);
      await waitForTableRows(page);
    });

    test('symbol filter value persists after page reload', async ({ page }) => {
      // Type a filter value into the Symbol search input
      const symbolInput = page.getByPlaceholder('Search Symbol');
      await symbolInput.fill('XYZFILTER');
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
      await expect(restoredInput).toHaveValue('XYZFILTER');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Dividend Deposits — Sort Persistence
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Dividend Deposits — sort persistence', () => {
    let cleanupDD: () => Promise<void>;
    let accountIdDD: string;

    test.beforeAll(async () => {
      const seeder = await seedDivDepositsE2eData();
      cleanupDD = seeder.cleanup;
      accountIdDD = seeder.accountId;
    });

    test.afterAll(async () => {
      if (cleanupDD) {
        await cleanupDD();
      }
    });

    test.beforeEach(async ({ page }) => {
      await login(page);
      await clearSortFilterState(page);
      await page.goto(`/account/${accountIdDD}/div-dep`);
      await waitForTableRows(page);
    });

    test('sort indicator on Amount persists after page reload', async ({
      page,
    }) => {
      // Click "Amount" column header to apply ascending sort
      const header = page.locator('[data-sort-header="amount"]');
      await header.click();
      await page.waitForTimeout(500);

      // Verify sort indicator is active before reload
      await expect(header).toHaveAttribute('aria-sort', /ascending|descending/);

      // Reload the page
      await page.reload();
      await waitForTableRows(page);

      // After reload, sort indicator should still be visible
      const restoredHeader = page.locator('[data-sort-header="amount"]');
      await expect(restoredHeader).toHaveAttribute(
        'aria-sort',
        /ascending|descending/
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Dividend Deposits — Filter Persistence (no filter input exists)
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // The Dividend Deposits table does not have a filter row, so no filter
  // persistence test is needed. This is documented here for completeness.
});
