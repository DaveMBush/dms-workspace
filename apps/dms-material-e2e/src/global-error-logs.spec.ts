import { test, expect } from 'playwright/test';

import { login } from './helpers/login.helper';

test.describe('Global Error Logs Component', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/error-logs');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Core Functionality', () => {
    test('should display error logs page', async ({ page }) => {
      const errorCard = page.locator('mat-card');
      await errorCard.waitFor({ state: 'attached' });
      await expect(errorCard).toBeVisible({ timeout: 10000 });
    });

    test('should display page title', async ({ page }) => {
      await expect(page.locator('mat-card-title h1')).toHaveText('Error Logs');
    });

    test('should display error logs table', async ({ page }) => {
      const table = page.locator('table[mat-table]');
      await expect(table).toBeVisible();
    });

    test('should display pagination controls', async ({ page }) => {
      const paginator = page.locator('mat-paginator');
      await expect(paginator).toBeVisible();
    });

    test('should display filter controls', async ({ page }) => {
      await expect(
        page.getByRole('combobox', { name: 'All Files' })
      ).toBeVisible();
      await expect(
        page.getByRole('combobox', { name: 'All Levels' })
      ).toBeVisible();
      await expect(page.getByPlaceholder('mm/dd/yyyy').first()).toBeVisible();
      await expect(page.getByPlaceholder('Search messages...')).toBeVisible();
    });

    test('should display table headers', async ({ page }) => {
      const headers = [
        'Timestamp',
        'Level',
        'Message',
        'Request ID',
        'User ID',
        'Context',
      ];

      for (const header of headers) {
        await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
      }
    });
  });

  test.describe('Pagination', () => {
    test('should have page size options', async ({ page }) => {
      const pageSizeSelect = page.locator(
        'mat-paginator .mat-mdc-paginator-page-size-select'
      );
      await expect(pageSizeSelect).toBeVisible();
    });

    test('should display navigation buttons', async ({ page }) => {
      const nextButton = page.locator(
        'mat-paginator button[aria-label*="Next"]'
      );
      const previousButton = page.locator(
        'mat-paginator button[aria-label*="Previous"]'
      );
      await expect(nextButton).toBeVisible();
      await expect(previousButton).toBeVisible();
    });
  });

  test.describe('Layout & Styling', () => {
    test('should have proper card styling', async ({ page }) => {
      const card = page.locator('mat-card').first();
      await expect(card).toBeVisible();

      const boundingBox = await card.boundingBox();
      expect(boundingBox?.height).toBeGreaterThan(0);
      expect(boundingBox?.width).toBeGreaterThan(0);
    });

    test('should have toolbar styled correctly', async ({ page }) => {
      const toolbar = page.locator('.filter-toolbar');
      await expect(toolbar).toBeVisible();
    });

    test('should maintain layout on different screen sizes', async ({
      page,
    }) => {
      // Test on desktop
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(300);

      let table = page.locator('table[mat-table]');
      await expect(table).toBeVisible();

      // Test on tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(300);

      table = page.locator('table[mat-table]');
      await expect(table).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have accessible table structure', async ({ page }) => {
      const table = page.locator('table[mat-table]');
      await expect(table).toBeVisible();

      // Verify table has headers
      const headers = table.locator('th');
      await expect(headers).toHaveCount(6);
    });

    test('should have navigation context', ({ page }) => {
      const currentUrl = page.url();
      expect(currentUrl).toContain('/global/error-logs');
    });
  });
});
