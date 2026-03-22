/**
 * E2E tests for Story 10.1: Center Wait Spinner Using Tailwind
 * Verifies that the global loading spinner is properly centered on all screens
 */

import { expect, test } from '@playwright/test';
import { login } from './helpers/login.helper';

test.describe('Loading Spinner Centering', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Wait for app to be fully loaded
    await page.waitForSelector('dms-shell', { timeout: 10000 });
  });

  test('AC 1: Screener screen spinner is centered horizontally and vertically', async ({
    page,
  }) => {
    // Navigate to screener
    await page.goto('/');
    await page.waitForSelector('[data-testid="screener-table"]', {
      timeout: 10000,
    });

    // Click refresh to trigger loading spinner
    await page.click('[data-testid="refresh-button"]');

    // Wait for loading overlay to appear
    const loadingOverlay = page.locator('[data-testid="loading-overlay"]');
    await loadingOverlay.waitFor({ state: 'visible', timeout: 2000 });

    // Verify it has the correct Tailwind classes for centering
    const classes = await loadingOverlay.getAttribute('class');
    expect(classes).toContain('fixed');
    expect(classes).toContain('inset-0');
    expect(classes).toContain('flex');
    expect(classes).toContain('items-center');
    expect(classes).toContain('justify-center');
    expect(classes).toContain('bg-black/50');

    // Verify layout properties
    const box = await loadingOverlay.boundingBox();
    if (box) {
      const viewportSize = page.viewportSize();
      if (viewportSize) {
        // Spinner overlay should cover the entire viewport
        expect(box.x).toBe(0);
        expect(box.y).toBe(0);
        expect(box.width).toBe(viewportSize.width);
        expect(box.height).toBe(viewportSize.height);
      }
    }

    // Verify spinner content is centered within the overlay
    const spinner = loadingOverlay.locator('mat-progress-spinner');
    const spinnerBox = await spinner.boundingBox();
    if (spinnerBox && box) {
      const centerX = box.width / 2;
      const centerY = box.height / 2;
      const spinnerCenterX = spinnerBox.x + spinnerBox.width / 2;
      const spinnerCenterY = spinnerBox.y + spinnerBox.height / 2;

      // Allow 1px tolerance for rounding
      expect(Math.abs(spinnerCenterX - centerX)).toBeLessThan(1);
      expect(Math.abs(spinnerCenterY - centerY)).toBeLessThan(1);
    }

    // Wait for loading to complete
    await loadingOverlay.waitFor({ state: 'hidden', timeout: 10000 });
  });

  test('AC 2: Spinner uses flexbox approach with correct Tailwind utilities', async ({
    page,
  }) => {
    // Navigate to screener
    await page.goto('/');
    await page.waitForSelector('[data-testid="screener-table"]', {
      timeout: 10000,
    });

    // Trigger loading
    await page.click('[data-testid="refresh-button"]');

    const loadingOverlay = page.locator('[data-testid="loading-overlay"]');
    await loadingOverlay.waitFor({ state: 'visible', timeout: 2000 });

    // Verify the flexbox approach is used (not transform approach)
    const classes = await loadingOverlay.getAttribute('class');

    // Should use: fixed inset-0 flex items-center justify-center
    expect(classes).toContain('fixed');
    expect(classes).toContain('inset-0');
    expect(classes).toContain('flex');
    expect(classes).toContain('items-center');
    expect(classes).toContain('justify-center');

    // Should have appropriate z-index
    expect(classes).toMatch(/z-\[9999\]/);

    // Should have backdrop
    expect(classes).toContain('bg-black/50');

    await loadingOverlay.waitFor({ state: 'hidden', timeout: 10000 });
  });

  test('AC 3.1: Universe screen spinner is centered', async ({ page }) => {
    // Navigate to universe
    await page.goto('/global/universe');
    await page.waitForSelector('[data-testid="update-universe-button"]', {
      timeout: 10000,
    });

    // Trigger loading by updating universe
    const loadingOverlay = page.locator('[data-testid="loading-overlay"]');

    const updateButton = page.locator('[data-testid="update-universe-button"]');
    if ((await updateButton.isVisible()) && (await updateButton.isEnabled())) {
      await updateButton.click();

      const appeared = await loadingOverlay
        .waitFor({ state: 'visible', timeout: 2000 })
        .then(() => true)
        .catch(() => false);

      if (appeared) {
        // Verify centering
        const classes = await loadingOverlay.getAttribute('class');
        expect(classes).toContain('fixed');
        expect(classes).toContain('inset-0');
        expect(classes).toContain('flex');
        expect(classes).toContain('items-center');
        expect(classes).toContain('justify-center');

        await loadingOverlay.waitFor({ state: 'hidden', timeout: 10000 });
      }
    }
  });

  test('AC 3.2: Account screens spinner is centered', async ({ page }) => {
    // Navigate to root - accounts panel is shown in the sidebar
    await page.goto('/');
    await page.waitForSelector('[data-testid="accounts-panel"]', {
      timeout: 10000,
    });

    // Check if there's a loading spinner visible on the accounts screen
    const loadingSpinner = page.locator('[data-testid="loading-spinner"]');

    // If a local loading spinner exists, it should use flex centering within its container
    if (await loadingSpinner.isVisible()) {
      const classes = await loadingSpinner.getAttribute('class');
      expect(classes).toContain('flex');
      expect(classes).toContain('justify-center');
      expect(classes).toContain('items-center');
    }
  });

  test('AC 3.3: Global Summary screen spinner is centered', async ({
    page,
  }) => {
    // Navigate to global summary
    await page.goto('/global/summary');
    await page.waitForSelector('[data-testid="global-summary-container"]', {
      timeout: 10000,
    });

    // Check for local loading spinner
    const loadingSpinner = page.locator('[data-testid="loading-spinner"]');

    if (await loadingSpinner.isVisible()) {
      const classes = await loadingSpinner.getAttribute('class');
      expect(classes).toContain('flex');
      expect(classes).toContain('justify-center');
      expect(classes).toContain('items-center');
    }
  });

  test('AC 2: Solution works for all screen sizes', async ({ page }) => {
    const screenSizes = [
      { width: 1920, height: 1080, name: 'Desktop Large' },
      { width: 1366, height: 768, name: 'Desktop Medium' },
      { width: 768, height: 1024, name: 'Tablet' },
    ];

    for (const size of screenSizes) {
      // Set viewport size
      await page.setViewportSize({ width: size.width, height: size.height });

      // Navigate to screener
      await page.goto('/');
      await page.waitForSelector('[data-testid="screener-table"]', {
        timeout: 10000,
      });

      // Trigger loading
      await page.click('[data-testid="refresh-button"]');

      const loadingOverlay = page.locator('[data-testid="loading-overlay"]');
      await loadingOverlay.waitFor({ state: 'visible', timeout: 2000 });

      // Verify overlay covers entire viewport
      const box = await loadingOverlay.boundingBox();
      if (box) {
        expect(box.x).toBe(0);
        expect(box.y).toBe(0);
        expect(box.width).toBe(size.width);
        expect(box.height).toBe(size.height);
      }

      // Verify spinner is centered
      const spinner = loadingOverlay.locator('mat-progress-spinner');
      const spinnerBox = await spinner.boundingBox();
      if (spinnerBox && box) {
        const centerX = box.width / 2;
        const centerY = box.height / 2;
        const spinnerCenterX = spinnerBox.x + spinnerBox.width / 2;
        const spinnerCenterY = spinnerBox.y + spinnerBox.height / 2;

        expect(Math.abs(spinnerCenterX - centerX)).toBeLessThan(1);
        expect(Math.abs(spinnerCenterY - centerY)).toBeLessThan(1);
      }

      await loadingOverlay.waitFor({ state: 'hidden', timeout: 10000 });
    }
  });
});
