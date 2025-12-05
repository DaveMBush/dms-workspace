import { test, expect } from '@playwright/test';

import { login } from './helpers/login.helper';

test.describe('Account List', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
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
});
