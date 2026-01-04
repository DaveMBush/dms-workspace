import { test, expect } from 'playwright/test';

import { login } from './helpers/login.helper';

test.describe('Open Positions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Navigate to open positions tab
    await page.goto('/account/1677e04f-ef9b-4372-adb3-b740443088dc/open');
  });

  test('should display open positions table', async ({ page }) => {
    const table = page.locator('dms-base-table');
    await expect(table).toBeVisible();
  });

  test('should display table columns', async ({ page }) => {
    // Check for specific column headers
    const symbolHeader = page.getByRole('columnheader', { name: 'Symbol' });
    await expect(symbolHeader).toBeVisible();

    const quantityHeader = page.getByRole('columnheader', { name: 'Quantity' });
    await expect(quantityHeader).toBeVisible();

    const buyHeader = page.locator('th.mat-column-buy');
    await expect(buyHeader).toBeVisible();
  });

  test('should display add position button', async ({ page }) => {
    const addButton = page.locator('.content-panel button[mat-icon-button]', {
      hasText: 'add',
    });
    await expect(addButton).toBeVisible();
  });
});
