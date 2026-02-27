import { test, expect } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedScreenerData } from './helpers/seed-screener-data.helper';

test.describe('Screener Table', () => {
  let cleanup: () => Promise<void>;

  test.beforeEach(async ({ page }) => {
    // Seed test data for this test
    const seeder = await seedScreenerData();
    cleanup = seeder.cleanup;

    await login(page);
    await page.goto('/global/screener');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    // Clean up test data after each test for isolation
    if (cleanup) {
      await cleanup();
    }
  });

  test.describe('Data Display', () => {
    test('should display screener table', async ({ page }) => {
      const table = page.locator('[data-testid="screener-table"]');
      await expect(table).toBeVisible();
    });

    test('should display all required columns', async ({ page }) => {
      await expect(
        page.getByRole('columnheader', { name: 'Symbol' })
      ).toBeVisible();
      await expect(
        page.getByRole('columnheader', { name: 'Risk Group' })
      ).toBeVisible();
      await expect(
        page.getByRole('columnheader', { name: 'Has Volatility' })
      ).toBeVisible();
      await expect(
        page.getByRole('columnheader', { name: 'Objectives Understood' })
      ).toBeVisible();
      await expect(
        page.getByRole('columnheader', { name: 'Graph Higher Before 2008' })
      ).toBeVisible();
    });

    test('should display data rows', async ({ page }) => {
      const rows = page.locator('[data-testid="screener-table"] tbody tr');
      await expect(rows).not.toHaveCount(0);
    });

    test('should display symbols in sorted order', async ({ page }) => {
      const symbols = await page
        .locator('[data-testid="screener-table"] tbody tr td:first-child')
        .allTextContents();

      // Verify we have data
      expect(symbols.length).toBeGreaterThan(0);

      // Incomplete items (not all 3 checkboxes true) should be sorted alphabetically
      // Then complete items (all 3 checkboxes true) sorted alphabetically
      // Current test data has all incomplete items, so should be alphabetical
      const sortedSymbols = [...symbols].sort();
      expect(symbols).toEqual(sortedSymbols);
    });
  });

  test.describe('Risk Group Filtering', () => {
    test('should have risk group filter dropdown', async ({ page }) => {
      const dropdown = page.locator('[data-testid="risk-group-filter"]');
      await expect(dropdown).toBeVisible();
    });

    test('should show all risk group options', async ({ page }) => {
      const dropdown = page.locator('[data-testid="risk-group-filter"]');
      await dropdown.click();

      await expect(page.getByRole('option', { name: 'All' })).toBeVisible();
      await expect(
        page.getByRole('option', { name: 'Equities' })
      ).toBeVisible();
      await expect(
        page.getByRole('option', { name: 'Income', exact: true })
      ).toBeVisible();
      await expect(
        page.getByRole('option', { name: 'Tax Free Income' })
      ).toBeVisible();
    });

    test('should filter by risk group', async ({ page }) => {
      const dropdown = page.locator('[data-testid="risk-group-filter"]');
      await dropdown.click();
      await page.waitForTimeout(300); // Wait for dropdown animation

      await page.getByRole('option', { name: 'Equities' }).click();
      await page.waitForTimeout(500); // Wait for filter to apply

      // All visible rows should have "Equities" risk group
      const riskGroups = await page
        .locator('[data-testid="screener-table"] tbody tr td:nth-child(2)')
        .allTextContents();

      expect(riskGroups.length).toBeGreaterThan(0);
      for (const group of riskGroups) {
        expect(group).toContain('Equities');
      }
    });

    test('should show all data when "All" is selected', async ({ page }) => {
      const dropdown = page.locator('[data-testid="risk-group-filter"]');

      // First filter to something specific
      await dropdown.click();
      await page.waitForTimeout(300); // Wait for dropdown animation
      await page.getByRole('option', { name: 'Equities' }).click();
      await page.waitForTimeout(500); // Wait for filter to apply

      const filteredCount = await page
        .locator('[data-testid="screener-table"] tbody tr')
        .count();

      // Then select All
      await dropdown.click();
      await page.waitForTimeout(300); // Wait for dropdown animation
      await page.getByRole('option', { name: 'All' }).click();
      await page.waitForTimeout(500); // Wait for filter to apply

      const allCount = await page
        .locator('[data-testid="screener-table"] tbody tr')
        .count();

      // "All" should show at least as many items (could be equal if all items are in filtered group)
      expect(allCount).toBeGreaterThanOrEqual(filteredCount);
      // Also verify we have some data showing
      expect(allCount).toBeGreaterThan(0);
    });
  });
});
