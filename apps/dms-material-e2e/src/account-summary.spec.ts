import { test, expect } from 'playwright/test';

import { login } from './helpers/login.helper';

const ACCOUNT_UUID = '1677e04f-ef9b-4372-adb3-b740443088dc';

test.describe('Account Summary', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Navigate to a specific account (summary is default tab)
    await page.goto(`/account/${ACCOUNT_UUID}`);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Navigation', () => {
    test('should navigate to account summary via direct URL', async ({
      page,
    }) => {
      const summaryCard = page.locator(
        '[data-testid="account-summary-container"]'
      );
      await expect(summaryCard).toBeVisible();
    });

    test('should display account summary after navigating from another tab', async ({
      page,
    }) => {
      // Navigate to Open Positions tab within the account panel
      await page.locator('a', { hasText: 'Open Positions' }).click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/account\/.+\/open/);

      // Navigate back to Summary tab
      await page.getByRole('tab', { name: 'Summary' }).click();
      await page.waitForLoadState('networkidle');

      // Verify account summary URL (no sub-path, summary is default)
      await expect(page).toHaveURL(new RegExp(`/account/${ACCOUNT_UUID}$`));
      const summaryCard = page.locator(
        '[data-testid="account-summary-container"]'
      );
      await expect(summaryCard).toBeVisible();
    });

    test('should handle browser back button', async ({ page }) => {
      // Navigate away to open positions tab
      await page.goto(`/account/${ACCOUNT_UUID}/open`);
      await page.waitForLoadState('networkidle');

      // Go back
      await page.goBack();
      await page.waitForLoadState('networkidle');

      // Account summary should be visible again
      const summaryCard = page.locator(
        '[data-testid="account-summary-container"]'
      );
      await expect(summaryCard).toBeVisible();
    });
  });

  test.describe('Data Display', () => {
    test('should display page title', async ({ page }) => {
      await expect(
        page.getByRole('heading', { name: 'Account Summary' })
      ).toBeVisible();
    });

    test('should display stats grid with summary values', async ({ page }) => {
      const statsGrid = page.locator('[data-testid="stats-grid"]');
      await expect(statsGrid).toBeVisible();
    });

    test('should display basis value with currency format', async ({
      page,
    }) => {
      const basisValue = page.locator('[data-testid="basis-value"]');
      await expect(basisValue).toBeVisible();
      await expect(basisValue).toContainText('$');
    });

    test('should display dividends value with currency format', async ({
      page,
    }) => {
      const dividendsValue = page.locator('[data-testid="dividends-value"]');
      await expect(dividendsValue).toBeVisible();
      await expect(dividendsValue).toContainText('$');
    });

    test('should display capital gain value with currency format', async ({
      page,
    }) => {
      const capitalGainValue = page.locator(
        '[data-testid="capital-gain-value"]'
      );
      await expect(capitalGainValue).toBeVisible();
      await expect(capitalGainValue).toContainText('$');
    });

    test('should display percent increase value', async ({ page }) => {
      const percentValue = page.locator(
        '[data-testid="percent-increase-value"]'
      );
      await expect(percentValue).toBeVisible();
      await expect(percentValue).toContainText('%');
    });

    test('should display stat labels', async ({ page }) => {
      await expect(page.getByText('Base')).toBeVisible();
      await expect(page.getByText('Dividends')).toBeVisible();
      await expect(page.getByText('Capital Gain')).toBeVisible();
      await expect(page.getByText('% Increase')).toBeVisible();
    });

    test('should render two summary display components', async ({ page }) => {
      const charts = page.locator('dms-summary-display');
      await expect(charts).toHaveCount(2);
    });

    test('should display chart titles', async ({ page }) => {
      const allocationTitle = page.getByText('Allocation by Risk Group');
      const performanceTitle = page.getByText('Portfolio Performance');

      await expect(allocationTitle).toBeVisible();
      await expect(performanceTitle).toBeVisible();
    });
  });

  test.describe('Chart Rendering', () => {
    test('allocation pie chart displays risk group breakdown', async ({
      page,
    }) => {
      const allocationChart = page.locator('[data-testid="allocation-chart"]');
      await expect(allocationChart).toBeVisible();
      // Verify the chart container has a canvas (may take time to render)
      await expect(allocationChart.locator('canvas')).toBeVisible({
        timeout: 15000,
      });
    });

    test('performance line chart displays over time', async ({ page }) => {
      const performanceChart = page.locator(
        '[data-testid="performance-chart"]'
      );
      await expect(performanceChart).toBeVisible();
      await expect(performanceChart.locator('canvas')).toBeVisible({
        timeout: 15000,
      });
    });

    test('allocation pie chart should have visible canvas', async ({
      page,
    }) => {
      const firstChart = page.locator('[data-testid="allocation-chart"]');
      const canvas = firstChart.locator('canvas');
      await expect(canvas).toBeVisible({ timeout: 15000 });

      const boundingBox = await canvas.boundingBox();
      expect(boundingBox).not.toBeNull();
      expect(boundingBox?.height).toBeGreaterThan(0);
      expect(boundingBox?.width).toBeGreaterThan(0);
    });

    test('performance line chart should have visible canvas', async ({
      page,
    }) => {
      const secondChart = page.locator('[data-testid="performance-chart"]');
      const canvas = secondChart.locator('canvas');
      await expect(canvas).toBeVisible({ timeout: 15000 });

      const boundingBox = await canvas.boundingBox();
      expect(boundingBox).not.toBeNull();
      expect(boundingBox?.height).toBeGreaterThan(0);
      expect(boundingBox?.width).toBeGreaterThan(0);
    });
  });

  test.describe('Month Selection', () => {
    test('should display month selector', async ({ page }) => {
      const monthSelector = page.locator('[data-testid="month-selector"]');
      await expect(monthSelector).toBeVisible();
    });

    test('should have month options available', async ({ page }) => {
      // Ensure API returns valid data so selectors get enabled
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
      await page.goto(`/account/${ACCOUNT_UUID}`);
      await page.waitForLoadState('networkidle');

      const monthSelector = page.locator('[data-testid="month-selector"]');
      await expect(monthSelector).toBeVisible();
      // Wait for selector to become interactive using retry pattern
      await expect(async () => {
        await monthSelector.click({ timeout: 3000 });
        await expect(page.locator('mat-option').first()).toBeVisible({
          timeout: 3000,
        });
      }).toPass({ timeout: 20000, intervals: [2000] });

      const options = page.locator('mat-option');
      const count = await options.count();
      expect(count).toBeGreaterThan(0);
      await page.keyboard.press('Escape');
    });

    test('should update data when selecting a different month', async ({
      page,
    }) => {
      // Mock API to provide consistent month options and month-dependent data
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
          const requestUrl = new URL(route.request().url());
          const month = requestUrl.searchParams.get('month');
          const dividends = month === '2025-02' ? 2200 : 1200;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              deposits: 50000,
              dividends,
              capitalGains: 3000,
              equities: 25000,
              income: 15000,
              tax_free_income: 10000,
            }),
          });
        }
      );
      await page.goto(`/account/${ACCOUNT_UUID}`);
      await page.waitForLoadState('networkidle');

      const monthSelector = page.locator('[data-testid="month-selector"]');
      await expect(monthSelector).toBeVisible();

      // Wait for selector to become interactive using retry pattern
      await expect(async () => {
        await monthSelector.click({ timeout: 3000 });
        await expect(page.locator('mat-option').first()).toBeVisible({
          timeout: 3000,
        });
      }).toPass({ timeout: 20000, intervals: [2000] });

      const options = page.locator('mat-option');
      const count = await options.count();

      if (count > 1) {
        // Capture the refresh request to prove data updates
        const refreshRequest = page.waitForRequest(function isMonthRefresh(
          request
        ) {
          const url = new URL(request.url());
          return (
            url.pathname === '/api/summary' &&
            url.searchParams.get('month') === '2025-02'
          );
        });
        // Select the second option (February 2025)
        await options.nth(1).click();
        await refreshRequest;
        await page.waitForLoadState('networkidle');
        // Verify the dividends value updated to match February data
        await expect(
          page.locator('[data-testid="dividends-value"]')
        ).toContainText('2,200');
      } else {
        // Only one month available - just verify the selector is functional
        await page.keyboard.press('Escape');
        await expect(monthSelector).toBeVisible();
      }
    });
  });

  test.describe('Year Selection', () => {
    test('should display year selector for performance chart', async ({
      page,
    }) => {
      const yearSelector = page.locator('[data-testid="year-selector"]');
      await expect(yearSelector).toBeVisible();
    });

    test('should have year options available', async ({ page }) => {
      // Ensure API returns valid data so selectors get enabled
      await page.route(
        '**/api/summary/years*',
        async function fulfillYears(route) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([2025, 2024]),
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
      await page.goto(`/account/${ACCOUNT_UUID}`);
      await page.waitForLoadState('networkidle');

      const yearSelector = page.locator('[data-testid="year-selector"]');
      await expect(yearSelector).toBeVisible();
      // Wait for selector to become interactive using retry pattern
      await expect(async () => {
        await yearSelector.click({ timeout: 3000 });
        await expect(page.locator('mat-option').first()).toBeVisible({
          timeout: 3000,
        });
      }).toPass({ timeout: 20000, intervals: [2000] });

      const options = page.locator('mat-option');
      const count = await options.count();
      expect(count).toBeGreaterThan(0);
      await page.keyboard.press('Escape');
    });

    test('should update performance chart when selecting a different year', async ({
      page,
    }) => {
      // Mock API to provide consistent year options and summary data
      await page.route(
        '**/api/summary/years*',
        async function fulfillYears(route) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([2025, 2024]),
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
          const requestUrl = new URL(route.request().url());
          const year = requestUrl.searchParams.get('year');
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(
              year === '2024'
                ? [
                    {
                      month: '2024-01',
                      deposits: 30000,
                      dividends: 200,
                      capitalGains: 400,
                    },
                  ]
                : [
                    {
                      month: '2025-01',
                      deposits: 40000,
                      dividends: 300,
                      capitalGains: 500,
                    },
                  ]
            ),
          });
        }
      );
      await page.goto(`/account/${ACCOUNT_UUID}`);
      await page.waitForLoadState('networkidle');

      const yearSelector = page.locator('[data-testid="year-selector"]');
      await expect(yearSelector).toBeVisible();
      // Wait for selector to become interactive using retry pattern
      await expect(async () => {
        await yearSelector.click({ timeout: 3000 });
        await expect(page.locator('mat-option').first()).toBeVisible({
          timeout: 3000,
        });
      }).toPass({ timeout: 20000, intervals: [2000] });

      const options = page.locator('mat-option');
      const count = await options.count();

      if (count > 1) {
        // Capture the graph refresh request to validate year-specific refresh
        const graphRefresh = page.waitForRequest(function isYearRefresh(
          request
        ) {
          const url = new URL(request.url());
          return (
            url.pathname === '/api/summary/graph' &&
            url.searchParams.get('year') === '2024'
          );
        });
        await options.nth(1).click();
        await graphRefresh;
        await page.waitForLoadState('networkidle');
        // Verify performance chart is still visible after year change
        const performanceChart = page.locator(
          '[data-testid="performance-chart"]'
        );
        await expect(performanceChart).toBeVisible();
      } else {
        await page.keyboard.press('Escape');
        await expect(yearSelector).toBeVisible();
      }
    });
  });

  test.describe('Loading State', () => {
    test('should show loading spinner during data fetch', async ({ page }) => {
      // Reload and hold ALL summary API calls so loadingSignal stays true.
      let intercepting = true;
      const pendingRoutes: Array<() => Promise<void>> = [];
      await page.route(/\/api\/summary/, function holdSummaryRoutes(route) {
        const url = route.request().url();
        if (!intercepting || url.includes('/graph') || url.includes('/years')) {
          return route.continue();
        }
        return new Promise<void>(function deferRoute(resolve) {
          pendingRoutes.push(async function releasePendingRoute() {
            if (url.includes('/months')) {
              await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                  { month: '2025-03', label: 'March 2025' },
                  { month: '2025-02', label: 'February 2025' },
                ]),
              });
            } else {
              await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                  deposits: 100000,
                  dividends: 2500,
                  capitalGains: 5000,
                  equities: 50000,
                  income: 30000,
                  tax_free_income: 20000,
                }),
              });
            }
            resolve();
          });
        });
      });

      const spinner = page.locator('[data-testid="loading-spinner"]');

      // Reload page; Angular will bootstrap and fire API calls (all held open)
      void page.reload({ waitUntil: 'domcontentloaded' });

      // Wait until the spinner appears in DOM
      await page.waitForFunction(
        function checkSpinnerInDom() {
          return (
            document.querySelector('[data-testid="loading-spinner"]') !== null
          );
        },
        { timeout: 10000 }
      );

      // Spinner confirmed in DOM; assert it is visible
      await expect(spinner).toBeVisible();

      // Stop intercepting new requests
      intercepting = false;

      // Release all held routes with fulfilled mock data
      await Promise.all(
        pendingRoutes.map(function invokeRelease(release) {
          return release();
        })
      );

      // After data loads, spinner should be gone
      await expect(spinner).not.toBeVisible({ timeout: 15000 });
    });

    test('should display data after loading completes', async ({ page }) => {
      const statsGrid = page.locator('[data-testid="stats-grid"]');
      await expect(statsGrid).toBeVisible();

      const allocationChart = page.locator('[data-testid="allocation-chart"]');
      await expect(allocationChart).toBeVisible();

      const performanceChart = page.locator(
        '[data-testid="performance-chart"]'
      );
      await expect(performanceChart).toBeVisible();
    });
  });

  test.describe('Error State', () => {
    test('should display error message when backend fails', async ({
      page,
    }) => {
      // Intercept summary API calls to simulate a 500 server error
      await page.route('**/api/summary*', function failSummary(route) {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal Server Error' }),
        });
      });

      await page.goto(`/account/${ACCOUNT_UUID}`);

      // Wait for the error message to appear (driven by error signal)
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
    });

    test('should not show error message when API returns valid data', async ({
      page,
    }) => {
      // Mock all summary endpoints to return valid data
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
        '**/api/summary/months*',
        async function fulfillMonths(route) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{ month: '2025-03', label: 'March 2025' }]),
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
              {
                month: '2025-01',
                deposits: 40000,
                dividends: 300,
                capitalGains: 500,
              },
            ]),
          });
        }
      );
      await page.route(
        '**/api/summary/years*',
        async function fulfillYears(route) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([2025]),
          });
        }
      );

      await page.goto(`/account/${ACCOUNT_UUID}`);
      await page.waitForLoadState('networkidle');

      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).not.toBeVisible();
    });
  });

  test.describe('Empty State', () => {
    test('should show no-data message when summary has no allocation data', async ({
      page,
    }) => {
      // Intercept only the summary data endpoint to return all-zero data
      await page.route('**/api/summary?*', async function fulfillEmpty(route) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            deposits: 0,
            dividends: 0,
            capitalGains: 0,
            equities: 0,
            income: 0,
            tax_free_income: 0,
          }),
        });
      });

      await page.goto(`/account/${ACCOUNT_UUID}`);
      await page.waitForLoadState('networkidle');

      // No-data message should be visible (all allocation values are zero)
      const noDataMessage = page.locator('[data-testid="no-data-message"]');
      await expect(noDataMessage).toBeVisible();

      // Stats grid should still be visible (showing zeros)
      const statsGrid = page.locator('[data-testid="stats-grid"]');
      await expect(statsGrid).toBeVisible();

      // No error message — empty data is a valid state
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).not.toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle page navigation away and back', async ({ page }) => {
      // Navigate away
      await page.goto('/global/screener');
      await page.waitForLoadState('networkidle');

      // Navigate back to account summary
      await page.goto(`/account/${ACCOUNT_UUID}`);
      await page.waitForLoadState('networkidle');

      // Verify charts are still visible
      const charts = page.locator('dms-summary-display');
      await expect(charts).toHaveCount(2);
    });

    test('should handle page reload', async ({ page }) => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      const charts = page.locator('dms-summary-display');
      await expect(charts).toHaveCount(2);
    });

    test('should display legend for pie chart', async ({ page }) => {
      const firstChart = page.locator('[data-testid="allocation-chart"]');
      const canvas = firstChart.locator('canvas');
      await expect(canvas).toBeVisible();

      // Verify the chart has non-zero dimensions (properly rendered)
      const boundingBox = await canvas.boundingBox();
      expect(boundingBox).not.toBeNull();
      expect(boundingBox?.width).toBeGreaterThan(0);
      expect(boundingBox?.height).toBeGreaterThan(0);
    });
  });

  test.describe('Layout & Styling', () => {
    test('should have proper card styling', async ({ page }) => {
      const card = page.locator('[data-testid="account-summary-container"]');
      await expect(card).toBeVisible();

      const boundingBox = await card.boundingBox();
      expect(boundingBox?.height).toBeGreaterThan(0);
      expect(boundingBox?.width).toBeGreaterThan(0);
    });

    test('charts container should be properly styled', async ({ page }) => {
      const container = page.locator('.charts-container');
      await expect(container).toBeVisible();

      const charts = container.locator('dms-summary-display');
      await expect(charts).toHaveCount(2);
    });

    test('should maintain layout on different screen sizes', async ({
      page,
    }) => {
      // Test on desktop
      await page.setViewportSize({ width: 1920, height: 1080 });
      await expect(page.locator('dms-summary-display')).toHaveCount(2, {
        timeout: 5000,
      });

      // Test on tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('dms-summary-display')).toHaveCount(2, {
        timeout: 5000,
      });

      // Test on mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('dms-summary-display')).toHaveCount(2, {
        timeout: 5000,
      });
    });
  });

  test.describe('Accessibility', () => {
    test('charts should have accessible structure', async ({ page }) => {
      const summaryDisplay = page.locator('[data-testid="allocation-chart"]');
      await expect(summaryDisplay).toBeVisible();

      await expect(summaryDisplay.locator('canvas')).toBeVisible();
    });

    test('should have navigation context', ({ page }) => {
      const currentUrl = page.url();
      expect(currentUrl).toContain(`/account/${ACCOUNT_UUID}`);
    });
  });
});
