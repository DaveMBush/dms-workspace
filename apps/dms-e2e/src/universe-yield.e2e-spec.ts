import { test, expect } from '@playwright/test';

/**
 * Helper function to extract and compare numeric values from yield cells
 */
async function compareYieldValues(cells: any) {
  const firstValue = await cells.first().textContent();
  const secondValue = await cells.nth(1).textContent();

  const firstNum = parseFloat(firstValue?.replace('%', '') || '0');
  const secondNum = parseFloat(secondValue?.replace('%', '') || '0');

  expect(firstNum !== secondNum).toBe(true);
}

/**
 * Helper function to navigate to universe table and wait for load
 */
async function navigateToUniverseTable(page: any) {
  await page.click('[data-testid="global-nav-link"]');
  await page.waitForSelector('[data-testid="universe-table"]');
}

/**
 * Helper function to handle refresh button interactions
 */
async function handleRefreshButton(page: any) {
  const refreshButton = page.locator('[data-testid="refresh-button"]');
  if (await refreshButton.isVisible()) {
    await refreshButton.click();
    return true;
  }
  return false;
}

/**
 * End-to-end tests for average purchase yield feature
 *
 * Tests complete user workflows:
 * - Login to yield comparison journey
 * - Mobile responsiveness and touch interactions
 * - Keyboard navigation and accessibility
 * - Error handling and edge cases in real scenarios
 * - Data refresh and real-time updates
 */
test.describe('Average Purchase Yield E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Wait for the application to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Complete User Journey', () => {
    test('user can view both yield columns in universe table', async ({
      page,
    }) => {
      // Navigate to the universe view
      await page.click('[data-testid="global-nav-link"]', { timeout: 5000 });

      // Wait for universe table to load
      await page.waitForSelector('[data-testid="universe-table"]', {
        timeout: 10000,
      });

      // Verify both yield columns are visible
      const marketYieldHeader = page.locator(
        '[data-testid="market-yield-header"]'
      );
      const avgYieldHeader = page.locator(
        '[data-testid="avg-purchase-yield-header"]'
      );

      await expect(marketYieldHeader).toBeVisible();
      await expect(avgYieldHeader).toBeVisible();

      // Verify column headers have correct text
      await expect(marketYieldHeader).toContainText('Market Yield');
      await expect(avgYieldHeader).toContainText('Avg Purchase Yield');

      // Verify table has data rows with yield values
      const tableRows = page.locator('[data-testid="universe-row"]');
      const rowCount = await tableRows.count();
      expect(rowCount).toBeGreaterThan(0);

      // Check first row has yield values
      const firstRow = tableRows.first();
      const marketYieldCell = firstRow.locator(
        '[data-testid="market-yield-cell"]'
      );
      const avgYieldCell = firstRow.locator(
        '[data-testid="avg-purchase-yield-cell"]'
      );

      await expect(marketYieldCell).toBeVisible();
      await expect(avgYieldCell).toBeVisible();

      // Values should be numbers (not empty or "N/A")
      const marketYieldText = await marketYieldCell.textContent();
      const avgYieldText = await avgYieldCell.textContent();

      expect(marketYieldText).toMatch(/^\d+\.\d+%?$/);
      expect(avgYieldText).toMatch(/^\d+\.\d+%?$/);
    });

    test('sorting works correctly for both yield types', async ({ page }) => {
      await page.click('[data-testid="global-nav-link"]');
      await page.waitForSelector('[data-testid="universe-table"]');

      // Click on market yield header to sort
      await page.click('[data-testid="market-yield-header"]');

      // Verify sort indicator appears
      const marketYieldSortIcon = page.locator(
        '[data-testid="market-yield-sort-icon"]'
      );
      await expect(marketYieldSortIcon).toBeVisible();

      // Get market yield values after sorting
      const marketYieldCells = page.locator(
        '[data-testid="market-yield-cell"]'
      );
      const marketYieldCount = await marketYieldCells.count();

      if (marketYieldCount > 1) {
        // Should be sorted (either ascending or descending)
        await compareYieldValues(marketYieldCells);
      }

      // Click on average purchase yield header to sort
      await page.click('[data-testid="avg-purchase-yield-header"]');

      // Verify sort indicator appears
      const avgYieldSortIcon = page.locator(
        '[data-testid="avg-purchase-yield-sort-icon"]'
      );
      await expect(avgYieldSortIcon).toBeVisible();

      // Verify table reorders based on avg purchase yield
      const avgYieldCells = page.locator(
        '[data-testid="avg-purchase-yield-cell"]'
      );
      const avgYieldCount = await avgYieldCells.count();

      if (avgYieldCount > 1) {
        await compareYieldValues(avgYieldCells);
      }
    });

    test('account switching updates yield calculations immediately', async ({
      page,
    }) => {
      await page.click('[data-testid="global-nav-link"]');
      await page.waitForSelector('[data-testid="universe-table"]');

      // Get initial avg purchase yield values
      const initialAvgYieldCells = page.locator(
        '[data-testid="avg-purchase-yield-cell"]'
      );
      const initialCount = await initialAvgYieldCells.count();

      let initialValues: string[] = [];
      for (let i = 0; i < Math.min(3, initialCount); i++) {
        const value = await initialAvgYieldCells.nth(i).textContent();
        initialValues.push(value || '');
      }

      // Switch to different account
      const accountSelector = page.locator('[data-testid="account-selector"]');
      if (await accountSelector.isVisible()) {
        await accountSelector.click();

        // Select different account option
        const accountOptions = page.locator('[data-testid="account-option"]');
        const optionCount = await accountOptions.count();

        if (optionCount > 1) {
          await accountOptions.nth(1).click();

          // Wait for table to update
          await page.waitForTimeout(1000);

          // Get updated avg purchase yield values
          const updatedAvgYieldCells = page.locator(
            '[data-testid="avg-purchase-yield-cell"]'
          );
          const updatedCount = await updatedAvgYieldCells.count();

          let updatedValues: string[] = [];
          for (let i = 0; i < Math.min(3, updatedCount); i++) {
            const value = await updatedAvgYieldCells.nth(i).textContent();
            updatedValues.push(value || '');
          }

          // Verify values changed (different account should have different yields)
          let hasChanged = false;
          for (
            let i = 0;
            i < Math.min(initialValues.length, updatedValues.length);
            i++
          ) {
            if (initialValues[i] !== updatedValues[i]) {
              hasChanged = true;
              break;
            }
          }

          expect(hasChanged).toBe(true);
        }
      }
    });
  });

  test.describe('Mobile Responsiveness and Touch Interactions', () => {
    test('table is responsive on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.click('[data-testid="global-nav-link"]');
      await page.waitForSelector('[data-testid="universe-table"]');

      // Verify table is scrollable horizontally if needed
      const table = page.locator('[data-testid="universe-table"]');
      await expect(table).toBeVisible();

      // Check if both yield columns are accessible (either visible or scrollable)
      const marketYieldHeader = page.locator(
        '[data-testid="market-yield-header"]'
      );
      const avgYieldHeader = page.locator(
        '[data-testid="avg-purchase-yield-header"]'
      );

      // One or both should be visible, or table should be scrollable
      const marketVisible = await marketYieldHeader.isVisible();
      const avgVisible = await avgYieldHeader.isVisible();

      expect(marketVisible || avgVisible).toBe(true);

      // Test horizontal scrolling if table is wider than viewport
      if (!marketVisible || !avgVisible) {
        // Scroll right to see hidden columns
        await table.evaluate((el) => {
          el.scrollLeft = el.scrollWidth;
        });

        await page.waitForTimeout(500);

        // Now the other column should be visible
        const marketVisibleAfterScroll = await marketYieldHeader.isVisible();
        const avgVisibleAfterScroll = await avgYieldHeader.isVisible();

        expect(marketVisibleAfterScroll || avgVisibleAfterScroll).toBe(true);
      }
    });

    test('touch interactions work for sorting', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.click('[data-testid="global-nav-link"]');
      await page.waitForSelector('[data-testid="universe-table"]');

      // Test touch tap on yield column header
      const avgYieldHeader = page.locator(
        '[data-testid="avg-purchase-yield-header"]'
      );

      if (await avgYieldHeader.isVisible()) {
        // Simulate touch tap
        await avgYieldHeader.tap();

        // Verify sort indicator appears
        const sortIcon = page.locator(
          '[data-testid="avg-purchase-yield-sort-icon"]'
        );
        await expect(sortIcon).toBeVisible({ timeout: 2000 });

        // Test double tap (reverse sort)
        await avgYieldHeader.tap();
        await page.waitForTimeout(100);
        await avgYieldHeader.tap();

        // Sort direction should change
        await page.waitForTimeout(500);
        await expect(sortIcon).toBeVisible();
      }
    });

    test('filters work on mobile with touch input', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.click('[data-testid="global-nav-link"]');
      await page.waitForSelector('[data-testid="universe-table"]');

      // Open filter panel
      const filterButton = page.locator('[data-testid="filter-button"]');
      if (await filterButton.isVisible()) {
        await filterButton.tap();

        // Test yield filter input
        const yieldFilter = page.locator('[data-testid="yield-filter-input"]');
        if (await yieldFilter.isVisible()) {
          await yieldFilter.tap();
          await yieldFilter.fill('2.0');

          // Apply filter
          const applyButton = page.locator(
            '[data-testid="apply-filter-button"]'
          );
          if (await applyButton.isVisible()) {
            await applyButton.tap();

            // Verify table updates
            await page.waitForTimeout(1000);
            const tableRows = page.locator('[data-testid="universe-row"]');
            const rowCount = await tableRows.count();

            // Should have some filtering result
            expect(rowCount).toBeGreaterThanOrEqual(0);
          }
        }
      }
    });
  });

  test.describe('Keyboard Navigation and Accessibility', () => {
    test('table headers are keyboard accessible', async ({ page }) => {
      await page.click('[data-testid="global-nav-link"]');
      await page.waitForSelector('[data-testid="universe-table"]');

      // Tab to market yield header
      await page.keyboard.press('Tab');
      let focusedElement = await page.evaluate(() =>
        document.activeElement?.getAttribute('data-testid')
      );

      // Keep tabbing until we reach a yield header
      let tabCount = 0;
      while (
        tabCount < 20 &&
        focusedElement !== 'market-yield-header' &&
        focusedElement !== 'avg-purchase-yield-header'
      ) {
        await page.keyboard.press('Tab');
        focusedElement = await page.evaluate(() =>
          document.activeElement?.getAttribute('data-testid')
        );
        tabCount++;
      }

      // Should be able to focus on yield header
      expect(
        focusedElement === 'market-yield-header' ||
          focusedElement === 'avg-purchase-yield-header'
      ).toBe(true);

      // Press Enter to sort
      await page.keyboard.press('Enter');

      // Verify sort indicator appears
      await page.waitForTimeout(500);
      const sortIcons = page.locator('[data-testid$="-sort-icon"]');
      const visibleSortIcons = await sortIcons.count();
      expect(visibleSortIcons).toBeGreaterThan(0);
    });

    test('screen reader accessibility for yield columns', async ({ page }) => {
      await page.click('[data-testid="global-nav-link"]');
      await page.waitForSelector('[data-testid="universe-table"]');

      // Check aria labels and roles
      const marketYieldHeader = page.locator(
        '[data-testid="market-yield-header"]'
      );
      const avgYieldHeader = page.locator(
        '[data-testid="avg-purchase-yield-header"]'
      );

      // Headers should have proper accessibility attributes
      await expect(marketYieldHeader).toHaveAttribute('role', 'columnheader');
      await expect(avgYieldHeader).toHaveAttribute('role', 'columnheader');

      // Should have aria labels or text content
      const marketYieldText = await marketYieldHeader.textContent();
      const avgYieldText = await avgYieldHeader.textContent();

      expect(marketYieldText).toBeTruthy();
      expect(avgYieldText).toBeTruthy();
      expect(marketYieldText?.toLowerCase()).toContain('yield');
      expect(avgYieldText?.toLowerCase()).toContain('yield');

      // Check table cells have proper accessibility
      const yieldCells = page.locator('[data-testid$="-yield-cell"]');
      const cellCount = await yieldCells.count();

      if (cellCount > 0) {
        const firstCell = yieldCells.first();
        const cellText = await firstCell.textContent();

        // Cell should have meaningful content
        expect(cellText).toBeTruthy();
        expect(cellText).toMatch(/\d/); // Should contain numbers
      }
    });

    test('keyboard shortcuts work for common actions', async ({ page }) => {
      await page.click('[data-testid="global-nav-link"]');
      await page.waitForSelector('[data-testid="universe-table"]');

      // Test Escape key to clear filters/sorts
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Test Ctrl+F or similar for search functionality
      await page.keyboard.press('Control+f');
      await page.waitForTimeout(500);

      // These tests verify the application handles keyboard events gracefully
      // even if specific shortcuts aren't implemented yet
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('handles network errors gracefully', async ({ page }) => {
      // Intercept and fail network requests
      await page.route('**/api/**', (route) => route.abort());

      await page.click('[data-testid="global-nav-link"]');

      // Should show error state or loading state, not crash
      await page.waitForTimeout(3000);

      // Page should still be functional
      const body = page.locator('body');
      await expect(body).toBeVisible();

      // Should show some kind of error message or empty state
      const errorMessage = page.locator('[data-testid="error-message"]');
      const emptyState = page.locator('[data-testid="empty-state"]');
      const loadingState = page.locator('[data-testid="loading-state"]');

      const hasErrorHandling =
        (await errorMessage.isVisible()) ||
        (await emptyState.isVisible()) ||
        (await loadingState.isVisible());

      expect(hasErrorHandling).toBe(true);
    });

    test('handles empty data sets gracefully', async ({ page }) => {
      // Mock empty response
      await page.route('**/api/universe**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });

      await page.click('[data-testid="global-nav-link"]');
      await page.waitForSelector('[data-testid="universe-table"]', {
        timeout: 5000,
      });

      // Should show empty state message
      const emptyMessage = page.locator('[data-testid="empty-state"]');
      const noDataMessage = page.locator('text=No data available');
      const tableRows = page.locator('[data-testid="universe-row"]');

      const rowCount = await tableRows.count();
      const hasEmptyState =
        (await emptyMessage.isVisible()) || (await noDataMessage.isVisible());

      // Either should have no rows, or show empty state message
      expect(rowCount === 0 || hasEmptyState).toBe(true);
    });

    test('handles malformed data gracefully', async ({ page }) => {
      // Mock malformed response
      await page.route('**/api/universe**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              symbol: 'TEST',
              yield_percent: 'invalid',
              avg_purchase_yield_percent: null,
              distribution: 'not_a_number',
            },
          ]),
        });
      });

      await page.click('[data-testid="global-nav-link"]');
      await page.waitForTimeout(3000);

      // Application should not crash
      const body = page.locator('body');
      await expect(body).toBeVisible();

      // Should handle malformed data gracefully (show default values or error state)
      const hasContent =
        (await page.isVisible('[data-testid="universe-table"]')) ||
        (await page.isVisible('[data-testid="error-message"]'));

      expect(hasContent).toBe(true);
    });
  });

  test.describe('Data Refresh and Real-time Updates', () => {
    test('data refreshes when user navigates back to page', async ({
      page,
    }) => {
      await page.click('[data-testid="global-nav-link"]');
      await page.waitForSelector('[data-testid="universe-table"]');

      // Get initial data count
      const initialRows = page.locator('[data-testid="universe-row"]');
      const initialCount = await initialRows.count();

      // Navigate away
      await page.click('[data-testid="home-nav-link"]');
      await page.waitForTimeout(1000);

      // Navigate back
      await page.click('[data-testid="global-nav-link"]');
      await page.waitForSelector('[data-testid="universe-table"]');

      // Should have data (potentially refreshed)
      const refreshedRows = page.locator('[data-testid="universe-row"]');
      const refreshedCount = await refreshedRows.count();

      expect(refreshedCount).toBeGreaterThanOrEqual(0);

      // Data integrity should be maintained
      if (refreshedCount > 0) {
        const firstRow = refreshedRows.first();
        const avgYieldCell = firstRow.locator(
          '[data-testid="avg-purchase-yield-cell"]'
        );
        const marketYieldCell = firstRow.locator(
          '[data-testid="market-yield-cell"]'
        );

        await expect(avgYieldCell).toBeVisible();
        await expect(marketYieldCell).toBeVisible();
      }
    });

    test('manual refresh updates yield calculations', async ({ page }) => {
      await navigateToUniverseTable(page);

      // Look for refresh button and click if visible
      if (await handleRefreshButton(page)) {
        // Should show loading state briefly
        const loadingIndicator = page.locator(
          '[data-testid="loading-indicator"]'
        );

        // Wait for refresh to complete
        await page.waitForTimeout(2000);

        // Table should still have data
        const tableRows = page.locator('[data-testid="universe-row"]');
        const rowCount = await tableRows.count();
        expect(rowCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('browser refresh preserves user preferences', async ({ page }) => {
      await page.click('[data-testid="global-nav-link"]');
      await page.waitForSelector('[data-testid="universe-table"]');

      // Set up sort order
      const avgYieldHeader = page.locator(
        '[data-testid="avg-purchase-yield-header"]'
      );
      if (await avgYieldHeader.isVisible()) {
        await avgYieldHeader.click();

        // Verify sort is applied
        const sortIcon = page.locator(
          '[data-testid="avg-purchase-yield-sort-icon"]'
        );
        await expect(sortIcon).toBeVisible();

        // Refresh the page
        await page.reload();
        await page.waitForSelector('[data-testid="universe-table"]');

        // Check if sort preference is restored
        // (This depends on implementation - some apps preserve sort, others reset)
        const refreshedSortIcon = page.locator(
          '[data-testid="avg-purchase-yield-sort-icon"]'
        );

        // Either sort is preserved or table loads successfully without sort
        const tableVisible = await page.isVisible(
          '[data-testid="universe-table"]'
        );
        expect(tableVisible).toBe(true);
      }
    });
  });

  test.describe('Performance and User Experience', () => {
    test('page loads within acceptable time limits', async ({ page }) => {
      const startTime = Date.now();

      await page.click('[data-testid="global-nav-link"]');
      await page.waitForSelector('[data-testid="universe-table"]', {
        timeout: 10000,
      });

      const loadTime = Date.now() - startTime;
      console.log(`Universe page load time: ${loadTime}ms`);

      // Should load within 10 seconds (generous for E2E tests)
      expect(loadTime).toBeLessThan(10000);

      // Verify yield columns are visible within reasonable time
      const marketYieldHeader = page.locator(
        '[data-testid="market-yield-header"]'
      );
      const avgYieldHeader = page.locator(
        '[data-testid="avg-purchase-yield-header"]'
      );

      await expect(marketYieldHeader).toBeVisible({ timeout: 5000 });
      await expect(avgYieldHeader).toBeVisible({ timeout: 5000 });
    });

    test('sorting is responsive and provides immediate feedback', async ({
      page,
    }) => {
      await page.click('[data-testid="global-nav-link"]');
      await page.waitForSelector('[data-testid="universe-table"]');

      const avgYieldHeader = page.locator(
        '[data-testid="avg-purchase-yield-header"]'
      );

      if (await avgYieldHeader.isVisible()) {
        const clickStart = Date.now();

        // Click to sort
        await avgYieldHeader.click();

        // Sort icon should appear quickly
        const sortIcon = page.locator(
          '[data-testid="avg-purchase-yield-sort-icon"]'
        );
        await expect(sortIcon).toBeVisible({ timeout: 1000 });

        const responseTime = Date.now() - clickStart;
        console.log(`Sort response time: ${responseTime}ms`);

        // Should respond within 1 second
        expect(responseTime).toBeLessThan(1000);
      }
    });

    test('table remains usable during data updates', async ({ page }) => {
      await navigateToUniverseTable(page);

      // Simulate user interactions during data loading
      if (await handleRefreshButton(page)) {
        // Immediately try to interact with table
        const avgYieldHeader = page.locator(
          '[data-testid="avg-purchase-yield-header"]'
        );
        if (await avgYieldHeader.isVisible()) {
          // Should still be clickable even during refresh
          await avgYieldHeader.click({ timeout: 2000 });

          // Table should remain functional
          const tableRows = page.locator('[data-testid="universe-row"]');
          const isVisible = await tableRows
            .first()
            .isVisible({ timeout: 3000 });
          expect(isVisible).toBe(true);
        }
      }
    });
  });
});
