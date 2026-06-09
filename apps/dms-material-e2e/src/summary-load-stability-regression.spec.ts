import { test, expect } from 'playwright/test';

import { login } from './helpers/login.helper';

const ACCOUNT_UUID = '1677e04f-ef9b-4372-adb3-b740443088dc';

/**
 * E2E Regression: Summary Load Stability
 *
 * Validates that summary screens load once and settle, with no continuous
 * reload loop, and that legitimate month/year changes trigger only bounded
 * follow-up requests.
 *
 * Covers AC1, AC2, AC3, AC4 from Story 116.3.
 */
test.describe('Summary Load Stability Regression', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('Account Summary', () => {
    test('AC1: should settle after initial load with no idle summary requests', async ({
      page,
    }) => {
      // Track summary-related requests
      const requestCounts: Record<string, number> = {
        summary: 0,
        graph: 0,
        months: 0,
        years: 0,
      };

      page.on('request', (req) => {
        const url = req.url();
        if (url.includes('/api/summary') && !url.includes('/graph') && !url.includes('/months') && !url.includes('/years')) {
          requestCounts.summary++;
        } else if (url.includes('/api/summary/graph')) {
          requestCounts.graph++;
        } else if (url.includes('/api/summary/months')) {
          requestCounts.months++;
        } else if (url.includes('/api/summary/years')) {
          requestCounts.years++;
        }
      });

      // Navigate to account summary
      await page.goto(`/account/${ACCOUNT_UUID}`);

      // Wait for initial load to complete
      await page.waitForLoadState('networkidle');

      // Wait for summary card to be visible
      const summaryCard = page.locator('[data-testid="account-summary-container"]');
      await expect(summaryCard).toBeVisible({ timeout: 15000 });

      // Record counts after initial load
      const initialCounts = { ...requestCounts };

      // Wait for observation window (5 seconds) to detect any idle requests
      await page.waitForTimeout(5000);

      // Assert: No additional summary requests during idle period
      expect(requestCounts.summary).toBe(initialCounts.summary);
      expect(requestCounts.graph).toBe(initialCounts.graph);
      expect(requestCounts.months).toBe(initialCounts.months);
      expect(requestCounts.years).toBe(initialCounts.years);
    });

    test('AC2: should issue only one summary and one graph request per month change', async ({
      page,
    }) => {
      // Mock API to provide consistent month options
      await page.route(
        '**/api/summary/months*',
        async function fulfillMonths(route) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              { month: '2025-03', label: 'March 2025' },
              { month: '2025-02', label: 'February 2025' },
            ]),
          });
        }
      );

      await page.route(
        /\/api\/summary\?/,
        async function fulfillSummary(route) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              deposits: 50000,
              dividends: 1200,
              capitalGains: 3000,
              equities: 25000,
              income: 15000,
              tax_free_income: 10000,
            }),
          });
        }
      );

      await page.route(
        '**/api/summary/graph*',
        async function fulfillGraph(route) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              { month: '2025-01', deposits: 10000, dividends: 100, capitalGains: 200 },
              { month: '2025-02', deposits: 20000, dividends: 150, capitalGains: 300 },
            ]),
          });
        }
      );

      // Navigate to account summary
      await page.goto(`/account/${ACCOUNT_UUID}`);
      await page.waitForLoadState('networkidle');

      // Wait for selectors to be enabled
      const monthSelector = page.locator('[data-testid="month-selector"]');
      await expect(monthSelector).not.toHaveAttribute('aria-disabled', 'true', {
        timeout: 15000,
      });

      // Wait for initial requests to complete
      await page.waitForTimeout(1000);

      // Track requests for month change
      let summaryRequests = 0;
      let graphRequests = 0;

      page.on('request', (req) => {
        const url = req.url();
        if (url.includes('/api/summary') && !url.includes('/graph') && !url.includes('/months') && !url.includes('/years')) {
          summaryRequests++;
        } else if (url.includes('/api/summary/graph')) {
          graphRequests++;
        }
      });

      // Change month
      await monthSelector.click();
      await page.waitForSelector('mat-option', { state: 'visible' });
      const options = page.locator('mat-option');
      const count = await options.count();

      expect(count).toBeGreaterThan(1);
      await options.nth(1).click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Assert: Exactly one summary and one graph request
      expect(summaryRequests).toBe(1);
      expect(graphRequests).toBe(1);
    });

    test('AC2: should issue only one months and one graph request per year change', async ({
      page,
    }) => {
      // Mock API to provide consistent year options
      await page.route(
        '**/api/summary/years',
        async function fulfillYears(route) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([2025, 2024, 2023]),
          });
        }
      );

      await page.route(
        '**/api/summary/months*',
        async function fulfillMonths(route) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              { month: '2025-03', label: 'March 2025' },
              { month: '2025-02', label: 'February 2025' },
            ]),
          });
        }
      );

      await page.route(
        '**/api/summary/graph*',
        async function fulfillGraph(route) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              { month: '2025-01', deposits: 10000, dividends: 100, capitalGains: 200 },
              { month: '2025-02', deposits: 20000, dividends: 150, capitalGains: 300 },
            ]),
          });
        }
      );

      await page.route(
        /\/api\/summary\?/,
        async function fulfillSummary(route) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              deposits: 50000,
              dividends: 1200,
              capitalGains: 3000,
              equities: 25000,
              income: 15000,
              tax_free_income: 10000,
            }),
          });
        }
      );

      // Navigate to account summary
      await page.goto(`/account/${ACCOUNT_UUID}`);
      await page.waitForLoadState('networkidle');

      // Wait for selectors to be enabled
      const yearSelector = page.locator('[data-testid="year-selector"]');
      await expect(yearSelector).not.toHaveAttribute('aria-disabled', 'true', {
        timeout: 15000,
      });

      // Wait for initial requests to complete
      await page.waitForTimeout(1000);

      // Track requests for year change
      let monthsRequests = 0;
      let graphRequests = 0;

      page.on('request', (req) => {
        const url = req.url();
        if (url.includes('/api/summary/months')) {
          monthsRequests++;
        } else if (url.includes('/api/summary/graph')) {
          graphRequests++;
        }
      });

      // Change year
      await yearSelector.click();
      await page.waitForSelector('mat-option', { state: 'visible' });
      const options = page.locator('mat-option');
      const count = await options.count();

      if (count > 1) {
        await options.nth(1).click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Assert: Exactly one months and one graph request
        expect(monthsRequests).toBe(1);
        expect(graphRequests).toBe(1);
      }
    });

    test('AC3: should remain visually stable after initial load', async ({
      page,
    }) => {
      // Navigate to account summary
      await page.goto(`/account/${ACCOUNT_UUID}`);
      await page.waitForLoadState('networkidle');

      // Wait for summary card to be visible
      const summaryCard = page.locator('[data-testid="account-summary-container"]');
      await expect(summaryCard).toBeVisible({ timeout: 15000 });

      // Wait for stats grid to be visible
      const statsGrid = page.locator('[data-testid="stats-grid"]');
      await expect(statsGrid).toBeVisible();

      // Assert: Screen remains stable (no continuous repaint/reload)
      // by verifying elements are still visible after observation period
      await page.waitForTimeout(5000);

      await expect(summaryCard).toBeVisible();
      await expect(statsGrid).toBeVisible();
    });

    test('AC3: should remain visually stable after month change', async ({
      page,
    }) => {
      // Mock API for month options
      await page.route(
        '**/api/summary/months*',
        async function fulfillMonths(route) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              { month: '2025-03', label: 'March 2025' },
              { month: '2025-02', label: 'February 2025' },
            ]),
          });
        }
      );

      await page.route(
        /\/api\/summary\?/,
        async function fulfillSummary(route) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              deposits: 50000,
              dividends: 1200,
              capitalGains: 3000,
              equities: 25000,
              income: 15000,
              tax_free_income: 10000,
            }),
          });
        }
      );

      // Navigate to account summary
      await page.goto(`/account/${ACCOUNT_UUID}`);
      await page.waitForLoadState('networkidle');

      // Wait for selectors to be enabled
      const monthSelector = page.locator('[data-testid="month-selector"]');
      await expect(monthSelector).not.toHaveAttribute('aria-disabled', 'true', {
        timeout: 15000,
      });

      // Change month
      await monthSelector.click();
      await page.waitForSelector('mat-option', { state: 'visible' });
      const options = page.locator('mat-option');
      const count = await options.count();

      if (count > 1) {
        await options.nth(1).click();
        await page.waitForLoadState('networkidle');

        // Assert: Screen remains stable after month change
        const summaryCard = page.locator('[data-testid="account-summary-container"]');
        const statsGrid = page.locator('[data-testid="stats-grid"]');

        await expect(summaryCard).toBeVisible();
        await expect(statsGrid).toBeVisible();

        // Wait for observation period
        await page.waitForTimeout(3000);

        await expect(summaryCard).toBeVisible();
        await expect(statsGrid).toBeVisible();
      }
    });
  });

  test.describe('Global Summary Preservation', () => {
    test('AC3: should load once and remain stable (preservation)', async ({
      page,
    }) => {
      // Track requests
      let requestCount = 0;

      page.on('request', (req) => {
        if (req.url().includes('/api/summary') && !req.url().includes('/graph')) {
          requestCount++;
        }
      });

      // Navigate to global summary
      await page.goto('/global/summary');
      await page.waitForLoadState('networkidle');

      // Wait for summary card to be visible
      const summaryCard = page.locator('[data-testid="global-summary-container"]');
      await expect(summaryCard).toBeVisible({ timeout: 15000 });

      // Record count after initial load
      const initialCount = requestCount;

      // Wait for observation window
      await page.waitForTimeout(3000);

      // Assert: No additional requests during idle period
      expect(requestCount).toBe(initialCount);
    });
  });
});
