import { test, expect } from 'playwright/test';

import { login } from './helpers/login.helper';

/**
 * Universe Update E2E Tests (TDD - RED Phase)
 *
 * These tests are written following TDD principles - they verify the expected
 * behavior but are currently disabled (.skip) as part of the RED phase.
 * Story AK.6 will refine the implementation to make these tests pass (GREEN phase).
 *
 * Test Coverage:
 * - Universe sync button interaction
 * - Global loading overlay display during operation
 * - Success notification with accurate symbol count
 * - Error notification on sync failure
 * - Edge cases (concurrent operations, button state)
 */

test.describe.skip('Universe Update Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Update Button', () => {
    test('should trigger universe sync when update button is clicked', async ({
      page,
    }) => {
      let syncCallCount = 0;

      // Mock the API endpoint to track calls
      await page.route('**/api/universe/sync-from-screener', async (route) => {
        syncCallCount++;
        await route.fulfill({
          status: 200,
          json: { success: true, count: 42 },
        });
      });

      const button = page.locator('[data-testid="update-universe-button"]');
      await button.click();

      // Wait for operation to complete
      await page.waitForTimeout(2000);

      // Should have called the API once
      expect(syncCallCount).toBe(1);
    });

    test('should have update button visible and enabled initially', async ({
      page,
    }) => {
      const button = page.locator('[data-testid="update-universe-button"]');
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();
    });

    test('should disable button during sync operation', async ({ page }) => {
      // Mock API with delay to test button state during operation
      await page.route('**/api/universe/sync-from-screener', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          json: { success: true, count: 42 },
        });
      });

      const button = page.locator('[data-testid="update-universe-button"]');
      await button.click();

      // Button should be disabled during sync
      await expect(button).toBeDisabled();
    });

    test('should re-enable button after sync completes', async ({ page }) => {
      // Mock successful API response
      await page.route('**/api/universe/sync-from-screener', async (route) => {
        await route.fulfill({
          status: 200,
          json: { success: true, count: 42 },
        });
      });

      const button = page.locator('[data-testid="update-universe-button"]');
      await button.click();

      // Wait for operation to complete
      await page.waitForTimeout(2000);

      // Button should be re-enabled
      await expect(button).toBeEnabled();
    });
  });

  test.describe('Loading States', () => {
    test('should show global loading overlay when sync starts', async ({
      page,
    }) => {
      // Mock API with delay to observe loading state
      await page.route('**/api/universe/sync-from-screener', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          json: { success: true, count: 42 },
        });
      });

      const button = page.locator('[data-testid="update-universe-button"]');
      await button.click();

      // Global loading overlay should appear
      const overlay = page.locator('.fixed.inset-0.bg-black.bg-opacity-50');
      await expect(overlay).toBeVisible();

      // Spinner should be visible in overlay
      const spinner = overlay.locator('mat-progress-spinner');
      await expect(spinner).toBeVisible();
    });

    test('should display loading message during sync', async ({ page }) => {
      // Mock API with delay
      await page.route('**/api/universe/sync-from-screener', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          json: { success: true, count: 42 },
        });
      });

      const button = page.locator('[data-testid="update-universe-button"]');
      await button.click();

      // Loading overlay should contain message
      const overlay = page.locator('.fixed.inset-0.bg-black.bg-opacity-50');
      await expect(overlay).toBeVisible();
      await expect(overlay).toContainText('Updating universe from screener');
    });

    test('should hide loading overlay after successful sync', async ({
      page,
    }) => {
      // Mock successful API response
      await page.route('**/api/universe/sync-from-screener', async (route) => {
        await route.fulfill({
          status: 200,
          json: { success: true, count: 42 },
        });
      });

      const button = page.locator('[data-testid="update-universe-button"]');
      await button.click();

      // Wait for loading to complete
      const overlay = page.locator('.fixed.inset-0.bg-black.bg-opacity-50');
      await expect(overlay).not.toBeVisible({ timeout: 10000 });
    });

    test('should hide loading overlay after sync error', async ({ page }) => {
      // Mock API error response
      await page.route('**/api/universe/sync-from-screener', async (route) => {
        await route.fulfill({
          status: 500,
          json: { error: 'Internal server error' },
        });
      });

      const button = page.locator('[data-testid="update-universe-button"]');
      await button.click();

      // Wait for loading to complete even on error
      const overlay = page.locator('.fixed.inset-0.bg-black.bg-opacity-50');
      await expect(overlay).not.toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Success Notifications', () => {
    test('should display success notification on successful sync', async ({
      page,
    }) => {
      // Mock successful API response
      await page.route('**/api/universe/sync-from-screener', async (route) => {
        await route.fulfill({
          status: 200,
          json: { success: true, count: 42 },
        });
      });

      const button = page.locator('[data-testid="update-universe-button"]');
      await button.click();

      // Wait for and verify success notification
      const snackbar = page.locator('mat-snack-bar-container');
      await expect(snackbar).toBeVisible({ timeout: 10000 });

      // Should be success styling (green/success class)
      await expect(page.locator('.snackbar-success')).toBeVisible();
    });

    test('should display symbol count in success notification', async ({
      page,
    }) => {
      const expectedCount = 42;

      // Mock successful API response with specific count
      await page.route('**/api/universe/sync-from-screener', async (route) => {
        await route.fulfill({
          status: 200,
          json: { success: true, count: expectedCount },
        });
      });

      const button = page.locator('[data-testid="update-universe-button"]');
      await button.click();

      const snackbar = page.locator('mat-snack-bar-container');
      await expect(snackbar).toBeVisible({ timeout: 10000 });

      // Notification should contain the count
      await expect(snackbar).toContainText(expectedCount.toString());
      await expect(snackbar).toContainText('symbols');
    });

    test('should display accurate count for different response values', async ({
      page,
    }) => {
      const testCounts = [1, 10, 100, 250];

      for (const count of testCounts) {
        // Remove previous handler to avoid accumulation
        await page.unroute('**/api/universe/sync-from-screener');

        // Mock API with specific count
        await page.route(
          '**/api/universe/sync-from-screener',
          async (route) => {
            await route.fulfill({
              status: 200,
              json: { success: true, count },
            });
          }
        );

        const button = page.locator('[data-testid="update-universe-button"]');
        await button.click();

        const snackbar = page.locator('mat-snack-bar-container');
        await expect(snackbar).toBeVisible({ timeout: 10000 });
        await expect(snackbar).toContainText(count.toString());

        // Close notification before next iteration
        const closeButton = snackbar.locator('button');
        if (await closeButton.isVisible()) {
          await closeButton.click();
          await expect(snackbar).not.toBeVisible({ timeout: 5000 });
        }

        // Wait a moment between tests
        await page.waitForTimeout(500);
      }
    });

    test('should have close button in success notification', async ({
      page,
    }) => {
      // Mock successful API response
      await page.route('**/api/universe/sync-from-screener', async (route) => {
        await route.fulfill({
          status: 200,
          json: { success: true, count: 42 },
        });
      });

      const button = page.locator('[data-testid="update-universe-button"]');
      await button.click();

      const snackbar = page.locator('mat-snack-bar-container');
      await expect(snackbar).toBeVisible({ timeout: 10000 });

      // Close button should be present
      const closeButton = snackbar.locator('button');
      await expect(closeButton).toBeVisible();
    });

    test('should dismiss success notification when close button clicked', async ({
      page,
    }) => {
      // Mock successful API response
      await page.route('**/api/universe/sync-from-screener', async (route) => {
        await route.fulfill({
          status: 200,
          json: { success: true, count: 42 },
        });
      });

      const button = page.locator('[data-testid="update-universe-button"]');
      await button.click();

      const snackbar = page.locator('mat-snack-bar-container');
      await expect(snackbar).toBeVisible({ timeout: 10000 });

      // Click close button
      const closeButton = snackbar.locator('button');
      await closeButton.click();

      // Notification should disappear
      await expect(snackbar).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Error Notifications', () => {
    test('should display error notification on sync failure', async ({
      page,
    }) => {
      // Mock API error response
      await page.route('**/api/universe/sync-from-screener', async (route) => {
        await route.fulfill({
          status: 500,
          json: { error: 'Internal server error' },
        });
      });

      const button = page.locator('[data-testid="update-universe-button"]');
      await button.click();

      // Wait for and verify error notification
      const snackbar = page.locator('mat-snack-bar-container');
      await expect(snackbar).toBeVisible({ timeout: 10000 });

      // Should be error styling (red/error class)
      await expect(page.locator('.snackbar-error')).toBeVisible();
    });

    test('should display error message in notification', async ({ page }) => {
      // Mock API error response
      await page.route('**/api/universe/sync-from-screener', async (route) => {
        await route.fulfill({
          status: 500,
          json: { error: 'Internal server error' },
        });
      });

      const button = page.locator('[data-testid="update-universe-button"]');
      await button.click();

      const snackbar = page.locator('mat-snack-bar-container');
      await expect(snackbar).toBeVisible({ timeout: 10000 });

      // Should contain error message
      await expect(snackbar).toContainText('error');
    });

    test('should have close button in error notification', async ({ page }) => {
      // Mock API error response
      await page.route('**/api/universe/sync-from-screener', async (route) => {
        await route.fulfill({
          status: 500,
          json: { error: 'Internal server error' },
        });
      });

      const button = page.locator('[data-testid="update-universe-button"]');
      await button.click();

      const snackbar = page.locator('mat-snack-bar-container');
      await expect(snackbar).toBeVisible({ timeout: 10000 });

      // Close button should be present
      const closeButton = snackbar.locator('button');
      await expect(closeButton).toBeVisible();
    });

    test('should dismiss error notification when close button clicked', async ({
      page,
    }) => {
      // Mock API error response
      await page.route('**/api/universe/sync-from-screener', async (route) => {
        await route.fulfill({
          status: 500,
          json: { error: 'Internal server error' },
        });
      });

      const button = page.locator('[data-testid="update-universe-button"]');
      await button.click();

      const snackbar = page.locator('mat-snack-bar-container');
      await expect(snackbar).toBeVisible({ timeout: 10000 });

      // Click close button
      const closeButton = snackbar.locator('button');
      await closeButton.click();

      // Notification should disappear
      await expect(snackbar).not.toBeVisible({ timeout: 5000 });
    });

    test('should handle network timeout gracefully', async ({ page }) => {
      // Mock API with network timeout
      await page.route('**/api/universe/sync-from-screener', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.abort('timedout');
      });

      const button = page.locator('[data-testid="update-universe-button"]');
      await button.click();

      // Should show error notification
      const snackbar = page.locator('mat-snack-bar-container');
      await expect(snackbar).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.snackbar-error')).toBeVisible();
    });

    test('should handle different HTTP error codes', async ({ page }) => {
      const errorCodes = [400, 401, 403, 404, 500, 502, 503];

      for (const statusCode of errorCodes) {
        // Remove previous handler to avoid accumulation
        await page.unroute('**/api/universe/sync-from-screener');

        // Mock API with specific error code
        await page.route(
          '**/api/universe/sync-from-screener',
          async (route) => {
            await route.fulfill({
              status: statusCode,
              json: { error: `Error ${statusCode}` },
            });
          }
        );

        const button = page.locator('[data-testid="update-universe-button"]');
        await button.click();

        // Should show error notification
        const snackbar = page.locator('mat-snack-bar-container');
        await expect(snackbar).toBeVisible({ timeout: 10000 });
        await expect(page.locator('.snackbar-error')).toBeVisible();

        // Close notification before next iteration
        const closeButton = snackbar.locator('button');
        if (await closeButton.isVisible()) {
          await closeButton.click();
          await expect(snackbar).not.toBeVisible({ timeout: 5000 });
        }

        // Wait a moment between tests
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Edge Cases', () => {
    test('should prevent concurrent sync operations', async ({ page }) => {
      let syncCallCount = 0;

      // Mock API with delay
      await page.route('**/api/universe/sync-from-screener', async (route) => {
        syncCallCount++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          json: { success: true, count: 42 },
        });
      });

      const button = page.locator('[data-testid="update-universe-button"]');

      // Click multiple times rapidly
      await button.click();
      await page.waitForTimeout(100);
      await button.click();
      await page.waitForTimeout(100);
      await button.click();

      // Wait for operation to complete
      await page.waitForTimeout(2000);

      // Should only have called API once (concurrent clicks prevented)
      expect(syncCallCount).toBe(1);
    });

    test('should handle empty response gracefully', async ({ page }) => {
      // Mock API with empty/invalid response
      await page.route('**/api/universe/sync-from-screener', async (route) => {
        await route.fulfill({
          status: 200,
          json: {},
        });
      });

      const button = page.locator('[data-testid="update-universe-button"]');
      await button.click();

      // Should either show error or success notification (implementation detail)
      const snackbar = page.locator('mat-snack-bar-container');
      await expect(snackbar).toBeVisible({ timeout: 10000 });
    });

    test('should maintain button state across page interactions', async ({
      page,
    }) => {
      // Mock successful API response
      await page.route('**/api/universe/sync-from-screener', async (route) => {
        await route.fulfill({
          status: 200,
          json: { success: true, count: 42 },
        });
      });

      const button = page.locator('[data-testid="update-universe-button"]');

      // Click and wait for completion
      await button.click();
      await page.waitForTimeout(2000);

      // Button should be back to enabled state
      await expect(button).toBeEnabled();

      // Should be able to click again
      await button.click();
      await page.waitForTimeout(2000);

      await expect(button).toBeEnabled();
    });

    test('should display accurate symbol count in notification', async ({
      page,
    }) => {
      const expectedCount = 42;

      await page.route('**/api/universe/sync-from-screener', async (route) => {
        await route.fulfill({
          status: 200,
          json: { success: true, count: expectedCount },
        });
      });

      const button = page.locator('[data-testid="update-universe-button"]');
      await button.click();

      const notification = page.locator(
        '.notification-success, [role="alert"]'
      );
      await expect(notification).toBeVisible({ timeout: 5000 });
      await expect(notification).toContainText(expectedCount.toString());
    });
  });
});
