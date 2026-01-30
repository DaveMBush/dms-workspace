import { test, expect } from 'playwright/test';

import { login } from './helpers/login.helper';

/**
 * Update Fields E2E Tests (TDD - GREEN Phase)
 *
 * These tests verify the expected behavior of the Update Fields flow.
 * Story AL.5 wrote these tests (RED phase).
 * Story AL.6 refines implementation to make tests pass (GREEN phase).
 *
 * Test Coverage:
 * - Update Fields button interaction
 * - Global loading overlay display during operation
 * - Success notification with accurate update count
 * - Error notification on update failure
 * - Edge cases (concurrent operations, button state)
 */

/**
 * Helper to create mock UpdateFieldsResponse
 * Matches the actual API response format
 */
function createMockUpdateResponse(updated: number) {
  return {
    updated,
    correlationId: 'test-correlation-id',
    logFilePath: 'test-update.log',
  };
}

test.describe('Update Fields Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Update Button', () => {
    test('should trigger field update when button clicked', async ({
      page,
    }) => {
      let updateCallCount = 0;

      await page.route('**/api/settings/update', async (route) => {
        updateCallCount++;
        await route.fulfill({
          status: 200,
          json: createMockUpdateResponse(10),
        });
      });

      const button = page.locator('[data-testid="update-fields-button"]');
      await button.click();

      await page.waitForTimeout(2000);
      expect(updateCallCount).toBe(1);
    });

    test('should disable button during update', async ({ page }) => {
      await page.route('**/api/settings/update', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          json: createMockUpdateResponse(10),
        });
      });

      const button = page.locator('[data-testid="update-fields-button"]');
      await button.click();

      await expect(button).toBeDisabled();
    });

    test('should re-enable button after update completes', async ({ page }) => {
      await page.route('**/api/settings/update', async (route) => {
        await route.fulfill({
          status: 200,
          json: createMockUpdateResponse(10),
        });
      });

      const button = page.locator('[data-testid="update-fields-button"]');
      await button.click();

      await page.waitForTimeout(2000);
      await expect(button).toBeEnabled();
    });
  });

  test.describe('Loading States', () => {
    test('should show global loading overlay', async ({ page }) => {
      await page.route('**/api/settings/update', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          json: createMockUpdateResponse(10),
        });
      });

      const button = page.locator('[data-testid="update-fields-button"]');
      await button.click();

      const overlay = page.locator('.fixed.inset-0.bg-black.bg-opacity-50');
      await expect(overlay).toBeVisible();
      await expect(overlay).toContainText('Updating universe fields');
    });

    test('should hide loading overlay after completion', async ({ page }) => {
      await page.route('**/api/settings/update', async (route) => {
        await route.fulfill({
          status: 200,
          json: createMockUpdateResponse(10),
        });
      });

      const button = page.locator('[data-testid="update-fields-button"]');
      await button.click();

      const overlay = page.locator('.fixed.inset-0.bg-black.bg-opacity-50');
      await expect(overlay).not.toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Success Notifications', () => {
    test('should display success notification', async ({ page }) => {
      await page.route('**/api/settings/update', async (route) => {
        await route.fulfill({
          status: 200,
          json: createMockUpdateResponse(10),
        });
      });

      const button = page.locator('[data-testid="update-fields-button"]');
      await button.click();

      const snackbar = page.locator('mat-snack-bar-container');
      await expect(snackbar).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.snackbar-success')).toBeVisible();
    });

    test('should display update count in notification', async ({ page }) => {
      await page.route('**/api/settings/update', async (route) => {
        await route.fulfill({
          status: 200,
          json: createMockUpdateResponse(25),
        });
      });

      const button = page.locator('[data-testid="update-fields-button"]');
      await button.click();

      const snackbar = page.locator('mat-snack-bar-container');
      await expect(snackbar).toBeVisible({ timeout: 10000 });
      await expect(snackbar).toContainText(
        'Universe fields updated: 25 entries updated'
      );
    });
  });

  test.describe('Error Notifications', () => {
    test('should display error notification on failure', async ({ page }) => {
      await page.route('**/api/settings/update', async (route) => {
        await route.fulfill({
          status: 500,
          json: { error: { message: 'Internal Server Error' } },
        });
      });

      const button = page.locator('[data-testid="update-fields-button"]');
      await button.click();

      const snackbar = page.locator('mat-snack-bar-container');
      await expect(snackbar).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.snackbar-error')).toBeVisible();
    });

    test('should re-enable button after error', async ({ page }) => {
      await page.route('**/api/settings/update', async (route) => {
        await route.fulfill({
          status: 500,
          json: { error: { message: 'Internal Server Error' } },
        });
      });

      const button = page.locator('[data-testid="update-fields-button"]');
      await button.click();

      await page.waitForTimeout(2000);
      await expect(button).toBeEnabled();
    });
  });

  test.describe('Edge Cases', () => {
    test('should prevent concurrent update operations', async ({ page }) => {
      let updateCallCount = 0;

      await page.route('**/api/settings/update', async (route) => {
        updateCallCount++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          json: createMockUpdateResponse(10),
        });
      });

      const button = page.locator('[data-testid="update-fields-button"]');

      await button.click();
      await expect(button).toBeDisabled();
      await button.click({ force: true });
      await button.click({ force: true });

      await page.waitForTimeout(2000);
      expect(updateCallCount).toBe(1);
    });
  });
});
