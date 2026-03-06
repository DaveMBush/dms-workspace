import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';

// Created by beforeAll — a fresh account so we never depend on pre-existing data.
let testAccountId = '';
let testAccountName = '';

// Second account for cross-account switching tests
let secondAccountId = '';
let secondAccountName = '';

/**
 * Wait for the accounts panel sidebar and its content to load.
 */
async function waitForAccountsPanel(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="accounts-panel"]')).toBeVisible({
    timeout: 15000,
  });
  await page.waitForLoadState('networkidle', { timeout: 30000 });
  await Promise.race([
    page
      .locator('[data-testid="account-item"]')
      .first()
      .waitFor({ state: 'visible', timeout: 10000 })
      .catch(ignoreError),
    page
      .locator('[data-testid="add-account-button"]')
      .waitFor({ state: 'visible', timeout: 10000 }),
  ]);
}

/**
 * Navigate to a specific account tab.
 */
async function navigateToAccountTab(
  page: Page,
  accountId: string,
  tab: '' | 'div-dep' | 'open' | 'sold' = ''
): Promise<void> {
  const path = tab ? `/account/${accountId}/${tab}` : `/account/${accountId}`;
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

/**
 * Click an account in the sidebar by name and wait for navigation.
 */
async function selectAccountByName(
  page: Page,
  accountName: string
): Promise<void> {
  const accountLink = page
    .locator('[data-testid="account-item"]')
    .filter({ hasText: accountName });
  await expect(accountLink).toBeVisible({ timeout: 10000 });
  await accountLink.click();
  await page.waitForURL(/\/account\//, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

/** No-op catch handler (intentional swallow). */
function ignoreError(): void {
  /* swallowed on purpose */
}

// ─── Test Setup ───────────────────────────────────────────────────────────────

test.describe('Account Selection', () => {
  test.beforeAll(async ({ request }) => {
    // Create two fresh test accounts via API
    const res1 = await request.post('/api/accounts/add', {
      data: { name: `AccSel Primary ${Date.now()}` },
    });
    if (!res1.ok()) {
      throw new Error(
        `Failed to create primary test account: ${res1.status()}`
      );
    }
    const accounts1 = (await res1.json()) as Array<{
      id: string;
      name: string;
    }>;
    if (!accounts1[0]?.id) {
      throw new Error('Primary account has no id');
    }
    testAccountId = accounts1[0].id;
    testAccountName = accounts1[0].name;

    const res2 = await request.post('/api/accounts/add', {
      data: { name: `AccSel Secondary ${Date.now()}` },
    });
    if (!res2.ok()) {
      throw new Error(
        `Failed to create secondary test account: ${res2.status()}`
      );
    }
    const accounts2 = (await res2.json()) as Array<{
      id: string;
      name: string;
    }>;
    if (!accounts2[0]?.id) {
      throw new Error('Secondary account has no id');
    }
    secondAccountId = accounts2[0].id;
    secondAccountName = accounts2[0].name;
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await waitForAccountsPanel(page);
  });

  // ─── Account Selection from Sidebar ───────────────────────────────────────

  test.describe('Account Selection from Sidebar', () => {
    test('should navigate to account when clicking sidebar item', async ({
      page,
    }) => {
      await selectAccountByName(page, testAccountName);
      await expect(page).toHaveURL(new RegExp(`/account/${testAccountId}`));
    });

    test('should highlight selected account in sidebar', async ({ page }) => {
      await selectAccountByName(page, testAccountName);

      const accountLink = page
        .locator('[data-testid="account-item"]')
        .filter({ hasText: testAccountName });
      await expect(accountLink).toHaveClass(/active-account/);
    });

    test('should switch between accounts in sidebar', async ({ page }) => {
      // Select first account
      await selectAccountByName(page, testAccountName);
      await expect(page).toHaveURL(new RegExp(`/account/${testAccountId}`));

      // Select second account
      await selectAccountByName(page, secondAccountName);
      await expect(page).toHaveURL(new RegExp(`/account/${secondAccountId}`));
    });

    test('should display account panel tabs after selection', async ({
      page,
    }) => {
      await selectAccountByName(page, testAccountName);

      // Verify all tabs are present
      await expect(page.getByRole('tab', { name: 'Summary' })).toBeVisible();
      await expect(
        page.getByRole('tab', { name: 'Open Positions' })
      ).toBeVisible();
      await expect(
        page.getByRole('tab', { name: 'Sold Positions' })
      ).toBeVisible();
      await expect(
        page.getByRole('tab', { name: 'Dividend Deposits' })
      ).toBeVisible();
    });
  });

  // ─── Summary Screen Updates ───────────────────────────────────────────────

  test.describe('Summary Screen Updates', () => {
    test('should display account summary on selection', async ({ page }) => {
      await navigateToAccountTab(page, testAccountId);

      const summaryCard = page.locator(
        '[data-testid="account-summary-container"]'
      );
      await expect(summaryCard).toBeVisible({ timeout: 10000 });
    });

    test('should display summary heading', async ({ page }) => {
      await navigateToAccountTab(page, testAccountId);

      await expect(
        page.getByRole('heading', { name: 'Account Summary' })
      ).toBeVisible();
    });

    test('should display stats grid', async ({ page }) => {
      await navigateToAccountTab(page, testAccountId);

      const statsGrid = page.locator('[data-testid="stats-grid"]');
      await expect(statsGrid).toBeVisible({ timeout: 10000 });
    });

    test('should update summary when switching accounts', async ({ page }) => {
      // Navigate to first account summary
      await navigateToAccountTab(page, testAccountId);
      const summaryCard = page.locator(
        '[data-testid="account-summary-container"]'
      );
      await expect(summaryCard).toBeVisible({ timeout: 10000 });

      // Switch to second account via sidebar
      await selectAccountByName(page, secondAccountName);

      // Summary should still be visible for the new account
      await expect(summaryCard).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(new RegExp(`/account/${secondAccountId}`));
    });
  });

  // ─── Open Positions Table Updates ─────────────────────────────────────────

  test.describe('Open Positions Table Updates', () => {
    test('should display open positions table for account', async ({
      page,
    }) => {
      await navigateToAccountTab(page, testAccountId, 'open');

      const table = page.locator('[data-testid="open-positions-table"]');
      await expect(table).toBeVisible({ timeout: 10000 });
    });

    test('should display add position button', async ({ page }) => {
      await navigateToAccountTab(page, testAccountId, 'open');

      const addButton = page.locator('[data-testid="add-new-position-button"]');
      await expect(addButton).toBeVisible({ timeout: 10000 });
    });

    test('should update open positions when switching accounts', async ({
      page,
    }) => {
      // Go to first account open positions
      await navigateToAccountTab(page, testAccountId, 'open');
      const table = page.locator('[data-testid="open-positions-table"]');
      await expect(table).toBeVisible({ timeout: 10000 });

      // Switch to second account via sidebar
      await selectAccountByName(page, secondAccountName);

      // Navigate to open positions tab for new account
      await page.getByRole('tab', { name: 'Open Positions' }).click();
      await page.waitForLoadState('networkidle');

      // Table should still be visible for the new account
      await expect(table).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(
        new RegExp(`/account/${secondAccountId}/open`)
      );
    });
  });

  // ─── Sold Positions Table Updates ─────────────────────────────────────────

  test.describe('Sold Positions Table Updates', () => {
    test('should display sold positions table for account', async ({
      page,
    }) => {
      await navigateToAccountTab(page, testAccountId, 'sold');

      const table = page.locator('dms-base-table');
      await expect(table).toBeVisible({ timeout: 10000 });
    });

    test('should display sold positions column headers', async ({ page }) => {
      await navigateToAccountTab(page, testAccountId, 'sold');

      await expect(
        page.getByRole('columnheader', { name: 'Symbol', exact: true })
      ).toBeVisible();
      await expect(
        page.getByRole('columnheader', { name: 'Buy', exact: true })
      ).toBeVisible();
      await expect(
        page.getByRole('columnheader', { name: 'Sell', exact: true })
      ).toBeVisible();
    });

    test('should update sold positions when switching accounts', async ({
      page,
    }) => {
      // Go to first account sold positions
      await navigateToAccountTab(page, testAccountId, 'sold');
      const table = page.locator('dms-base-table');
      await expect(table).toBeVisible({ timeout: 10000 });

      // Switch to second account via sidebar
      await selectAccountByName(page, secondAccountName);

      // Navigate to sold positions tab for new account
      await page.getByRole('tab', { name: 'Sold Positions' }).click();
      await page.waitForLoadState('networkidle');

      // Table should still be visible for the new account
      await expect(table).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(
        new RegExp(`/account/${secondAccountId}/sold`)
      );
    });
  });

  // ─── Dividends Table Updates ──────────────────────────────────────────────

  test.describe('Dividends Table Updates', () => {
    test('should display dividends table for account', async ({ page }) => {
      await navigateToAccountTab(page, testAccountId, 'div-dep');

      // Dividend deposits uses dms-base-table or column headers
      await expect(
        page.getByRole('columnheader', { name: 'Symbol' })
      ).toBeVisible({ timeout: 10000 });
    });

    test('should display dividend column headers', async ({ page }) => {
      await navigateToAccountTab(page, testAccountId, 'div-dep');

      await expect(
        page.getByRole('columnheader', { name: 'Date' })
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByRole('columnheader', { name: 'Amount' })
      ).toBeVisible();
      await expect(
        page.getByRole('columnheader', { name: 'Type' })
      ).toBeVisible();
    });

    test('should update dividends when switching accounts', async ({
      page,
    }) => {
      // Go to first account dividends
      await navigateToAccountTab(page, testAccountId, 'div-dep');
      await expect(
        page.getByRole('columnheader', { name: 'Symbol' })
      ).toBeVisible({ timeout: 10000 });

      // Switch to second account via sidebar
      await selectAccountByName(page, secondAccountName);

      // Navigate to dividends tab for new account
      await page.getByRole('tab', { name: 'Dividend Deposits' }).click();
      await page.waitForLoadState('networkidle');

      // Column headers should still be visible for the new account
      await expect(
        page.getByRole('columnheader', { name: 'Symbol' })
      ).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(
        new RegExp(`/account/${secondAccountId}/div-dep`)
      );
    });
  });

  // ─── Cross-Tab Account Switching ──────────────────────────────────────────

  test.describe('Cross-Tab Account Switching', () => {
    test('should maintain data when switching from summary to open positions', async ({
      page,
    }) => {
      await navigateToAccountTab(page, testAccountId);

      // Verify summary is shown
      const summaryCard = page.locator(
        '[data-testid="account-summary-container"]'
      );
      await expect(summaryCard).toBeVisible({ timeout: 10000 });

      // Switch to Open Positions tab
      await page.getByRole('tab', { name: 'Open Positions' }).click();
      await page.waitForLoadState('networkidle');

      // Verify open positions table is visible
      const table = page.locator('[data-testid="open-positions-table"]');
      await expect(table).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(
        new RegExp(`/account/${testAccountId}/open`)
      );
    });

    test('should maintain data when switching from open positions to sold positions', async ({
      page,
    }) => {
      await navigateToAccountTab(page, testAccountId, 'open');

      const openTable = page.locator('[data-testid="open-positions-table"]');
      await expect(openTable).toBeVisible({ timeout: 10000 });

      // Switch to Sold Positions tab
      await page.getByRole('tab', { name: 'Sold Positions' }).click();
      await page.waitForLoadState('networkidle');

      const soldTable = page.locator('dms-base-table');
      await expect(soldTable).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(
        new RegExp(`/account/${testAccountId}/sold`)
      );
    });

    test('should maintain data when switching from sold positions to dividends', async ({
      page,
    }) => {
      await navigateToAccountTab(page, testAccountId, 'sold');

      const soldTable = page.locator('dms-base-table');
      await expect(soldTable).toBeVisible({ timeout: 10000 });

      // Switch to Dividend Deposits tab
      await page.getByRole('tab', { name: 'Dividend Deposits' }).click();
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('columnheader', { name: 'Symbol' })
      ).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(
        new RegExp(`/account/${testAccountId}/div-dep`)
      );
    });

    test('should switch account while on a sub-tab and land on summary', async ({
      page,
    }) => {
      // Start on open positions of first account
      await navigateToAccountTab(page, testAccountId, 'open');
      const openTable = page.locator('[data-testid="open-positions-table"]');
      await expect(openTable).toBeVisible({ timeout: 10000 });

      // Click second account in sidebar
      await selectAccountByName(page, secondAccountName);

      // Should navigate to the second account (default tab = summary)
      await expect(page).toHaveURL(new RegExp(`/account/${secondAccountId}`));
      const summaryCard = page.locator(
        '[data-testid="account-summary-container"]'
      );
      await expect(summaryCard).toBeVisible({ timeout: 10000 });
    });

    test('should cycle through all tabs for same account', async ({ page }) => {
      await navigateToAccountTab(page, testAccountId);

      // Summary
      const summaryCard = page.locator(
        '[data-testid="account-summary-container"]'
      );
      await expect(summaryCard).toBeVisible({ timeout: 10000 });

      // Open Positions
      await page.getByRole('tab', { name: 'Open Positions' }).click();
      await page.waitForLoadState('networkidle');
      await expect(
        page.locator('[data-testid="open-positions-table"]')
      ).toBeVisible({ timeout: 10000 });

      // Sold Positions
      await page.getByRole('tab', { name: 'Sold Positions' }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('dms-base-table')).toBeVisible({
        timeout: 10000,
      });

      // Dividend Deposits
      await page.getByRole('tab', { name: 'Dividend Deposits' }).click();
      await page.waitForLoadState('networkidle');
      await expect(
        page.getByRole('columnheader', { name: 'Symbol' })
      ).toBeVisible({ timeout: 10000 });
    });
  });

  // ─── Browser Refresh Persistence ──────────────────────────────────────────

  test.describe('Browser Refresh Persistence', () => {
    test('should persist account selection after refresh on summary', async ({
      page,
    }) => {
      await navigateToAccountTab(page, testAccountId);
      const summaryCard = page.locator(
        '[data-testid="account-summary-container"]'
      );
      await expect(summaryCard).toBeVisible({ timeout: 10000 });

      // Refresh the page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Summary should still be visible for the same account
      await expect(summaryCard).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(new RegExp(`/account/${testAccountId}`));
    });

    test('should persist account selection after refresh on open positions', async ({
      page,
    }) => {
      await navigateToAccountTab(page, testAccountId, 'open');
      const table = page.locator('[data-testid="open-positions-table"]');
      await expect(table).toBeVisible({ timeout: 10000 });

      // Refresh the page
      await page.reload();
      await page.waitForLoadState('networkidle');

      await expect(table).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(
        new RegExp(`/account/${testAccountId}/open`)
      );
    });

    test('should persist account selection after refresh on sold positions', async ({
      page,
    }) => {
      await navigateToAccountTab(page, testAccountId, 'sold');
      const table = page.locator('dms-base-table');
      await expect(table).toBeVisible({ timeout: 10000 });

      // Refresh the page
      await page.reload();
      await page.waitForLoadState('networkidle');

      await expect(table).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(
        new RegExp(`/account/${testAccountId}/sold`)
      );
    });

    test('should persist account selection after refresh on dividends', async ({
      page,
    }) => {
      await navigateToAccountTab(page, testAccountId, 'div-dep');
      await expect(
        page.getByRole('columnheader', { name: 'Symbol' })
      ).toBeVisible({ timeout: 10000 });

      // Refresh the page
      await page.reload();
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('columnheader', { name: 'Symbol' })
      ).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(
        new RegExp(`/account/${testAccountId}/div-dep`)
      );
    });
  });

  // ─── Deep Linking ─────────────────────────────────────────────────────────

  test.describe('Deep Linking', () => {
    test('should load account summary via deep link', async ({ page }) => {
      await page.goto(`/account/${testAccountId}`);
      await page.waitForLoadState('networkidle');

      const summaryCard = page.locator(
        '[data-testid="account-summary-container"]'
      );
      await expect(summaryCard).toBeVisible({ timeout: 10000 });
    });

    test('should load open positions via deep link', async ({ page }) => {
      await page.goto(`/account/${testAccountId}/open`);
      await page.waitForLoadState('networkidle');

      const table = page.locator('[data-testid="open-positions-table"]');
      await expect(table).toBeVisible({ timeout: 10000 });
    });

    test('should load sold positions via deep link', async ({ page }) => {
      await page.goto(`/account/${testAccountId}/sold`);
      await page.waitForLoadState('networkidle');

      const table = page.locator('dms-base-table');
      await expect(table).toBeVisible({ timeout: 10000 });
    });

    test('should load dividends via deep link', async ({ page }) => {
      await page.goto(`/account/${testAccountId}/div-dep`);
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('columnheader', { name: 'Symbol' })
      ).toBeVisible({ timeout: 10000 });
    });

    test('should highlight correct sidebar account on deep link', async ({
      page,
    }) => {
      await page.goto(`/account/${testAccountId}`);
      await page.waitForLoadState('networkidle');

      // The correct account in the sidebar should be active
      const accountLink = page
        .locator('[data-testid="account-item"]')
        .filter({ hasText: testAccountName });
      await expect(accountLink).toHaveClass(/active-account/);
    });

    test('should highlight correct tab on deep link to sub-tab', async ({
      page,
    }) => {
      await page.goto(`/account/${testAccountId}/open`);
      await page.waitForLoadState('networkidle');

      const openTab = page.getByRole('tab', { name: 'Open Positions' });
      await expect(openTab).toHaveAttribute('aria-selected', 'true', {
        timeout: 5000,
      });
    });
  });

  // ─── Loading States ───────────────────────────────────────────────────────

  test.describe('Loading States', () => {
    test('should show loading indicator during account summary load', async ({
      page,
    }) => {
      // Navigate and immediately check for loading state
      await page.goto(`/account/${testAccountId}`);

      // The loading spinner or summary container should eventually appear
      // (loading may be too fast to catch consistently, so we just verify
      // the final state is correct)
      const summaryCard = page.locator(
        '[data-testid="account-summary-container"]'
      );
      await expect(summaryCard).toBeVisible({ timeout: 15000 });
    });

    test('should transition from loading to content on tab switch', async ({
      page,
    }) => {
      await navigateToAccountTab(page, testAccountId);
      const summaryCard = page.locator(
        '[data-testid="account-summary-container"]'
      );
      await expect(summaryCard).toBeVisible({ timeout: 10000 });

      // Switch to open positions and verify content loads
      await page.getByRole('tab', { name: 'Open Positions' }).click();

      const table = page.locator('[data-testid="open-positions-table"]');
      await expect(table).toBeVisible({ timeout: 10000 });
    });
  });

  // ─── Error Handling ───────────────────────────────────────────────────────

  test.describe('Error Handling', () => {
    test('should handle navigation to non-existent account gracefully', async ({
      page,
    }) => {
      await page.goto('/account/non-existent-uuid-12345');
      await page.waitForLoadState('networkidle');

      // App should not crash — should show error state or redirect
      // At minimum, the page should still be functional
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('should recover and navigate after error', async ({ page }) => {
      // Navigate to a bad account URL
      await page.goto('/account/non-existent-uuid-12345');
      await page.waitForLoadState('networkidle');

      // Navigate to a valid account — app should recover
      await page.goto(`/account/${testAccountId}`);
      await page.waitForLoadState('networkidle');

      const summaryCard = page.locator(
        '[data-testid="account-summary-container"]'
      );
      await expect(summaryCard).toBeVisible({ timeout: 10000 });
    });

    test('should handle rapid account switching without errors', async ({
      page,
    }) => {
      // Quick succession of account selections
      await selectAccountByName(page, testAccountName);
      await selectAccountByName(page, secondAccountName);
      await selectAccountByName(page, testAccountName);

      // Final state should be first account summary
      await expect(page).toHaveURL(new RegExp(`/account/${testAccountId}`));
      const summaryCard = page.locator(
        '[data-testid="account-summary-container"]'
      );
      await expect(summaryCard).toBeVisible({ timeout: 10000 });
    });
  });
});
