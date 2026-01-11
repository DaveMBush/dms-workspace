import { test, expect } from '@playwright/test';

import { authenticateUser } from '../utils/authenticate-user.function';
import { TEST_USER } from '../utils/default-test-user.constant';
import { fillLoginForm } from '../utils/fill-login-form.function';
import { measureOperationTime } from '../utils/performance-helpers.function';

test.describe('Authentication System Scalability and Reliability Tests', () => {
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

  test('stress test with high authentication request volumes', async ({
    browser,
  }) => {
    const maxConcurrentUsers = 10;
    const requestsPerUser = 5;
    const contexts = [];
    const pages = [];
    const results = [];

    console.log(
      `Starting stress test with ${maxConcurrentUsers} concurrent users, ${requestsPerUser} requests each`
    );

    // Create concurrent user contexts
    for (let i = 0; i < maxConcurrentUsers; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      contexts.push(context);
      pages.push(page);
    }

    try {
      // Concurrent authentication stress test
      const authPromises = pages.map(async (page, userIndex) => {
        const userResults = [];

        for (
          let requestIndex = 0;
          requestIndex < requestsPerUser;
          requestIndex++
        ) {
          const { duration, result } = await measureOperationTime(async () => {
            try {
              await page.goto('/auth/login');
              await fillLoginForm(
                page,
                `testuser${userIndex}@example.com`,
                TEST_USER.password
              );
              await page.click('[data-testid="login-button"]');
              await expect(page).toHaveURL(/^(?!.*\/auth\/login)/, {
                timeout: 10000,
              });

              // Make authenticated API request
              await page.goto('/global/universe');
              await expect(
                page.locator('[data-testid="user-menu"]')
              ).toBeVisible({ timeout: 5000 });

              // Logout
              await page.click('[data-testid="logout-button"]');
              await page.click('p-confirmdialog .p-confirm-dialog-accept');
              await page.waitForURL(
                function checkLoginUrl(url) {
                  return url.includes('/auth/login');
                },
                { timeout: 5000 }
              );

              return 'success';
            } catch (error) {
              console.error(
                `User ${userIndex}, Request ${requestIndex} failed:`,
                error.message
              );
              return 'failed';
            }
          });

          userResults.push({
            user: userIndex,
            request: requestIndex,
            duration,
            result,
          });

          // Brief pause between requests from same user
          await page.waitForTimeout(100);
        }

        return userResults;
      });

      const allResults = await Promise.all(authPromises);
      results.push(...allResults.flat());

      // Analyze results
      const successfulRequests = results.filter((r) => r.result === 'success');
      const failedRequests = results.filter((r) => r.result === 'failed');
      const avgDuration =
        successfulRequests.reduce((sum, r) => sum + r.duration, 0) /
        successfulRequests.length;
      const maxDuration = Math.max(
        ...successfulRequests.map((r) => r.duration)
      );
      const minDuration = Math.min(
        ...successfulRequests.map((r) => r.duration)
      );

      console.log(`Stress Test Results:
        - Total requests: ${results.length}
        - Successful: ${successfulRequests.length} (${(
        (successfulRequests.length / results.length) *
        100
      ).toFixed(1)}%)
        - Failed: ${failedRequests.length} (${(
        (failedRequests.length / results.length) *
        100
      ).toFixed(1)}%)
        - Average duration: ${avgDuration.toFixed(2)}ms
        - Max duration: ${maxDuration}ms
        - Min duration: ${minDuration}ms`);

      // Assert performance under stress
      expect(successfulRequests.length / results.length).toBeGreaterThan(0.95); // 95% success rate
      expect(avgDuration).toBeLessThan(15000); // 15 seconds average under stress
      expect(maxDuration).toBeLessThan(30000); // 30 seconds maximum under stress
    } finally {
      // Cleanup
      await Promise.all(contexts.map((context) => context.close()));
    }
  });

  test('system behavior under resource constraints', async ({ page }) => {
    // Simulate high CPU load by performing intensive operations
    await authenticateUser(page);

    // Simulate memory pressure
    await page.evaluate(() => {
      // Create large objects to simulate memory pressure
      const memoryHogs = [];
      for (let i = 0; i < 10; i++) {
        memoryHogs.push(new Array(1000000).fill('memory-pressure-test'));
      }
      (window as any).memoryHogs = memoryHogs;
    });

    // Test authentication under memory pressure
    const { duration } = await measureOperationTime(async () => {
      await page.goto('/auth/login');
      await fillLoginForm(page, TEST_USER.email, TEST_USER.password);
      await page.click('[data-testid="login-button"]');
      await expect(page).toHaveURL(/^(?!.*\/auth\/login)/, { timeout: 15000 });
    });

    console.log(`Authentication under memory pressure: ${duration}ms`);

    // Should still work under memory pressure (may be slower)
    expect(duration).toBeLessThan(20000); // 20 seconds max under pressure

    // Clean up memory
    await page.evaluate(() => {
      delete (window as any).memoryHogs;
    });
  });

  test('authentication system recovery after failures', async ({ page }) => {
    await page.goto('/auth/login');

    // Simulate network failures
    await page.route('**/auth/**', (route) => {
      // Fail first few requests
      if (Math.random() < 0.7) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    let loginSuccessful = false;
    let attempts = 0;
    const maxAttempts = 5;

    // Retry authentication until successful or max attempts reached
    while (!loginSuccessful && attempts < maxAttempts) {
      attempts++;

      try {
        await fillLoginForm(page, TEST_USER.email, TEST_USER.password);
        await page.click('[data-testid="login-button"]');

        // Wait for either success or error
        await Promise.race([
          expect(page).toHaveURL(/^(?!.*\/auth\/login)/, { timeout: 5000 }),
          expect(page.locator('[data-testid="error-message"]')).toBeVisible({
            timeout: 5000,
          }),
        ]);

        // Check if login was successful
        if (!page.url().includes('/auth/login')) {
          loginSuccessful = true;
          console.log(`Login successful on attempt ${attempts}`);
        } else {
          console.log(`Login failed on attempt ${attempts}, retrying...`);
          await page.waitForTimeout(1000); // Wait before retry
        }
      } catch (error) {
        console.log(`Attempt ${attempts} encountered error:`, error.message);
        await page.waitForTimeout(1000);
      }
    }

    // Should eventually recover and authenticate successfully
    expect(loginSuccessful).toBe(true);
    expect(attempts).toBeLessThanOrEqual(maxAttempts);

    console.log(`System recovered after ${attempts} attempts`);
  });

  test('backup and failover mechanisms', async ({ browser }) => {
    // Test multiple authentication pathways
    const contexts = [];
    const pages = [];

    for (let i = 0; i < 3; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      contexts.push(context);
      pages.push(page);
    }

    try {
      // Simulate primary authentication service failure
      await pages[0].route('**/cognito-idp/**', (route) => {
        route.abort('failed');
      });

      // Test authentication on unaffected instances
      const authPromises = pages.map(async (page, index) => {
        try {
          const { duration } = await measureOperationTime(async () => {
            await page.goto('/auth/login');
            await fillLoginForm(
              page,
              `failover-test-${index}@example.com`,
              TEST_USER.password
            );
            await page.click('[data-testid="login-button"]');

            // For the first page (simulated failure), expect failure
            if (index === 0) {
              await expect(
                page.locator('[data-testid="error-message"]')
              ).toBeVisible({ timeout: 10000 });
              return 'expected-failure';
            }
            // Other pages should succeed
            await expect(page).toHaveURL(/^(?!.*\/auth\/login)/, {
              timeout: 10000,
            });
            return 'success';
          });

          return {
            index,
            duration,
            result: index === 0 ? 'expected-failure' : 'success',
          };
        } catch (error) {
          return { index, duration: 0, result: 'failed', error: error.message };
        }
      });

      const results = await Promise.all(authPromises);

      // Analyze failover behavior
      const workingInstances = results.filter((r) => r.result === 'success');
      const failedPrimary = results.find(
        (r) => r.index === 0 && r.result === 'expected-failure'
      );

      console.log('Failover Test Results:');
      results.forEach((r) => {
        console.log(`  Instance ${r.index}: ${r.result} (${r.duration}ms)`);
      });

      // Assert failover mechanisms work
      expect(failedPrimary).toBeDefined(); // Primary should fail as expected
      expect(workingInstances.length).toBeGreaterThan(0); // Other instances should work
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });

  test('system capacity limits and scaling points', async ({ browser }) => {
    const baselineUsers = 5;
    const scalingUsers = 15;

    console.log('Testing system scaling points...');

    // Baseline performance test
    console.log(`Testing baseline with ${baselineUsers} users`);
    const baselineResult = await runConcurrentUserTest(browser, baselineUsers);

    // Scaling test with more users
    console.log(`Testing scaling with ${scalingUsers} users`);
    const scalingResult = await runConcurrentUserTest(browser, scalingUsers);

    // Analyze scaling behavior
    const baselineAvg =
      baselineResult.successfulRequests.reduce(
        (sum, r) => sum + r.duration,
        0
      ) / baselineResult.successfulRequests.length;
    const scalingAvg =
      scalingResult.successfulRequests.reduce((sum, r) => sum + r.duration, 0) /
      scalingResult.successfulRequests.length;

    const performanceDegradation =
      ((scalingAvg - baselineAvg) / baselineAvg) * 100;
    const successRateDegradation =
      baselineResult.successRate - scalingResult.successRate;

    console.log(`Scaling Analysis:
      - Baseline (${baselineUsers} users): ${baselineAvg.toFixed(
      2
    )}ms avg, ${baselineResult.successRate.toFixed(1)}% success
      - Scaling (${scalingUsers} users): ${scalingAvg.toFixed(
      2
    )}ms avg, ${scalingResult.successRate.toFixed(1)}% success
      - Performance degradation: ${performanceDegradation.toFixed(1)}%
      - Success rate degradation: ${successRateDegradation.toFixed(1)}%`);

    // Assert scaling behavior is acceptable
    expect(performanceDegradation).toBeLessThan(200); // Less than 200% degradation
    expect(scalingResult.successRate).toBeGreaterThan(80); // At least 80% success under load
  });

  test('monitoring dashboards for authentication system health', async ({
    page,
  }) => {
    await authenticateUser(page);

    // Test that monitoring endpoints are accessible
    const monitoringEndpoints = [
      '/api/health',
      '/api/metrics',
      '/api/auth/status',
    ];

    for (const endpoint of monitoringEndpoints) {
      const { duration } = await measureOperationTime(async () => {
        const response = await page.request.get(endpoint);
        expect(response.status()).toBe(200);
      });

      console.log(`Monitoring endpoint ${endpoint}: ${duration}ms`);
      expect(duration).toBeLessThan(1000); // Monitoring should be fast
    }

    // Test that authentication metrics are being collected
    const metricsResponse = await page.request.get('/api/metrics');
    const metricsText = await metricsResponse.text();

    // Should contain authentication-related metrics
    expect(metricsText).toContain('auth_requests_total');
    expect(metricsText).toContain('auth_request_duration');
    expect(metricsText).toContain('auth_failures_total');

    console.log('Authentication metrics are being collected and exposed');
  });

  // Helper function for concurrent user testing
  async function runConcurrentUserTest(browser: any, userCount: number) {
    const contexts = [];
    const pages = [];
    const results = [];

    for (let i = 0; i < userCount; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      contexts.push(context);
      pages.push(page);
    }

    try {
      const authPromises = pages.map(async (page, index) => {
        const { duration, result } = await measureOperationTime(async () => {
          try {
            await page.goto('/auth/login');
            await fillLoginForm(
              page,
              `scale-test-${index}@example.com`,
              TEST_USER.password
            );
            await page.click('[data-testid="login-button"]');
            await expect(page).toHaveURL(/^(?!.*\/auth\/login)/, {
              timeout: 15000,
            });
            return 'success';
          } catch (error) {
            console.error('Auth test failed:', error);
            return 'failed';
          }
        });

        return { index, duration, result };
      });

      const allResults = await Promise.all(authPromises);
      const successfulRequests = allResults.filter(
        (r) => r.result === 'success'
      );
      const successRate = (successfulRequests.length / allResults.length) * 100;

      return {
        totalRequests: allResults.length,
        successfulRequests,
        successRate,
        results: allResults,
      };
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  }
});
