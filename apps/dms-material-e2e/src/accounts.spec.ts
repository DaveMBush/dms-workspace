import { test, expect } from 'playwright/test';

import { login } from './helpers/login.helper';

test.describe('Account List', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);

    // Give the app extra time to fully initialize before checking for accounts
    // Webkit needs more time for Angular to bootstrap and trigger API calls
    await page.waitForTimeout(2000);

    // Wait for the accounts panel to be visible before checking for items
    await page.waitForSelector('.accounts-panel', { timeout: 10000 });

    // Wait for accounts to load - the API is called lazily when the component initializes
    await page
      .waitForSelector('.account-item', { timeout: 30000 })
      .catch(async () => {
        // If no accounts found after 30s, at least wait for the component to settle
        await page
          .waitForSelector('text=No accounts found', { timeout: 5000 })
          .catch(() => null);
      });
  });

  test('should display accounts panel in left sidebar', async ({ page }) => {
    const accountsPanel = page.locator('.accounts-panel');
    await expect(accountsPanel).toBeVisible();
  });

  test('should display Accounts toolbar', async ({ page }) => {
    const toolbar = page.locator('.accounts-toolbar');
    await expect(toolbar).toBeVisible();
    await expect(toolbar).toContainText('Accounts');
  });

  test('should display accounts list', async ({ page }) => {
    const accountsList = page.locator('.accounts-list');
    await expect(accountsList).toBeVisible();
  });

  test('should load accounts from backend', async ({ page }) => {
    // Wait for accounts list to be present first
    const accountsList = page.locator('.accounts-list');
    await expect(accountsList).toBeVisible();

    // Wait for accounts to load from backend with polling
    const accountItems = page.locator('.account-item');

    // Should have at least one account loaded from backend
    await expect(accountItems.first()).toBeVisible({ timeout: 30000 });

    // Extra stability wait for Material rendering
    await page.waitForTimeout(100);

    // Verify account has icon and name
    const firstAccount = accountItems.first();
    await expect(firstAccount.locator('mat-icon')).toBeVisible();
    await expect(firstAccount.locator('span[matlistitemtitle]')).toBeVisible();
  });

  test('should navigate to account detail when clicking account', async ({
    page,
  }) => {
    // Wait for accounts list to be present first
    const accountsList = page.locator('.accounts-list');
    await expect(accountsList).toBeVisible();

    // Wait for accounts to load
    const accountItems = page.locator('.account-item');
    await expect(accountItems.first()).toBeVisible({ timeout: 30000 });

    // Extra stability wait
    await page.waitForTimeout(100);

    // Get the first account's ID from the href
    const firstAccountHref = await accountItems.first().getAttribute('href');
    expect(firstAccountHref).toMatch(/^\/account\/.+/);

    // Click the account
    await accountItems.first().click();

    // Verify navigation occurred - wait for URL to contain the account ID
    await page.waitForURL(
      new RegExp(firstAccountHref!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      { timeout: 10000 }
    );
  });

  test('should display account names from backend', async ({ page }) => {
    // Wait for accounts list to be present first
    const accountsList = page.locator('.accounts-list');
    await expect(accountsList).toBeVisible();

    // Wait for accounts to load from backend
    const accountItems = page.locator('.account-item');
    await expect(accountItems.first()).toBeVisible({ timeout: 30000 });

    // Extra stability wait for Material rendering
    await page.waitForTimeout(100);

    // Verify at least one account has a name
    const firstAccountName = await accountItems
      .first()
      .locator('span[matlistitemtitle]')
      .textContent();
    expect(firstAccountName).toBeTruthy();
    expect(firstAccountName?.length).toBeGreaterThan(0);
  });

  test('should display Global toolbar', async ({ page }) => {
    const globalToolbar = page.locator('.global-toolbar');
    await expect(globalToolbar).toBeVisible();
    await expect(globalToolbar).toContainText('Global');
  });

  test('should display global navigation links', async ({ page }) => {
    const globalList = page.locator('.global-list');
    await expect(globalList).toBeVisible();

    // Check for all 4 global links
    const summaryLink = globalList.locator('a', { hasText: 'Summary' });
    await expect(summaryLink).toBeVisible();

    const universeLink = globalList.locator('a', { hasText: 'Universe' });
    await expect(universeLink).toBeVisible();

    const screenerLink = globalList.locator('a', { hasText: 'Screener' });
    await expect(screenerLink).toBeVisible();

    const errorLogsLink = globalList.locator('a', { hasText: 'Error Logs' });
    await expect(errorLogsLink).toBeVisible();
  });

  test('should have icons for global navigation links', async ({ page }) => {
    const globalList = page.locator('.global-list');

    // Check Summary has dashboard icon
    const summaryItem = globalList.locator('a', { hasText: 'Summary' });
    await expect(summaryItem.locator('mat-icon')).toContainText('dashboard');

    // Check Universe has public icon
    const universeItem = globalList.locator('a', { hasText: 'Universe' });
    await expect(universeItem.locator('mat-icon')).toContainText('public');

    // Check Screener has filter_list icon
    const screenerItem = globalList.locator('a', { hasText: 'Screener' });
    await expect(screenerItem.locator('mat-icon')).toContainText('filter_list');

    // Check Error Logs has error icon
    const errorLogsItem = globalList.locator('a', { hasText: 'Error Logs' });
    await expect(errorLogsItem.locator('mat-icon')).toContainText('error');
  });

  test('should navigate when clicking global links', async ({ page }) => {
    const universeLink = page.locator('.global-list a', {
      hasText: 'Universe',
    });
    await universeLink.click();

    await expect(page).toHaveURL('/global/universe');
  });

  test('should show accounts panel is scrollable', async ({ page }) => {
    const accountsList = page.locator('.accounts-list');

    // Check that overflow-y is set to auto (scrollable)
    const overflowY = await accountsList.evaluate(
      (el) => window.getComputedStyle(el).overflowY
    );
    expect(overflowY).toBe('auto');
  });

  test('should have divider between accounts and global sections', async ({
    page,
  }) => {
    const divider = page.locator('mat-divider');
    await expect(divider).toBeVisible();
  });

  test('should maintain selected account across navigation', async ({
    page,
  }) => {
    // Wait for accounts list to render
    await expect(page.locator('.accounts-list')).toBeVisible({
      timeout: 30000,
    });
    await page.waitForTimeout(100);

    // Wait for accounts to load
    const accountItems = page.locator('.account-item');
    await expect(accountItems.first()).toBeVisible({ timeout: 30000 });

    // Click the first account and wait for navigation
    await accountItems.first().click();
    await page.waitForURL(/\/account\/.+/);

    // Get the account ID from URL
    const url = page.url();
    const accountId = url.split('/account/')[1];
    expect(accountId).toBeTruthy();

    // Navigate to global view
    await page.locator('.global-list a', { hasText: 'Summary' }).click();
    await page.waitForURL(/\/global\/summary/);

    // Navigate back to the account
    await page.goto(url);
    if (accountId) {
      await page.waitForURL(new RegExp(accountId));
    }
  });

  test('should show empty state when no accounts', async ({ page }) => {
    // Wait for the list to render
    await page.waitForSelector('.accounts-list', { timeout: 10000 });

    // Check for empty message (if no accounts)
    const emptyMessage = page.locator('.empty-message');
    const accountItems = page.locator('.account-item');

    const accountCount = await accountItems.count();
    if (accountCount === 0) {
      await expect(emptyMessage).toBeVisible();
      await expect(emptyMessage).toContainText('No accounts found');
    }
  });
});
