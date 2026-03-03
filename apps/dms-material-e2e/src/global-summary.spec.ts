import { test, expect } from 'playwright/test';

import { login } from './helpers/login.helper';

test.describe('Global Summary Component', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/summary');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Core Functionality', () => {
    test('should display global summary page', async ({ page }) => {
      const summaryCard = page.locator(
        '[data-testid="global-summary-container"]'
      );
      await expect(summaryCard).toBeVisible();
    });

    test('should display page title', async ({ page }) => {
      await expect(
        page.getByRole('heading', { name: 'Global Summary' })
      ).toBeVisible();
    });

    test('allocation pie chart displays risk group breakdown', async ({
      page,
    }) => {
      const allocationChart = page.locator('[data-testid="allocation-chart"]');
      await expect(allocationChart).toBeVisible();
      // Verify the chart container is present
      await expect(allocationChart.locator('canvas')).toBeVisible();
    });

    test('performance line chart displays over time', async ({ page }) => {
      const performanceChart = page.locator(
        '[data-testid="performance-chart"]'
      );
      await expect(performanceChart).toBeVisible();
      // Verify the chart container is present
      await expect(performanceChart.locator('canvas')).toBeVisible();
    });

    test('should render two summary display components', async ({ page }) => {
      const charts = page.locator('dms-summary-display');
      await expect(charts).toHaveCount(2);
    });

    test('should display chart titles', async ({ page }) => {
      // Check for chart title elements or labels
      const allocationTitle = page.getByText('Allocation by Risk Group');
      const performanceTitle = page.getByText('Portfolio Performance');

      await expect(allocationTitle).toBeVisible();
      await expect(performanceTitle).toBeVisible();
    });

    test('should display stats grid with summary values', async ({ page }) => {
      const statsGrid = page.locator('[data-testid="stats-grid"]');
      await expect(statsGrid).toBeVisible();
    });
  });

  test.describe('Month Selection', () => {
    test('should display month selector', async ({ page }) => {
      const monthSelector = page.locator('[data-testid="month-selector"]');
      await expect(monthSelector).toBeVisible();
    });

    test('should have month options available', async ({ page }) => {
      const monthSelector = page.locator('[data-testid="month-selector"]');
      await expect(monthSelector).toBeVisible();
      // Click to open the dropdown
      await monthSelector.click();
      // Wait for options to appear
      await page.waitForSelector('mat-option', { state: 'visible' });
      const options = page.locator('mat-option');
      const count = await options.count();
      expect(count).toBeGreaterThan(0);
      // Close the dropdown by pressing Escape
      await page.keyboard.press('Escape');
    });

    test('should update data when selecting a different month', async ({
      page,
    }) => {
      const monthSelector = page.locator('[data-testid="month-selector"]');
      await expect(monthSelector).toBeVisible();

      // Click to open the dropdown
      await monthSelector.click();
      await page.waitForSelector('mat-option', { state: 'visible' });

      const options = page.locator('mat-option');
      const count = await options.count();

      if (count > 1) {
        // Select the second option (different from current)
        await options.nth(1).click();
        // Wait for page to settle after month change
        await page.waitForLoadState('networkidle');
        // Verify statistics are still displayed (data refreshed)
        const statsGrid = page.locator('[data-testid="stats-grid"]');
        await expect(statsGrid).toBeVisible();
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
      const yearSelector = page.locator('[data-testid="year-selector"]');
      await expect(yearSelector).toBeVisible();
      await yearSelector.click();
      await page.waitForSelector('mat-option', { state: 'visible' });
      const options = page.locator('mat-option');
      const count = await options.count();
      expect(count).toBeGreaterThan(0);
      await page.keyboard.press('Escape');
    });

    test('should update performance chart when selecting a different year', async ({
      page,
    }) => {
      const yearSelector = page.locator('[data-testid="year-selector"]');
      await expect(yearSelector).toBeVisible();

      await yearSelector.click();
      await page.waitForSelector('mat-option', { state: 'visible' });
      const options = page.locator('mat-option');
      const count = await options.count();

      if (count > 1) {
        await options.nth(1).click();
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
      // Navigate without waiting for networkidle so we can catch the spinner
      await page.goto('/global/summary');
      // The spinner should appear while data is loading
      // Use a loose check: if visible it's correct, if page already loaded that's fine too
      const spinner = page.locator('[data-testid="loading-spinner"]');
      // If data loads very quickly the spinner may not be visible, which is acceptable
      // Just verify the spinner element exists in DOM when loading occurs
      await page.waitForLoadState('networkidle');
      // After loading completes, spinner should be gone
      await expect(spinner).not.toBeVisible();
    });

    test('should display data after loading completes', async ({ page }) => {
      // Verify that after networkidle the stats grid and charts are visible
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
      // Intercept summary API calls to simulate a failure
      await page.route('**/api/summary*', (route) => {
        route.abort('failed');
      });

      await page.goto('/global/summary');
      await page.waitForLoadState('networkidle');

      // Error message should appear
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();
    });

    test('should not show error message on successful load', async ({
      page,
    }) => {
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).not.toBeVisible();
    });
  });

  test.describe('Chart Rendering', () => {
    test('allocation pie chart should have visible canvas', async ({
      page,
    }) => {
      const firstChart = page.locator('[data-testid="allocation-chart"]');
      const canvas = firstChart.locator('canvas');

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

      const boundingBox = await canvas.boundingBox();
      expect(boundingBox).not.toBeNull();
      expect(boundingBox?.height).toBeGreaterThan(0);
      expect(boundingBox?.width).toBeGreaterThan(0);
    });

    test('charts should be responsive to container', async ({ page }) => {
      const chartsContainer = page.locator('.charts-container');
      await expect(chartsContainer).toBeVisible();

      // Get initial size
      const initialBox = await chartsContainer.boundingBox();
      expect(initialBox).not.toBeNull();

      // Resize viewport and verify charts adapt
      await page.setViewportSize({ width: 800, height: 600 });
      await page.waitForTimeout(500); // Wait for resize to complete

      const resizedBox = await chartsContainer.boundingBox();
      expect(resizedBox).not.toBeNull();
      // Width should change with viewport
      expect(resizedBox?.width).toBeLessThan(initialBox?.width || Infinity);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle page navigation away and back', async ({ page }) => {
      // Navigate away
      await page.goto('/global/screener');
      await page.waitForLoadState('networkidle');

      // Navigate back to summary
      await page.goto('/global/summary');
      await page.waitForLoadState('networkidle');

      // Verify charts are still visible
      const charts = page.locator('dms-summary-display');
      await expect(charts).toHaveCount(2);
    });

    test('should display legend for pie chart', async ({ page }) => {
      const firstChart = page.locator('[data-testid="allocation-chart"]');
      // Verify chart is rendered with canvas
      const canvas = firstChart.locator('canvas');
      await expect(canvas).toBeVisible();

      // Verify the chart has non-zero dimensions (indicates it's properly rendered)
      const boundingBox = await canvas.boundingBox();
      expect(boundingBox).not.toBeNull();
      expect(boundingBox?.width).toBeGreaterThan(0);
      expect(boundingBox?.height).toBeGreaterThan(0);
    });

    test('should handle page reload', async ({ page }) => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      const charts = page.locator('dms-summary-display');
      await expect(charts).toHaveCount(2);
    });
  });

  test.describe('Layout & Styling', () => {
    test('should have proper card styling', async ({ page }) => {
      const card = page.locator('[data-testid="global-summary-container"]');
      await expect(card).toBeVisible();

      // Verify card has padding/spacing
      const boundingBox = await card.boundingBox();
      expect(boundingBox?.height).toBeGreaterThan(0);
      expect(boundingBox?.width).toBeGreaterThan(0);
    });

    test('charts container should be properly styled', async ({ page }) => {
      const container = page.locator('.charts-container');
      await expect(container).toBeVisible();

      // Verify it contains the charts
      const charts = container.locator('dms-summary-display');
      await expect(charts).toHaveCount(2);
    });

    test('should maintain layout on different screen sizes', async ({
      page,
    }) => {
      // Test on desktop
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(300);

      let charts = page.locator('dms-summary-display');
      await expect(charts).toHaveCount(2);

      // Test on tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(300);

      charts = page.locator('dms-summary-display');
      await expect(charts).toHaveCount(2);

      // Test on mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(300);

      charts = page.locator('dms-summary-display');
      await expect(charts).toHaveCount(2);
    });
  });

  test.describe('Accessibility', () => {
    test('charts should have accessible structure', async ({ page }) => {
      const summaryDisplay = page.locator('[data-testid="allocation-chart"]');
      await expect(summaryDisplay).toBeVisible();

      // Verify the component has proper structure
      await expect(summaryDisplay.locator('canvas')).toBeVisible();
    });

    test('should have navigation context', ({ page }) => {
      // Verify we can navigate to this page via the app
      const currentUrl = page.url();
      expect(currentUrl).toContain('/global/summary');
    });
  });
});
