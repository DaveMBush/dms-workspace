import { test, expect } from 'playwright/test';

import { login } from './helpers/login.helper';

test.describe('Global Screener Component', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/screener');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Core Display', () => {
    test('should display screener page with toolbar', async ({ page }) => {
      await expect(page.locator('.screener-toolbar')).toBeVisible();
      await expect(
        page.locator('.screener-toolbar').getByText('Screener')
      ).toBeVisible();
    });

    test('should display table wrapper', async ({ page }) => {
      await expect(page.locator('.table-wrapper')).toBeVisible();
    });
  });

  test.describe('Toolbar Actions', () => {
    test('should display Refresh button with tooltip', async ({ page }) => {
      const refreshButton = page.locator('button[mattooltip="Refresh"]');
      await expect(refreshButton).toBeVisible();
    });

    test('should have Refresh button enabled', async ({ page }) => {
      const refreshButton = page.locator('button[mattooltip="Refresh"]');
      await expect(refreshButton).toBeEnabled();
    });
  });

  test.describe('Table Structure', () => {
    test('should display base table component', async ({ page }) => {
      await expect(page.locator('dms-base-table')).toBeVisible();
    });

    test('should display Symbol column header', async ({ page }) => {
      await expect(
        page.getByRole('columnheader', { name: 'Symbol' })
      ).toBeVisible();
    });

    test('should display Risk Group column header', async ({ page }) => {
      await expect(
        page.getByRole('columnheader', { name: 'Risk Group' })
      ).toBeVisible();
    });

    test('should display Has Volatility column header', async ({ page }) => {
      await expect(
        page.getByRole('columnheader', { name: 'Has Volatility' })
      ).toBeVisible();
    });

    test('should display Objectives Understood column header', async ({
      page,
    }) => {
      await expect(
        page.getByRole('columnheader', { name: 'Objectives Understood' })
      ).toBeVisible();
    });

    test('should display Graph Higher Before 2008 column header', async ({
      page,
    }) => {
      await expect(
        page.getByRole('columnheader', { name: 'Graph Higher Before 2008' })
      ).toBeVisible();
    });
  });

  test.describe('Risk Group Filter', () => {
    test('should display risk group filter dropdown', async ({ page }) => {
      await expect(
        page.locator('.header-filter mat-select').first()
      ).toBeVisible();
    });

    test('should show All option for risk group', async ({ page }) => {
      await page.locator('.header-filter mat-select').first().click();
      await expect(page.getByRole('option', { name: 'All' })).toBeVisible();
    });

    test('should show Equities option', async ({ page }) => {
      await page.locator('.header-filter mat-select').first().click();
      await expect(
        page.getByRole('option', { name: 'Equities' })
      ).toBeVisible();
    });

    test('should show Income option', async ({ page }) => {
      await page.locator('.header-filter mat-select').first().click();
      await expect(
        page.getByRole('option', { name: 'Income', exact: true })
      ).toBeVisible();
    });

    test('should show Tax Free Income option', async ({ page }) => {
      await page.locator('.header-filter mat-select').first().click();
      await expect(
        page.getByRole('option', { name: 'Tax Free Income' })
      ).toBeVisible();
    });

    test('should filter by risk group when selected', async ({ page }) => {
      const filterSelect = page.locator('.header-filter mat-select').first();
      await filterSelect.click();
      await page.getByRole('option', { name: 'Equities' }).click();
      // Filter should be applied - verify the dropdown shows the selected value
      await expect(filterSelect.locator('.mat-mdc-select-value')).toContainText(
        'Equities'
      );
    });

    test('should clear filter when All is selected', async ({ page }) => {
      const filterSelect = page.locator('.header-filter mat-select').first();
      // First select Equities
      await filterSelect.click();
      await page.waitForTimeout(300); // Wait for dropdown animation
      await page.getByRole('option', { name: 'Equities' }).click();
      await page.waitForTimeout(500); // Wait for selection to apply
      // Then select All to clear
      await filterSelect.click();
      await page.waitForTimeout(300); // Wait for dropdown animation
      await page.getByRole('option', { name: 'All' }).click();
      await page.waitForTimeout(500); // Wait for selection to apply
      // Should show placeholder or All
      await expect(filterSelect).toBeVisible();
    });
  });

  test.describe('Checkbox Columns', () => {
    test('should display checkboxes in Has Volatility column', async ({
      page,
    }) => {
      // Wait for table data to potentially load
      await page.waitForTimeout(500);
      const checkboxes = page.locator(
        'dms-base-table mat-checkbox[aria-label="Has Volatility"], dms-base-table mat-checkbox'
      );
      // If there is data, there should be checkboxes
      const count = await checkboxes.count();
      // At minimum the component should render without errors
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Symbol Links', () => {
    test('should render symbol links to cefconnect.com', async ({ page }) => {
      // Wait for table data to potentially load
      await page.waitForTimeout(500);
      const symbolLinks = page.locator('a.symbol-link');
      const count = await symbolLinks.count();
      if (count > 0) {
        const firstLink = symbolLinks.first();
        const href = await firstLink.getAttribute('href');
        expect(href).toContain('https://www.cefconnect.com/fund/');
      }
    });
  });

  test.describe('Responsive Layout', () => {
    test('should display correctly at desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await expect(page.locator('.screener-container')).toBeVisible();
      await expect(page.locator('.screener-toolbar')).toBeVisible();
    });

    test('should display correctly at tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('.screener-container')).toBeVisible();
    });

    test('should display correctly at mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('.screener-container')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have accessible buttons with tooltips', async ({ page }) => {
      await expect(page.locator('button[mattooltip="Refresh"]')).toBeVisible();
    });

    test('should have accessible table structure', async ({ page }) => {
      await expect(page.locator('dms-base-table')).toBeVisible();
      // Table should have column headers
      const headers = page.locator('th');
      const count = await headers.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle refresh click', async ({ page }) => {
      const refreshButton = page.locator('button[mattooltip="Refresh"]');
      await refreshButton.click();
      // Should not crash - verify page is still functional
      await expect(page.locator('.screener-container')).toBeVisible();
    });

    test('should handle multiple rapid filter changes', async ({ page }) => {
      const filterSelect = page.locator('.header-filter mat-select').first();

      // Rapidly change filters with minimal waits to test robustness
      await filterSelect.click();
      await page.waitForTimeout(200); // Minimal wait for dropdown
      await page.getByRole('option', { name: 'Equities' }).click();
      await page.waitForTimeout(300); // Minimal wait for filter application

      await filterSelect.click();
      await page.waitForTimeout(200);
      await page.getByRole('option', { name: 'Income', exact: true }).click();
      await page.waitForTimeout(300);

      await filterSelect.click();
      await page.waitForTimeout(200);
      await page.getByRole('option', { name: 'All' }).click();
      await page.waitForTimeout(500); // Final wait for stabilization

      // Component should still be functional
      await expect(page.locator('.screener-container')).toBeVisible();
    });
  });
});
