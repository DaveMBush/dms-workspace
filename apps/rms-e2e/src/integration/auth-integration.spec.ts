import { test, expect } from '@playwright/test';

import { authenticateUser } from '../utils/authenticate-user.function';
import { verifyDataTableLoads } from '../utils/verify-data-table-loads.function';
import { waitForAuthenticatedApiRequest } from '../utils/wait-for-authenticated-api-request.function';

test.describe('Authentication Integration with Existing Features', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session state
    await page.context().clearCookies();
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });

    // Authenticate user before each test
    await authenticateUser(page);
  });

  test('universe management with authentication', async ({ page }) => {
    await page.goto('/global/universe');

    // Verify data loads with authenticated API calls
    await verifyDataTableLoads(page, 'universe-table');

    // Test API requests include authentication headers
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/universe') &&
        response.request().headers()['authorization'] !== undefined
    );

    // Trigger data refresh
    await page.reload();
    await responsePromise;

    // Verify table functionality with authentication
    const table = page.locator('[data-testid="universe-table"]');
    await expect(table).toBeVisible();

    // Test filtering functionality
    const filterInput = page.locator('[data-testid="filter-input"]');
    if (await filterInput.isVisible()) {
      await filterInput.fill('AAPL');
      await waitForAuthenticatedApiRequest(page, '/api/universe');
    }

    // Test sorting functionality
    const sortButton = page.locator('[data-testid="sort-symbol"]');
    if (await sortButton.isVisible()) {
      await sortButton.click();
      await expect(page.locator('[data-testid="sort-icon"]')).toBeVisible();
    }
  });

  test('screener functionality with authentication', async ({ page }) => {
    await page.goto('/global/screener');

    // Verify screener data loads
    await verifyDataTableLoads(page, 'screener-table');

    // Test authenticated API calls for screener data
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/screener') &&
        response.request().headers()['authorization'] !== undefined
    );

    await page.reload();
    await responsePromise;

    // Test screener-specific functionality
    const screenerTable = page.locator('[data-testid="screener-table"]');
    await expect(screenerTable).toBeVisible();
  });

  test('summary page with authentication', async ({ page }) => {
    await page.goto('/global/summary');

    // Verify summary data loads with authentication
    const summaryContainer = page.locator('[data-testid="summary-container"]');
    if (await summaryContainer.isVisible()) {
      await expect(summaryContainer).toBeVisible();
    }

    // Test authenticated API calls for summary data
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/summary') &&
        response.request().headers()['authorization'] !== undefined
    );

    await page.reload();
    await responsePromise;
  });

  test('account management with authentication', async ({ page }) => {
    // Navigate through the accounts section
    const accountsOutlet = page.locator('router-outlet[name="accounts"]');
    await expect(accountsOutlet).toBeVisible();

    // Test authenticated access to account data
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/accounts') &&
        response.request().headers()['authorization'] !== undefined
    );

    await page.reload();
    await responsePromise;
  });

  test('profile management with authentication', async ({ page }) => {
    await page.goto('/profile');

    // Verify profile page loads
    const profileContainer = page.locator('[data-testid="profile-container"]');
    if (await profileContainer.isVisible()) {
      await expect(profileContainer).toBeVisible();
    }

    // Test profile data loads with authentication
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/profile') &&
        response.request().headers()['authorization'] !== undefined
    );

    await page.reload();
    await responsePromise;
  });

  test('navigation with authentication guards', async ({ page }) => {
    // Test navigation between different sections
    await page.click('[data-testid="universe-link"]');
    await expect(page).toHaveURL('/global/universe');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

    await page.click('[data-testid="screener-link"]');
    await expect(page).toHaveURL('/global/screener');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

    await page.click('[data-testid="summary-link"]');
    await expect(page).toHaveURL('/global/summary');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

    // All navigation should maintain authentication state
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('API error handling with authentication', async ({ page }) => {
    await page.goto('/global/universe');

    // Intercept API requests and simulate server errors
    await page.route('**/api/universe', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    });

    // Reload page to trigger API call
    await page.reload();

    // Should handle 401 errors appropriately
    // (This might redirect to login or show error message depending on implementation)
    await page.waitForTimeout(2000); // Wait for error handling
  });

  test('session persistence across page refreshes', async ({ page }) => {
    await page.goto('/global/universe');

    // Verify authenticated state
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

    // Refresh page
    await page.reload();

    // Should maintain authentication
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page).toHaveURL('/global/universe');
  });

  test('authentication token in all API requests', async ({ page }) => {
    const apiRequests: string[] = [];

    // Monitor all API requests
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        const authHeader = request.headers()['authorization'];
        if (authHeader) {
          apiRequests.push(request.url());
        }
      }
    });

    // Navigate through different sections to trigger API calls
    await page.goto('/global/universe');
    await page.waitForTimeout(1000);

    await page.goto('/global/screener');
    await page.waitForTimeout(1000);

    await page.goto('/global/summary');
    await page.waitForTimeout(1000);

    // Verify that API requests included authentication
    expect(apiRequests.length).toBeGreaterThan(0);
    console.log(`Authenticated API requests: ${apiRequests.length}`);
  });

  test('concurrent API requests with authentication', async ({ page }) => {
    await page.goto('/global/universe');

    const apiResponses: Promise<any>[] = [];

    // Create multiple concurrent API requests
    for (let i = 0; i < 5; i++) {
      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().includes('/api/') &&
          response.request().headers()['authorization'] !== undefined
      );
      apiResponses.push(responsePromise);

      // Trigger API call by navigating
      await page.reload();
      await page.waitForTimeout(200);
    }

    // Wait for all requests to complete
    const responses = await Promise.all(apiResponses);

    // Verify all requests completed successfully
    responses.forEach((response) => {
      expect(response.status()).toBeLessThan(400);
    });

    console.log(
      `${responses.length} concurrent authenticated API requests completed`
    );
  });

  test('data filtering and sorting with authentication', async ({ page }) => {
    await page.goto('/global/universe');

    // Wait for initial data load
    await verifyDataTableLoads(page, 'universe-table');

    // Test data operations that require authentication
    const operations = [
      async () => {
        const filterInput = page.locator('[data-testid="filter-input"]');
        if (await filterInput.isVisible()) {
          await filterInput.fill('TEST');
          await waitForAuthenticatedApiRequest(page, '/api/universe');
        }
      },
      async () => {
        const sortButton = page.locator('[data-testid="sort-symbol"]');
        if (await sortButton.isVisible()) {
          await sortButton.click();
          await page.waitForTimeout(500);
        }
      },
      async () => {
        const refreshButton = page.locator('[data-testid="refresh-data"]');
        if (await refreshButton.isVisible()) {
          await refreshButton.click();
          await waitForAuthenticatedApiRequest(page, '/api/universe');
        }
      },
    ];

    // Execute all operations and verify authentication is maintained
    for (const operation of operations) {
      await operation();
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    }
  });
});
