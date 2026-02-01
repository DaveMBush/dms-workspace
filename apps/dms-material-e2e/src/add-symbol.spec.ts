import { test, expect } from 'playwright/test';

import { login } from './helpers/login.helper';

test.describe.skip('Add Symbol Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/universe');
  });

  test.describe('Dialog Interaction', () => {
    test('should open add symbol dialog', async ({ page }) => {
      await page.click('[data-testid="add-symbol-button"]');
      await expect(
        page.locator('[data-testid="add-symbol-dialog"]')
      ).toBeVisible();
    });

    test('should close dialog on cancel', async ({ page }) => {
      await page.click('[data-testid="add-symbol-button"]');
      await page.click('[data-testid="cancel-button"]');
      await expect(
        page.locator('[data-testid="add-symbol-dialog"]')
      ).not.toBeVisible();
    });
  });

  test.describe('Symbol Input and Autocomplete', () => {
    test('should show autocomplete results', async ({ page }) => {
      await page.route('**/api/symbols/search?q=AA', async (route) => {
        await route.fulfill({
          json: [
            { symbol: 'AAPL', name: 'Apple Inc.' },
            { symbol: 'AAL', name: 'American Airlines' },
          ],
        });
      });

      await page.click('[data-testid="add-symbol-button"]');
      await page.fill('[data-testid="symbol-input"]', 'AA');
      await expect(page.locator('.mat-autocomplete-panel')).toBeVisible();
      await expect(page.locator('text=AAPL - Apple Inc.')).toBeVisible();
    });

    test('should select symbol from autocomplete', async ({ page }) => {
      await page.click('[data-testid="add-symbol-button"]');
      await page.fill('[data-testid="symbol-input"]', 'AA');
      await page.click('text=AAPL - Apple Inc.');
      await expect(page.locator('[data-testid="symbol-input"]')).toHaveValue(
        'AAPL'
      );
    });
  });

  test.describe('Successful Addition', () => {
    test('should add symbol successfully', async ({ page }) => {
      await page.route('**/api/universe', async (route) => {
        await route.fulfill({
          status: 201,
          json: { symbol: 'AAPL', id: 123 },
        });
      });

      await page.click('[data-testid="add-symbol-button"]');
      await page.fill('[data-testid="symbol-input"]', 'AAPL');
      await page.click('[data-testid="submit-button"]');

      await expect(page.locator('.snackbar-success')).toBeVisible();
      await expect(
        page.locator('text=Symbol added successfully')
      ).toBeVisible();
    });

    test('should refresh universe table after addition', async ({ page }) => {
      // Test implementation
    });
  });

  test.describe('Validation Errors', () => {
    test('should show error for empty symbol', async ({ page }) => {
      await page.click('[data-testid="add-symbol-button"]');
      await page.click('[data-testid="submit-button"]');
      await expect(page.locator('text=Symbol is required')).toBeVisible();
    });

    test('should show error for invalid format', async ({ page }) => {
      await page.click('[data-testid="add-symbol-button"]');
      await page.fill('[data-testid="symbol-input"]', '123');
      await expect(page.locator('text=Invalid symbol format')).toBeVisible();
    });
  });

  test.describe('API Error Handling', () => {
    test('should handle duplicate symbol error', async ({ page }) => {
      await page.route('**/api/universe', async (route) => {
        await route.fulfill({
          status: 409,
          json: { message: 'Symbol already exists' },
        });
      });

      await page.click('[data-testid="add-symbol-button"]');
      await page.fill('[data-testid="symbol-input"]', 'AAPL');
      await page.click('[data-testid="submit-button"]');

      await expect(page.locator('.snackbar-error')).toBeVisible();
      await expect(
        page.locator('text=Symbol already exists in universe')
      ).toBeVisible();
    });

    test('should handle server errors', async ({ page }) => {
      await page.route('**/api/universe', async (route) => {
        await route.fulfill({ status: 500 });
      });

      await page.click('[data-testid="add-symbol-button"]');
      await page.fill('[data-testid="symbol-input"]', 'AAPL');
      await page.click('[data-testid="submit-button"]');

      await expect(page.locator('text=Server error')).toBeVisible();
    });
  });
});
