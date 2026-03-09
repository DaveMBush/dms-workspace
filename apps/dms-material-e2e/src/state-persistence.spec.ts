import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';

// Created by beforeAll — fresh accounts so we never depend on pre-existing data.
let testAccountId = '';
let testAccountName = '';
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

// ─── State Persistence E2E Tests ──────────────────────────────────────────────

test.describe('State Persistence', () => {
  test.beforeAll(async ({ request }) => {
    // Create two fresh test accounts via API
    const res1 = await request.post('/api/accounts/add', {
      data: { name: `StatePersist Primary ${Date.now()}` },
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
      data: { name: `StatePersist Secondary ${Date.now()}` },
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
    // Clear localStorage before each test for clean state
    await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.removeItem('dms-ui-state'));
    await login(page);
    await waitForAccountsPanel(page);
  });

  // ─── Global Tab Persistence ─────────────────────────────────────────────

  test.describe('Global Tab Persistence', () => {
    test('should persist global tab selection through page refresh', async ({
      page,
    }) => {
      // Click on Screener global tab
      await page.click('[data-testid="global-nav-screener"]');
      await page.waitForURL('**/global/screener', { timeout: 10000 });

      // Refresh page
      await page.reload();
      await waitForAccountsPanel(page);

      // Verify Screener tab is still selected
      await expect(page).toHaveURL(/\/global\/screener/);
      await expect(
        page.locator('[data-testid="global-nav-screener"]')
      ).toHaveClass(/active-link/);
    });

    test('should persist Summary global tab through refresh', async ({
      page,
    }) => {
      // Click on Summary global tab
      await page.click('[data-testid="global-nav-summary"]');
      await page.waitForURL('**/global/summary', { timeout: 10000 });

      // Refresh page
      await page.reload();
      await waitForAccountsPanel(page);

      // Verify Summary tab is still selected
      await expect(page).toHaveURL(/\/global\/summary/);
    });
  });

  // ─── Account Selection Persistence ──────────────────────────────────────

  test.describe('Account Selection Persistence', () => {
    test('should persist account selection through page refresh', async ({
      page,
    }) => {
      // Select first account
      await selectAccountByName(page, testAccountName);
      await expect(page).toHaveURL(new RegExp(`/account/${testAccountId}`));

      // Refresh page
      await page.reload();
      await waitForAccountsPanel(page);

      // Verify account is still selected
      await expect(page).toHaveURL(new RegExp(`/account/${testAccountId}`));
    });

    test('should persist switching to a different account', async ({
      page,
    }) => {
      // Select first account
      await selectAccountByName(page, testAccountName);

      // Switch to second account
      await selectAccountByName(page, secondAccountName);
      await expect(page).toHaveURL(new RegExp(`/account/${secondAccountId}`));

      // Refresh page
      await page.reload();
      await waitForAccountsPanel(page);

      // Verify second account is still selected
      await expect(page).toHaveURL(new RegExp(`/account/${secondAccountId}`));
    });
  });

  // ─── Account Tab Persistence ────────────────────────────────────────────

  test.describe('Account Tab Persistence', () => {
    test('should persist account tab selection through page refresh', async ({
      page,
    }) => {
      // Select account
      await selectAccountByName(page, testAccountName);

      // Click on Open Positions tab
      await page.click('[data-testid="account-tab-open"]');
      await page.waitForURL(/\/open$/, { timeout: 10000 });

      // Refresh page
      await page.reload();
      await waitForAccountsPanel(page);

      // Verify Open Positions tab is still selected
      await expect(page).toHaveURL(
        new RegExp(`/account/${testAccountId}/open`)
      );
    });

    test('should maintain independent tab state per account', async ({
      page,
    }) => {
      // Select first account and set to Open Positions
      await selectAccountByName(page, testAccountName);
      await page.click('[data-testid="account-tab-open"]');
      await page.waitForURL(/\/open$/, { timeout: 10000 });

      // Select second account and set to Sold Positions
      await selectAccountByName(page, secondAccountName);
      await page.click('[data-testid="account-tab-sold"]');
      await page.waitForURL(/\/sold$/, { timeout: 10000 });

      // Refresh page — should restore second account with Sold tab
      await page.reload();
      await waitForAccountsPanel(page);

      await expect(page).toHaveURL(
        new RegExp(`/account/${secondAccountId}/sold`)
      );

      // Now navigate directly to first account and refresh to restore its tab
      await page.goto(`/account/${testAccountId}`);
      await page.waitForLoadState('networkidle');
      await page.reload();
      await waitForAccountsPanel(page);

      // Verify first account's Open tab is restored independently
      await expect(page).toHaveURL(
        new RegExp(`/account/${testAccountId}/open`)
      );
    });

    test('should persist Dividend Deposits tab selection', async ({ page }) => {
      // Select account
      await selectAccountByName(page, testAccountName);

      // Click on Dividend Deposits tab
      await page.click('[data-testid="account-tab-div-dep"]');
      await page.waitForURL(/\/div-dep$/, { timeout: 10000 });

      // Refresh page
      await page.reload();
      await waitForAccountsPanel(page);

      // Verify Dividend Deposits tab is still selected
      await expect(page).toHaveURL(
        new RegExp(`/account/${testAccountId}/div-dep`)
      );
    });
  });

  // ─── Complete State Restoration ─────────────────────────────────────────

  test.describe('Complete State Restoration', () => {
    test('should restore full state chain after page refresh', async ({
      page,
    }) => {
      // Set up complete state: navigate globally first, then to account with tab
      await page.click('[data-testid="global-nav-screener"]');
      await page.waitForURL('**/global/screener', { timeout: 10000 });

      // Select account and set tab
      await selectAccountByName(page, testAccountName);
      await page.click('[data-testid="account-tab-sold"]');
      await page.waitForURL(/\/sold$/, { timeout: 10000 });

      // Refresh page
      await page.reload();
      await waitForAccountsPanel(page);

      // Verify account with correct tab is restored
      await expect(page).toHaveURL(
        new RegExp(`/account/${testAccountId}/sold`)
      );
    });
  });

  // ─── Fresh Start ────────────────────────────────────────────────────────

  test.describe('Fresh Start', () => {
    test('should use defaults when no saved state exists', async ({ page }) => {
      // Clear any saved state
      await page.evaluate(() => localStorage.removeItem('dms-ui-state'));

      // Navigate to app root
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Verify defaults: should be on dashboard or initial route
      await expect(page).toHaveURL(/\/(dashboard|global\/universe|$)/);
    });
  });
});
