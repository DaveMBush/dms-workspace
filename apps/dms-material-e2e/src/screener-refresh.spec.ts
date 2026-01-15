import { test, expect } from 'playwright/test';

import { login } from './helpers/login.helper';

test.describe('Screener Refresh', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/screener');
    await page.waitForLoadState('networkidle');
  });

  test('should have refresh button', async ({ page }) => {
    const button = page.locator('[data-testid="refresh-button"]');
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  });

  test('should show loading indicator during refresh', async ({ page }) => {
    // Mock the API to delay response so we can see the loading state
    await page.route('**/api/screener', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        json: { success: true, count: 100 },
      });
    });

    const button = page.locator('[data-testid="refresh-button"]');
    await button.click();

    // Check that global loading overlay appears
    const globalOverlay = page.locator('.fixed.inset-0.bg-black.bg-opacity-50');
    await expect(globalOverlay).toBeVisible();

    // Check that spinner appears in the overlay
    const spinner = globalOverlay.locator('mat-progress-spinner');
    await expect(spinner).toBeVisible();
  });

  test('should disable button during refresh', async ({ page }) => {
    // Mock the API to delay response
    await page.route('**/api/screener', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        json: { success: true, count: 100 },
      });
    });

    const button = page.locator('[data-testid="refresh-button"]');
    await button.click();

    // Button should be disabled while loading
    await expect(button).toBeDisabled();
  });

  test('should hide loading indicator after successful refresh', async ({
    page,
  }) => {
    // Mock successful API response
    await page.route('**/api/screener', async (route) => {
      await route.fulfill({
        status: 200,
        json: { success: true, count: 100 },
      });
    });

    const button = page.locator('[data-testid="refresh-button"]');
    await button.click();

    // Wait for loading to complete - global overlay should disappear
    const globalOverlay = page.locator('.fixed.inset-0.bg-black.bg-opacity-50');
    await expect(globalOverlay).not.toBeVisible({ timeout: 10000 });

    // Button should be re-enabled
    await expect(button).toBeEnabled();
  });

  test('should update table after successful refresh', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/screener', async (route) => {
      await route.fulfill({
        status: 200,
        json: { success: true, count: 100 },
      });
    });

    const button = page.locator('[data-testid="refresh-button"]');
    await button.click();

    // Wait for loading to complete
    const spinner = page.locator('[data-testid="loading-spinner"]');
    await expect(spinner).not.toBeVisible({ timeout: 10000 });

    // Verify table structure is present (table should reload/refresh)
    await expect(page.locator('dms-base-table')).toBeVisible();
  });

  test('should display error on failure', async ({ page }) => {
    // Mock API error response
    await page.route('**/api/screener', async (route) => {
      await route.fulfill({
        status: 500,
        json: { message: 'Scraper failed to fetch data' },
      });
    });

    const button = page.locator('[data-testid="refresh-button"]');
    await button.click();

    // Error message should be visible
    const error = page.locator('[data-testid="error-message"]');
    await expect(error).toBeVisible({ timeout: 10000 });
    await expect(error).toContainText('failed');
  });

  test('should allow retry after error', async ({ page }) => {
    // First request fails
    let requestCount = 0;
    await page.route('**/api/screener', async (route) => {
      requestCount++;
      if (requestCount === 1) {
        await route.fulfill({
          status: 500,
          json: { message: 'Scraper failed' },
        });
      } else {
        await route.fulfill({
          status: 200,
          json: { success: true, count: 100 },
        });
      }
    });

    const button = page.locator('[data-testid="refresh-button"]');
    await button.click();

    // Wait for error to appear
    const error = page.locator('[data-testid="error-message"]');
    await expect(error).toBeVisible({ timeout: 10000 });

    // Retry button should be visible
    const retryButton = page.locator('[data-testid="retry-button"]');
    await expect(retryButton).toBeVisible();

    // Click retry
    await retryButton.click();

    // Error should disappear after successful retry
    await expect(error).not.toBeVisible({ timeout: 10000 });
  });

  test('should clear previous error on new successful refresh', async ({
    page,
  }) => {
    // First request fails, second succeeds
    let requestCount = 0;
    await page.route('**/api/screener', async (route) => {
      requestCount++;
      if (requestCount === 1) {
        await route.fulfill({
          status: 500,
          json: { message: 'Server error' },
        });
      } else {
        await route.fulfill({
          status: 200,
          json: { success: true, count: 100 },
        });
      }
    });

    const button = page.locator('[data-testid="refresh-button"]');

    // First attempt - should fail
    await button.click();
    const error = page.locator('[data-testid="error-message"]');
    await expect(error).toBeVisible({ timeout: 10000 });

    // Second attempt - should succeed
    await button.click();
    await expect(error).not.toBeVisible({ timeout: 10000 });
  });

  test('should handle network timeout gracefully', async ({ page }) => {
    // Mock network timeout
    await page.route('**/api/screener', async (route) => {
      await route.abort('timedout');
    });

    const button = page.locator('[data-testid="refresh-button"]');
    await button.click();

    // Should show error for network failure
    const error = page.locator('[data-testid="error-message"]');
    await expect(error).toBeVisible({ timeout: 10000 });
  });
});
