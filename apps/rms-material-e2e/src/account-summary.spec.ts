import { test, expect } from 'playwright/test';

import { login } from './helpers/login.helper';

test.describe('Account Summary', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Navigate to a specific account (summary is default tab)
    await page.goto('/account/1677e04f-ef9b-4372-adb3-b740443088dc');
  });

  test('should display allocation pie chart', async ({ page }) => {
    const pieChart = page.locator('canvas').first(); // Assuming ng2-charts uses canvas
    await expect(pieChart).toBeVisible();
  });

  test('should display performance line chart', async ({ page }) => {
    const lineChart = page.locator('canvas').nth(1);
    await expect(lineChart).toBeVisible();
  });

  test('should display total value statistic', async ({ page }) => {
    const totalValue = page.locator('.total-value'); // Adjust selector based on actual implementation
    await expect(totalValue).toBeVisible();
    await expect(totalValue).toContainText('$'); // Assuming it shows currency
  });
});
