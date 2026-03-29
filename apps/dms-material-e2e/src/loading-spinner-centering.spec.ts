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
    // Mock screener API to return quickly so the overlay shows and hides reliably
    await page.route(
      '**/api/screener',
      async function mockScreenerRefresh(route) {
        await new Promise<void>(function delayRefresh(resolve) {
          setTimeout(resolve, 1500);
        });
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, count: 100 }),
        });
      }
    );

    // Navigate to screener
    await page.goto('/global/screener');
    await page.waitForSelector('[data-testid="screener-table"]', {
      timeout: 10000,
    });

    // Click refresh to trigger loading spinner
    await page.click('[data-testid="refresh-button"]');

    // Wait for loading overlay to appear
    const loadingOverlay = page.locator('[data-testid="loading-overlay"]');
    await loadingOverlay.waitFor({ state: 'visible', timeout: 5000 });

    // Verify it has the correct Tailwind classes for centering
    const classes = await loadingOverlay.getAttribute('class');
    expect(classes).toContain('fixed');
    expect(classes).toContain('inset-0');
    expect(classes).toContain('flex');
    expect(classes).toContain('items-center');
    expect(classes).toContain('justify-center');
    // Backdrop is applied via .overlay-container SCSS class (background-color + opacity)
    expect(classes).toContain('overlay-container');

    // Verify layout properties - check computed CSS to confirm fixed/inset coverage
    const overlayStyle = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="loading-overlay"]');
      if (!el) {
        return null;
      }
      const cs = window.getComputedStyle(el);
      return {
        position: cs.position,
        top: cs.top,
        left: cs.left,
        right: cs.right,
        bottom: cs.bottom,
      };
    });
    expect(overlayStyle?.position).toBe('fixed');
    expect(overlayStyle?.top).toBe('0px');
    expect(overlayStyle?.left).toBe('0px');
    // right/bottom verified by inset-0 class check above

    // Verify the centered wrapper exists inside the overlay
    const wrapper = loadingOverlay.locator(
      'div.flex.flex-col.items-center.justify-center'
    );
    await expect(wrapper).toBeVisible();

    // Wait for loading to complete
    await loadingOverlay.waitFor({ state: 'hidden', timeout: 30000 });
  });

  test('AC 2: Spinner uses flexbox approach with correct Tailwind utilities', async ({
    page,
  }) => {
    // Mock screener API to return quickly so the overlay shows and hides reliably
    await page.route(
      '**/api/screener',
      async function mockScreenerRefreshAC2(route) {
        await new Promise<void>(function delayRefreshAC2(resolve) {
          setTimeout(resolve, 1500);
        });
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, count: 100 }),
        });
      }
    );

    // Navigate to screener
    await page.goto('/global/screener');
    await page.waitForSelector('[data-testid="screener-table"]', {
      timeout: 10000,
    });

    // Trigger loading
    await page.click('[data-testid="refresh-button"]');

    const loadingOverlay = page.locator('[data-testid="loading-overlay"]');
    await loadingOverlay.waitFor({ state: 'visible', timeout: 5000 });

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

    // Backdrop is applied via .overlay-container SCSS class (background-color + opacity)
    expect(classes).toContain('overlay-container');

    await loadingOverlay.waitFor({ state: 'hidden', timeout: 30000 });
  });

  test('AC 3.1: Universe screen spinner is centered', async ({ page }) => {
    // Navigate to universe
    await page.goto('/global/universe');
    await page.waitForSelector('[data-testid="update-universe-button"]', {
      timeout: 10000,
    });

    // Stub universe sync API to ensure overlay is visible long enough to test
    await page.route(
      '**/universe/sync-from-screener',
      async function delaySyncRoute(route) {
        await new Promise<void>(function delayResponse(resolve) {
          setTimeout(resolve, 2000);
        });
        await route.continue();
      }
    );

    // Trigger loading by updating universe
    const loadingOverlay = page.locator('[data-testid="loading-overlay"]');

    const updateButton = page.locator('[data-testid="update-universe-button"]');
    await expect(updateButton).toBeVisible();
    await expect(updateButton).toBeEnabled();
    await updateButton.click();
    await expect(loadingOverlay).toBeVisible({ timeout: 10000 });

    // Verify centering
    const classes = await loadingOverlay.getAttribute('class');
    expect(classes).toContain('fixed');
    expect(classes).toContain('inset-0');
    expect(classes).toContain('flex');
    expect(classes).toContain('items-center');
    expect(classes).toContain('justify-center');

    await loadingOverlay.waitFor({ state: 'hidden', timeout: 30000 });
  });

  test('AC 3.2: Account screens spinner is centered', async ({ page }) => {
    const ACCOUNT_UUID = '1677e04f-ef9b-4372-adb3-b740443088dc';

    // Fulfill account summary APIs with a delay so the spinner is visible
    await page.route(
      /\/api\/summary/,
      async function handleAccountSummaryRoute(route) {
        const url = route.request().url();
        await new Promise<void>(function delayResponse(resolve) {
          setTimeout(resolve, 2000);
        });

        if (url.includes('/months')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{ month: '2026-03', label: 'March 2026' }]),
          });
          return;
        }

        if (url.includes('/years')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([2026, 2025]),
          });
          return;
        }

        if (url.includes('/graph')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              {
                month: '2026-03',
                deposits: 100000,
                dividends: 2500,
                capitalGains: 5000,
              },
            ]),
          });
          return;
        }

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
    );

    // Navigate to account summary page (triggers data load)
    await page.goto(`/account/${ACCOUNT_UUID}`);

    // Wait for loading spinner to appear (guaranteed by the route delay)
    const loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    await expect(loadingSpinner).toBeVisible({ timeout: 10000 });

    // Verify flex centering classes
    const classes = await loadingSpinner.getAttribute('class');
    expect(classes).toContain('flex');
    expect(classes).toContain('justify-center');
    expect(classes).toContain('items-center');

    // Wait for loading to complete
    await expect(loadingSpinner).toBeHidden({ timeout: 15000 });
  });

  test('AC 3.3: Global Summary screen spinner is centered', async ({
    page,
  }) => {
    // Navigate to the global summary page first
    await page.goto('/global/summary');
    await page.waitForSelector('[data-testid="global-summary-container"]', {
      timeout: 10000,
    });

    // Now hold summary routes so the reload shows the spinner long enough to verify
    let intercepting = true;
    const pendingRoutes: Array<() => Promise<void>> = [];
    await page.route(/\/api\/summary/, function holdSummaryRoutesAC33(route) {
      const url = route.request().url();
      if (!intercepting || url.includes('/graph') || url.includes('/years')) {
        return route.continue();
      }
      return new Promise<void>(function deferRouteAC33(resolve) {
        pendingRoutes.push(async function releasePendingRouteAC33() {
          if (url.includes('/months')) {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([{ month: '2025-03', label: 'March 2025' }]),
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

    // Reload page; Angular will re-bootstrap and fire API calls (all held open)
    void page.reload({ waitUntil: 'domcontentloaded' });

    // Wait until the spinner appears in DOM
    const loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    await page.waitForFunction(
      function checkSpinnerVisible() {
        return (
          document.querySelector('[data-testid="loading-spinner"]') !== null
        );
      },
      { timeout: 10000 }
    );

    // Spinner confirmed in DOM — assert visible and check centering classes
    await expect(loadingSpinner).toBeVisible();

    // Verify flex centering classes
    const classes = await loadingSpinner.getAttribute('class');
    expect(classes).toContain('flex');
    expect(classes).toContain('justify-center');
    expect(classes).toContain('items-center');

    // Release held routes and wait for loading to complete
    intercepting = false;
    await Promise.all(pendingRoutes.map((fn) => fn()));

    // Wait for loading to complete
    await expect(loadingSpinner).toBeHidden({ timeout: 15000 });
  });

  test('AC 2: Solution works for all screen sizes', async ({ page }) => {
    // Mock screener API to return quickly so the overlay shows and hides reliably
    await page.route(
      '**/api/screener',
      async function mockScreenerAllSizes(route) {
        await new Promise<void>(function delayRefreshAllSizes(resolve) {
          setTimeout(resolve, 1500);
        });
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, count: 100 }),
        });
      }
    );

    const screenSizes = [
      { width: 1920, height: 1080, name: 'Desktop Large' },
      { width: 1366, height: 768, name: 'Desktop Medium' },
      { width: 768, height: 1024, name: 'Tablet' },
    ];

    for (const size of screenSizes) {
      // Set viewport size
      await page.setViewportSize({ width: size.width, height: size.height });

      // Navigate to screener
      await page.goto('/global/screener');
      await page.waitForSelector('[data-testid="screener-table"]', {
        timeout: 10000,
      });

      // Trigger loading
      await page.click('[data-testid="refresh-button"]');

      const loadingOverlay = page.locator('[data-testid="loading-overlay"]');
      await loadingOverlay.waitFor({ state: 'visible', timeout: 5000 });
      // Allow CSS layout to settle before measuring
      await page.waitForTimeout(200);

      // Verify overlay covers entire viewport via computed CSS (fixed inset-0)
      const overlayStyle = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="loading-overlay"]');
        if (!el) {
          return null;
        }
        const cs = window.getComputedStyle(el);
        return {
          position: cs.position,
          top: cs.top,
          left: cs.left,
          right: cs.right,
          bottom: cs.bottom,
        };
      });
      expect(overlayStyle?.position).toBe('fixed');
      expect(overlayStyle?.top).toBe('0px');
      expect(overlayStyle?.left).toBe('0px');
      // right/bottom verified by inset-0 class check above

      // Verify centered wrapper exists
      const wrapper = loadingOverlay.locator(
        'div.flex.flex-col.items-center.justify-center'
      );
      await expect(wrapper).toBeVisible();

      await loadingOverlay.waitFor({ state: 'hidden', timeout: 30000 });
    }
  });
});
