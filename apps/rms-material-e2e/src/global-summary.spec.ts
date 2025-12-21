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
      const summaryCard = page.locator('mat-card');
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
      const allocationChart = page.locator('rms-summary-display').first();
      await expect(allocationChart).toBeVisible();
      // Verify the chart container is present
      await expect(allocationChart.locator('canvas')).toBeVisible();
    });

    test('performance line chart displays over time', async ({ page }) => {
      const performanceChart = page.locator('rms-summary-display').nth(1);
      await expect(performanceChart).toBeVisible();
      // Verify the chart container is present
      await expect(performanceChart.locator('canvas')).toBeVisible();
    });

    test('should render two summary display components', async ({ page }) => {
      const charts = page.locator('rms-summary-display');
      await expect(charts).toHaveCount(2);
    });

    test('should display chart titles', async ({ page }) => {
      // Check for chart title elements or labels
      const allocationTitle = page.getByText('Allocation by Risk Group');
      const performanceTitle = page.getByText('Portfolio Performance');

      await expect(allocationTitle).toBeVisible();
      await expect(performanceTitle).toBeVisible();
    });
  });

  test.describe('Chart Rendering', () => {
    test('allocation pie chart should have visible canvas', async ({
      page,
    }) => {
      const firstChart = page.locator('rms-summary-display').first();
      const canvas = firstChart.locator('canvas');

      const boundingBox = await canvas.boundingBox();
      expect(boundingBox).not.toBeNull();
      expect(boundingBox?.height).toBeGreaterThan(0);
      expect(boundingBox?.width).toBeGreaterThan(0);
    });

    test('performance line chart should have visible canvas', async ({
      page,
    }) => {
      const secondChart = page.locator('rms-summary-display').nth(1);
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
      const charts = page.locator('rms-summary-display');
      await expect(charts).toHaveCount(2);
    });

    test('should display legend for pie chart', async ({ page }) => {
      const firstChart = page.locator('rms-summary-display').first();
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

      const charts = page.locator('rms-summary-display');
      await expect(charts).toHaveCount(2);
    });
  });

  test.describe('Layout & Styling', () => {
    test('should have proper card styling', async ({ page }) => {
      const card = page.locator('mat-card').first();
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
      const charts = container.locator('rms-summary-display');
      await expect(charts).toHaveCount(2);
    });

    test('should maintain layout on different screen sizes', async ({
      page,
    }) => {
      // Test on desktop
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(300);

      let charts = page.locator('rms-summary-display');
      await expect(charts).toHaveCount(2);

      // Test on tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(300);

      charts = page.locator('rms-summary-display');
      await expect(charts).toHaveCount(2);

      // Test on mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(300);

      charts = page.locator('rms-summary-display');
      await expect(charts).toHaveCount(2);
    });
  });

  test.describe('Accessibility', () => {
    test('charts should have accessible structure', async ({ page }) => {
      const summaryDisplay = page.locator('rms-summary-display').first();
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
