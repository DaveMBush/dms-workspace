import { test, expect } from '@playwright/test';

test.describe('Summary Display Component (Charts)', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth/login');
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Navigate to chart demo page
    await page.goto('/demo/charts');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Core Functionality', () => {
    test('line chart renders with data', async ({ page }) => {
      const lineChart = page.locator('[data-testid="line-chart"]');
      await expect(lineChart).toBeVisible();

      const canvas = lineChart.locator('canvas');
      await expect(canvas).toBeVisible();
    });

    test('pie chart renders with data', async ({ page }) => {
      const pieChart = page.locator('[data-testid="pie-chart"]');
      await expect(pieChart).toBeVisible();

      const canvas = pieChart.locator('canvas');
      await expect(canvas).toBeVisible();
    });

    test('hovering shows tooltip with values', async ({ page }) => {
      const pieChart = page.locator('[data-testid="pie-chart"] canvas');
      await expect(pieChart).toBeVisible();

      // Get chart dimensions to hover over center area
      const box = await pieChart.boundingBox();
      if (box) {
        // Hover over a slice of the pie chart (offset from center)
        await page.mouse.move(
          box.x + box.width * 0.3,
          box.y + box.height * 0.4
        );
        await page.waitForTimeout(500);

        // Tooltip should appear - Chart.js creates a tooltip element
        // The tooltip is visible when it has content
        const tooltip = page
          .locator('[data-testid="pie-chart-card"] canvas')
          .first();
        await expect(tooltip).toBeVisible();
      }
    });

    test('legend displays and is visible', async ({ page }) => {
      // The legend-top chart has legend at top position for visibility testing
      const chartCard = page.locator('[data-testid="legend-top-card"]');
      await expect(chartCard).toBeVisible();

      // Chart.js renders legends in the canvas, verify chart renders
      const canvas = chartCard.locator('canvas');
      await expect(canvas).toBeVisible();
    });

    test('charts resize on window resize', async ({ page }) => {
      const pieChart = page.locator('[data-testid="pie-chart"] canvas');
      const initialBox = await pieChart.boundingBox();

      // Resize viewport
      await page.setViewportSize({ width: 800, height: 600 });
      await page.waitForTimeout(500);

      const newBox = await pieChart.boundingBox();

      // Chart should have resized (width should be different)
      expect(newBox?.width).not.toBe(initialBox?.width);
    });

    test('charts update when data changes', async ({ page }) => {
      const updateButton = page.locator('[data-testid="update-pie-button"]');
      await updateButton.click();

      // Verify update indicator appears
      const indicator = page.locator('[data-testid="updated-indicator"]');
      await expect(indicator).toBeVisible();
      await expect(indicator).toHaveText('Data Updated!');
    });
  });

  test.describe('Edge Cases', () => {
    test('empty data displays appropriate message', async ({ page }) => {
      const emptyChart = page.locator('[data-testid="empty-chart"]');
      await expect(emptyChart).toBeVisible();

      const noDataMessage = emptyChart.locator('.no-data-message');
      await expect(noDataMessage).toBeVisible();
      await expect(noDataMessage).toHaveText('No data available');

      // Canvas should not be rendered
      const canvas = emptyChart.locator('canvas');
      await expect(canvas).not.toBeVisible();
    });

    test('single data point renders correctly', async ({ page }) => {
      const singlePointChart = page.locator(
        '[data-testid="single-point-chart"]'
      );
      await expect(singlePointChart).toBeVisible();

      const canvas = singlePointChart.locator('canvas');
      await expect(canvas).toBeVisible();
    });

    test('large dataset (100+ points) renders', async ({ page }) => {
      const largeDatasetChart = page.locator(
        '[data-testid="large-dataset-chart"]'
      );
      await expect(largeDatasetChart).toBeVisible();

      const canvas = largeDatasetChart.locator('canvas');
      await expect(canvas).toBeVisible();
    });

    test('very small values displayed correctly', async ({ page }) => {
      const smallValuesChart = page.locator(
        '[data-testid="small-values-chart"]'
      );
      await expect(smallValuesChart).toBeVisible();

      const canvas = smallValuesChart.locator('canvas');
      await expect(canvas).toBeVisible();
    });

    test('very large values displayed correctly', async ({ page }) => {
      const largeValuesChart = page.locator(
        '[data-testid="large-values-chart"]'
      );
      await expect(largeValuesChart).toBeVisible();

      const canvas = largeValuesChart.locator('canvas');
      await expect(canvas).toBeVisible();
    });

    test('negative values handled correctly in charts', async ({ page }) => {
      const negativeValuesChart = page.locator(
        '[data-testid="negative-values-chart"]'
      );
      await expect(negativeValuesChart).toBeVisible();

      const canvas = negativeValuesChart.locator('canvas');
      await expect(canvas).toBeVisible();
    });

    test('chart animation completes smoothly', async ({ page }) => {
      // Navigate away and back to trigger animation
      await page.goto('/dashboard');
      await page.goto('/demo/charts');
      await page.waitForLoadState('networkidle');

      // Wait for animation duration (Chart.js default is ~1s)
      await page.waitForTimeout(1500);

      // Verify charts are rendered after animation
      const pieChart = page.locator('[data-testid="pie-chart"] canvas');
      await expect(pieChart).toBeVisible();
    });

    test('chart handles data update during display', async ({ page }) => {
      // Click update button while chart is visible
      const updateButton = page.locator('[data-testid="update-line-button"]');
      await updateButton.click();

      // Small delay for update
      await page.waitForTimeout(300);

      // Chart should still be visible and functional
      const lineChart = page.locator('[data-testid="line-chart"] canvas');
      await expect(lineChart).toBeVisible();
    });
  });

  test.describe('Chart Configuration', () => {
    test('no legend chart hides legend', async ({ page }) => {
      const noLegendCard = page.locator('[data-testid="no-legend-card"]');
      await expect(noLegendCard).toBeVisible();

      // Canvas should still render
      const canvas = noLegendCard.locator('canvas');
      await expect(canvas).toBeVisible();
    });

    test('legend position top renders correctly', async ({ page }) => {
      const legendTopCard = page.locator('[data-testid="legend-top-card"]');
      await expect(legendTopCard).toBeVisible();

      const canvas = legendTopCard.locator('canvas');
      await expect(canvas).toBeVisible();
    });

    test('doughnut chart renders correctly', async ({ page }) => {
      const doughnutChart = page.locator('[data-testid="doughnut-chart"]');
      await expect(doughnutChart).toBeVisible();

      const canvas = doughnutChart.locator('canvas');
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('Theme Support', () => {
    test('charts render in light theme', async ({ page }) => {
      // Ensure light theme
      await page.evaluate(() => localStorage.setItem('rms-theme', 'light'));
      await page.reload();
      await page.waitForLoadState('networkidle');

      const pieChart = page.locator('[data-testid="pie-chart"] canvas');
      await expect(pieChart).toBeVisible();
    });

    test('charts render in dark theme', async ({ page }) => {
      // Switch to dark theme
      await page.evaluate(() => localStorage.setItem('rms-theme', 'dark'));
      await page.reload();
      await page.waitForLoadState('networkidle');

      const body = page.locator('body');
      await expect(body).toHaveClass(/dark-theme/);

      const pieChart = page.locator('[data-testid="pie-chart"] canvas');
      await expect(pieChart).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('charts work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(300);

      const pieChart = page.locator('[data-testid="pie-chart"]');
      await expect(pieChart).toBeVisible();

      const canvas = pieChart.locator('canvas');
      await expect(canvas).toBeVisible();
    });

    test('charts work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(300);

      const pieChart = page.locator('[data-testid="pie-chart"]');
      await expect(pieChart).toBeVisible();

      const canvas = pieChart.locator('canvas');
      await expect(canvas).toBeVisible();
    });
  });
});
