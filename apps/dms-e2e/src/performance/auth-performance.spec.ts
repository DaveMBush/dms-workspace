import { test, expect } from '@playwright/test';

import { authenticateUser } from '../utils/authenticate-user.function';
import { TEST_USER } from '../utils/default-test-user.constant';
import { fillLoginForm } from '../utils/fill-login-form.function';
import { measureOperationTime } from '../utils/performance-helpers.function';

test.describe('Authentication Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session state
    await page.context().clearCookies();
    // Navigate to the app first so sessionStorage/localStorage are accessible
    await page.goto('/');
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
  });

  test('login performance benchmark', async ({ page }) => {
    await page.goto('/auth/login');

    const { duration } = await measureOperationTime(async () => {
      await fillLoginForm(page, TEST_USER.email, TEST_USER.password);
      await page.click('[data-testid="login-button"]');
      await expect(page).toHaveURL(/^(?!.*\/auth\/login)/);
    });

    console.log(`Login completed in ${duration}ms`);

    // Assert login completes within acceptable timeframe
    expect(duration).toBeLessThan(5000); // 5 seconds max
  });

  test('API request performance with authentication', async ({ page }) => {
    await authenticateUser(page);

    const apiTimes: number[] = [];

    // Measure multiple API requests
    for (let i = 0; i < 10; i++) {
      const { duration } = await measureOperationTime(async () => {
        const response = await page.request.get('/api/universe', {
          headers: {
            Authorization: await page.evaluate(() => {
              return sessionStorage.getItem('accessToken') || '';
            }),
          },
        });
        expect(response.status()).toBe(200);
      });

      apiTimes.push(duration);
    }

    const avgTime = apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length;
    const maxTime = Math.max(...apiTimes);
    const minTime = Math.min(...apiTimes);

    console.log(`API Performance Stats:
      - Average: ${avgTime.toFixed(2)}ms
      - Max: ${maxTime}ms
      - Min: ${minTime}ms
      - Total requests: ${apiTimes.length}`);

    // Assert API performance is acceptable
    expect(avgTime).toBeLessThan(1000); // 1 second max average
    expect(maxTime).toBeLessThan(3000); // 3 seconds max for any single request
  });

  test('token refresh performance', async ({ page }) => {
    await authenticateUser(page);
    await page.goto('/global/universe');

    // Mock token near expiration
    await page.evaluate(() => {
      const nearExpiredPayload = {
        exp: Math.floor(Date.now() / 1000) + 60, // Expires in 1 minute
        iat: Math.floor(Date.now() / 1000) - 3540, // Issued 59 minutes ago
        sub: 'test-user-id',
      };

      const header = Buffer.from(
        JSON.stringify({ alg: 'HS256', typ: 'JWT' })
      ).toString('base64');
      const payload = Buffer.from(JSON.stringify(nearExpiredPayload)).toString(
        'base64'
      );
      const signature = 'mock-signature';

      const nearExpiredToken = `${header}.${payload}.${signature}`;
      sessionStorage.setItem('accessToken', nearExpiredToken);
    });

    // Measure token refresh time
    const { duration } = await measureOperationTime(async () => {
      // Trigger API call that should cause token refresh
      await page.reload();
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    console.log(`Token refresh completed in ${duration}ms`);

    // Assert token refresh is fast enough
    expect(duration).toBeLessThan(3000); // 3 seconds max for refresh
  });

  test('page load performance with authentication', async ({ page }) => {
    await authenticateUser(page);

    const pageLoadTimes: Record<string, number> = {};

    const routes = [
      '/global/universe',
      '/global/screener',
      '/global/summary',
      '/profile',
    ];

    for (const route of routes) {
      const { duration } = await measureOperationTime(async () => {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
      });

      pageLoadTimes[route] = duration;
      console.log(`${route} loaded in ${duration}ms`);
    }

    // Assert all pages load within acceptable time
    Object.entries(pageLoadTimes).forEach(([route, time]) => {
      expect(time).toBeLessThan(5000); // 5 seconds max per page
    });

    const avgLoadTime =
      Object.values(pageLoadTimes).reduce((a, b) => a + b, 0) / routes.length;
    console.log(`Average page load time: ${avgLoadTime.toFixed(2)}ms`);
  });

  test('memory usage during authentication operations', async ({ page }) => {
    await page.goto('/auth/login');

    // Measure memory before login
    const memoryBefore = await page.evaluate(() => {
      return (performance as any).memory
        ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          }
        : null;
    });

    // Perform login
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password);
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/^(?!.*\/auth\/login)/);

    // Navigate through several pages
    await page.goto('/global/universe');
    await page.goto('/global/screener');
    await page.goto('/global/summary');

    // Measure memory after operations
    const memoryAfter = await page.evaluate(() => {
      return (performance as any).memory
        ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          }
        : null;
    });

    if (memoryBefore && memoryAfter) {
      const memoryIncrease =
        memoryAfter.usedJSHeapSize - memoryBefore.usedJSHeapSize;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      console.log(`Memory usage increase: ${memoryIncreaseMB.toFixed(2)}MB`);

      // Assert memory usage is reasonable (less than 50MB increase)
      expect(memoryIncreaseMB).toBeLessThan(50);
    }
  });

  test('concurrent user performance simulation', async ({ browser }) => {
    const contexts = [];
    const pages = [];
    const performanceResults: number[] = [];

    // Create 5 concurrent user sessions
    for (let i = 0; i < 5; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      contexts.push(context);
      pages.push(page);
    }

    try {
      // Concurrent login attempts
      const loginPromises = pages.map(async (page, index) => {
        const { duration } = await measureOperationTime(async () => {
          await page.goto('/auth/login');
          await fillLoginForm(
            page,
            `testuser${index}@example.com`,
            TEST_USER.password
          );
          await page.click('[data-testid="login-button"]');
          await expect(page).toHaveURL(/^(?!.*\/auth\/login)/);
        });

        performanceResults.push(duration);
        return duration;
      });

      const loginTimes = await Promise.all(loginPromises);

      const avgTime = loginTimes.reduce((a, b) => a + b, 0) / loginTimes.length;
      const maxTime = Math.max(...loginTimes);
      const minTime = Math.min(...loginTimes);

      console.log(`Concurrent Login Performance:
        - Average: ${avgTime.toFixed(2)}ms
        - Max: ${maxTime}ms
        - Min: ${minTime}ms
        - Concurrent users: ${loginTimes.length}`);

      // Assert performance under load
      expect(maxTime).toBeLessThan(10000); // 10 seconds max under load
      expect(avgTime).toBeLessThan(7000); // 7 seconds average under load

      // Test concurrent API usage
      const apiPromises = pages.map(async (page, index) => {
        const { duration } = await measureOperationTime(async () => {
          await page.goto('/global/universe');
          await page.waitForLoadState('networkidle');
        });
        return duration;
      });

      const apiTimes = await Promise.all(apiPromises);
      const avgApiTime = apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length;

      console.log(
        `Concurrent API Performance: ${avgApiTime.toFixed(2)}ms average`
      );
      expect(avgApiTime).toBeLessThan(5000); // 5 seconds average for concurrent API usage
    } finally {
      // Cleanup
      await Promise.all(contexts.map((context) => context.close()));
    }
  });

  test('authentication middleware overhead', async ({ page }) => {
    await authenticateUser(page);

    // Measure time for requests with authentication
    const authenticatedTimes: number[] = [];

    for (let i = 0; i < 5; i++) {
      const { duration } = await measureOperationTime(async () => {
        const response = await page.request.get('/api/universe');
        expect(response.status()).toBe(200);
      });
      authenticatedTimes.push(duration);
    }

    const avgAuthTime =
      authenticatedTimes.reduce((a, b) => a + b, 0) / authenticatedTimes.length;

    console.log(`Authentication middleware overhead analysis:
      - Average authenticated request time: ${avgAuthTime.toFixed(2)}ms
      - Number of requests tested: ${authenticatedTimes.length}`);

    // Authentication overhead should be minimal
    expect(avgAuthTime).toBeLessThan(2000); // 2 seconds max including auth
  });

  test('session management performance', async ({ page }) => {
    await page.goto('/auth/login');

    // Measure session establishment time
    const { duration: sessionTime } = await measureOperationTime(async () => {
      await fillLoginForm(page, TEST_USER.email, TEST_USER.password);
      await page.click('[data-testid="login-button"]');
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    console.log(`Session establishment: ${sessionTime}ms`);

    // Test session validation performance across page loads
    const sessionValidationTimes: number[] = [];

    for (let i = 0; i < 3; i++) {
      const { duration } = await measureOperationTime(async () => {
        await page.reload();
        await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      });
      sessionValidationTimes.push(duration);
    }

    const avgValidationTime =
      sessionValidationTimes.reduce((a, b) => a + b, 0) /
      sessionValidationTimes.length;

    console.log(`Session validation performance:
      - Session establishment: ${sessionTime}ms
      - Average validation time: ${avgValidationTime.toFixed(2)}ms`);

    // Assert session operations are performant
    expect(sessionTime).toBeLessThan(5000); // 5 seconds max for session establishment
    expect(avgValidationTime).toBeLessThan(2000); // 2 seconds max for validation
  });
});
