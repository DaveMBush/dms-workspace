import { test, expect } from 'playwright/test';

import { login } from './helpers/login.helper';

test.describe('Global Universe Component', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Core Display', () => {
    test('should display universe page with toolbar', async ({ page }) => {
      await expect(page.locator('.universe-toolbar')).toBeVisible();
      await expect(
        page.locator('.universe-toolbar').getByText('Universe')
      ).toBeVisible();
    });

    test('should display table wrapper', async ({ page }) => {
      await expect(page.locator('.table-wrapper')).toBeVisible();
    });

    test('should display account selector in toolbar', async ({ page }) => {
      await expect(
        page.locator('.universe-toolbar mat-form-field mat-select')
      ).toBeVisible();
    });
  });

  test.describe('Toolbar Actions', () => {
    test('should display Add Symbol button with tooltip', async ({ page }) => {
      const addButton = page.locator('button[mattooltip="Add Symbol"]');
      await expect(addButton).toBeVisible();
    });

    test('should display Update Universe button with tooltip', async ({
      page,
    }) => {
      const syncButton = page.locator('button[mattooltip="Update Universe"]');
      await expect(syncButton).toBeVisible();
    });

    test('should display Update Fields button with tooltip', async ({
      page,
    }) => {
      const updateButton = page.locator('button[mattooltip="Update Fields"]');
      await expect(updateButton).toBeVisible();
    });

    test('should have Update Universe button enabled', async ({ page }) => {
      const syncButton = page.locator('button[mattooltip="Update Universe"]');
      await expect(syncButton).toBeEnabled();
    });

    test('should have Update Fields button enabled', async ({ page }) => {
      const updateButton = page.locator('button[mattooltip="Update Fields"]');
      await expect(updateButton).toBeEnabled();
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

    test('should display Distribution column header', async ({ page }) => {
      await expect(
        page.getByRole('columnheader', { name: 'Distribution' })
      ).toBeVisible();
    });

    test('should display Yield column header', async ({ page }) => {
      await expect(
        page.getByRole('columnheader', { name: 'Yield %', exact: true })
      ).toBeVisible();
    });

    test('should display Ex-Date column header', async ({ page }) => {
      await expect(
        page.getByRole('columnheader', { name: 'Ex-Date' })
      ).toBeVisible();
    });

    test('should display Actions column header', async ({ page }) => {
      await expect(
        page.getByRole('columnheader', { name: 'Actions' })
      ).toBeVisible();
    });
  });

  test.describe('Filter Row in Header', () => {
    test('should display symbol filter input in header', async ({ page }) => {
      await expect(
        page.locator('input[placeholder="Search Symbol"]')
      ).toBeVisible();
    });

    test('should display min yield filter input in header', async ({
      page,
    }) => {
      await expect(
        page.locator('input[placeholder="Min Yield %"]')
      ).toBeVisible();
    });

    test('should filter by symbol', async ({ page }) => {
      const symbolInput = page.locator('input[placeholder="Search Symbol"]');
      await symbolInput.fill('AAPL');
      await expect(symbolInput).toHaveValue('AAPL');
    });
  });

  test.describe('Account Selection', () => {
    test('should open account dropdown when clicked', async ({ page }) => {
      await page.locator('.universe-toolbar mat-form-field mat-select').click();
      await expect(page.locator('mat-option').first()).toBeVisible();
    });

    test('should show All Accounts option', async ({ page }) => {
      await page.locator('.universe-toolbar mat-form-field mat-select').click();
      await expect(
        page.getByRole('option', { name: 'All Accounts' })
      ).toBeVisible();
    });
  });

  test.describe('Risk Group Filter', () => {
    test('should show All option for risk group', async ({ page }) => {
      const riskGroupSelect = page.locator('.filter-row mat-select').first();
      await riskGroupSelect.click();
      await expect(page.getByRole('option', { name: 'All' })).toBeVisible();
    });

    test('should show Equities option', async ({ page }) => {
      const riskGroupSelect = page.locator('.filter-row mat-select').first();
      await riskGroupSelect.click();
      await expect(
        page.getByRole('option', { name: 'Equities' })
      ).toBeVisible();
    });

    test('should show Income option', async ({ page }) => {
      const riskGroupSelect = page.locator('.filter-row mat-select').first();
      await riskGroupSelect.click();
      await expect(
        page.getByRole('option', { name: 'Income', exact: true })
      ).toBeVisible();
    });
  });

  test.describe('Expired Filter', () => {
    test('should show All option for expired filter', async ({ page }) => {
      const expiredSelect = page.locator('.filter-row mat-select').last();
      await expiredSelect.click();
      await expect(page.getByRole('option', { name: 'All' })).toBeVisible();
    });

    test('should show Yes option', async ({ page }) => {
      const expiredSelect = page.locator('.filter-row mat-select').last();
      await expiredSelect.click();
      await expect(page.getByRole('option', { name: 'Yes' })).toBeVisible();
    });

    test('should show No option', async ({ page }) => {
      const expiredSelect = page.locator('.filter-row mat-select').last();
      await expiredSelect.click();
      await expect(page.getByRole('option', { name: 'No' })).toBeVisible();
    });
  });

  test.describe('Responsive Layout', () => {
    test('should display correctly at desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await expect(page.locator('.universe-container')).toBeVisible();
      await expect(page.locator('.universe-toolbar')).toBeVisible();
    });

    test('should display correctly at tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('.universe-container')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have accessible filter inputs', async ({ page }) => {
      const symbolInput = page.locator('input[placeholder="Search Symbol"]');
      await expect(symbolInput).toBeVisible();
    });

    test('should have accessible buttons with tooltips', async ({ page }) => {
      await expect(
        page.locator('button[mattooltip="Add Symbol"]')
      ).toBeVisible();
      await expect(
        page.locator('button[mattooltip="Update Universe"]')
      ).toBeVisible();
      await expect(
        page.locator('button[mattooltip="Update Fields"]')
      ).toBeVisible();
    });
  });
});
