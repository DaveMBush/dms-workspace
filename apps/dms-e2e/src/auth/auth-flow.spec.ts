import { test, expect } from '@playwright/test';

import { authenticateUser } from '../utils/authenticate-user.function';
import { TEST_USER } from '../utils/default-test-user.constant';
import { fillLoginForm } from '../utils/fill-login-form.function';
import { logoutUser } from '../utils/logout-user.function';
import { measureOperationTime } from '../utils/performance-helpers.function';
import { mockTokenExpiration } from '../utils/mock-token-expiration.function';
import { setRememberMe } from '../utils/set-remember-me.function';
import { verifyAuthError } from '../utils/verify-auth-error.function';
import { verifyProtectedRoute } from '../utils/verify-protected-route.function';

test.describe('Authentication Flow', () => {
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

  test('complete login to logout flow', async ({ page }) => {
    // Navigate to application
    await page.goto('/');

    // Should redirect to login page
    await page.waitForURL(function checkLoginUrl(url) {
      return url.includes('/auth/login');
    });

    // Fill login form
    await page.fill('[data-testid="email-input"]', TEST_USER.email);
    // p-password is a PrimeNG component - target the input inside it
    await page.fill('[data-testid="password-input"] input', TEST_USER.password);

    // Submit login
    await page.click('[data-testid="login-button"]');

    // Should redirect to main application (not login page)
    await page.waitForURL(function checkNotLoginUrl(url) {
      return !url.includes('/auth/login');
    });

    // Verify authenticated state
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

    // Navigate to protected route
    await page.click('[data-testid="universe-link"]');
    await expect(page).toHaveURL('/global/universe');

    // Logout
    await logoutUser(page);

    // Should redirect to login
    await page.waitForURL(function checkLoginUrl(url) {
      return url.includes('/auth/login');
    });
  });

  test('authentication failure handling', async ({ page }) => {
    await page.goto('/auth/login');

    // Try invalid credentials
    await fillLoginForm(page, 'invalid@example.com', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    // Should show error message
    await verifyAuthError(page, 'Incorrect username or password');

    // Should remain on login page
    await page.waitForURL(function checkLoginUrl(url) {
      return url.includes('/auth/login');
    });
  });

  test('form validation errors', async ({ page }) => {
    await page.goto('/auth/login');

    // Test empty email
    await page.click('[data-testid="email-input"]');
    await page.click('[data-testid="password-input"]'); // Trigger blur
    await expect(
      page.locator('[data-testid="email-error-message"]')
    ).toContainText('Email is required');

    // Test invalid email format
    await fillLoginForm(page, 'invalid-email', '');
    await page.click('[data-testid="password-input"]'); // Trigger blur
    await expect(
      page.locator('[data-testid="email-error-message"]')
    ).toContainText('Please enter a valid email address');

    // Test empty password
    await page.click('[data-testid="password-input"]');
    await page.click('[data-testid="email-input"]'); // Trigger blur
    await expect(
      page.locator('[data-testid="password-error-message"]')
    ).toContainText('Password is required');

    // Test short password
    await fillLoginForm(page, TEST_USER.email, '123');
    await page.click('[data-testid="email-input"]'); // Trigger blur
    await expect(
      page.locator('[data-testid="password-error-message"]')
    ).toContainText('Password must be at least 8 characters long');
  });

  test('protected route access without authentication', async ({ page }) => {
    // Try to access protected route directly
    await verifyProtectedRoute(page, '/global/universe');

    // Login and verify redirect to original URL
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password);
    await page.click('[data-testid="login-button"]');

    // Should redirect to original requested URL
    await expect(page).toHaveURL('/global/universe');
  });

  test('remember me functionality', async ({ page }) => {
    await page.goto('/auth/login');

    // Enable remember me
    await setRememberMe(page, true);
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password);
    await page.click('[data-testid="login-button"]');

    // Should login successfully
    await page.waitForURL(function checkNotLoginUrl(url) {
      return !url.includes('/auth/login');
    });

    // Check that remember me preference is stored
    const rememberMeStored = await page.evaluate(
      () => localStorage.getItem('dms_remember_me') === 'true'
    );
    expect(rememberMeStored).toBe(true);

    // Logout
    await logoutUser(page);

    // Navigate back to login page
    await page.goto('/auth/login');

    // Remember me should still be checked
    const isRememberMeChecked = await page
      .locator('[data-testid="remember-me-checkbox"]')
      .isChecked();
    expect(isRememberMeChecked).toBe(true);
  });

  test('token refresh during session', async ({ page }) => {
    // Login first
    await authenticateUser(page);
    await page.goto('/global/universe');

    // Mock token near expiration
    await mockTokenExpiration(page);

    // Make API request that should trigger refresh
    // Navigate to another route to trigger API calls
    await page.click('[data-testid="screener-link"]');
    await expect(page).toHaveURL('/global/screener');

    // Verify session continues without interruption
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('session timeout handling', async ({ page }) => {
    // Login first
    await authenticateUser(page);

    // Mock expired session
    await page.evaluate(() => {
      // Clear all tokens to simulate session timeout
      sessionStorage.clear();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    });

    // Try to navigate to protected route
    await page.goto('/global/universe');

    // Should redirect to login
    await page.waitForURL(function checkLoginUrl(url) {
      return url.includes('/auth/login');
    });
  });

  test('login performance benchmark', async ({ page }) => {
    await page.goto('/auth/login');

    const { duration } = await measureOperationTime(async () => {
      await fillLoginForm(page, TEST_USER.email, TEST_USER.password);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL(function checkNotLoginUrl(url) {
        return !url.includes('/auth/login');
      });
    });

    console.log(`Login completed in ${duration}ms`);

    // Assert login completes within acceptable timeframe (5 seconds)
    expect(duration).toBeLessThan(5000);
  });

  test('cross-browser compatibility', async ({ page, browserName }) => {
    await page.goto('/auth/login');

    // Test login flow works across all browsers
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password);
    await page.click('[data-testid="login-button"]');

    // Should work in all browsers
    await page.waitForURL(function checkNotLoginUrl(url) {
      return !url.includes('/auth/login');
    });
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

    console.log(`Authentication successful in ${browserName}`);
  });

  test('network failure handling', async ({ page }) => {
    await page.goto('/auth/login');

    // Intercept auth requests and simulate network failure
    await page.route('**/auth/**', (route) => {
      route.abort('failed');
    });

    await fillLoginForm(page, TEST_USER.email, TEST_USER.password);
    await page.click('[data-testid="login-button"]');

    // Should show appropriate error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await page.waitForURL(function checkLoginUrl(url) {
      return url.includes('/auth/login');
    });
  });

  test('concurrent login attempts', async ({ browser }) => {
    const contexts = [];
    const pages = [];

    // Create 3 concurrent user sessions
    for (let i = 0; i < 3; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      contexts.push(context);
      pages.push(page);
    }

    try {
      // Concurrent login attempts
      const loginPromises = pages.map(async (page, index) => {
        const startTime = Date.now();
        await page.goto('/auth/login');
        await fillLoginForm(
          page,
          `testuser${index}@example.com`,
          TEST_USER.password
        );
        await page.click('[data-testid="login-button"]');
        await page.waitForURL(function checkNotLoginUrl(url) {
          return !url.includes('/auth/login');
        });
        return Date.now() - startTime;
      });

      const loginTimes = await Promise.all(loginPromises);
      const maxLoginTime = Math.max(...loginTimes);

      console.log(`Max concurrent login time: ${maxLoginTime}ms`);
      expect(maxLoginTime).toBeLessThan(10000); // 10 seconds max under load
    } finally {
      // Cleanup
      await Promise.all(contexts.map((context) => context.close()));
    }
  });
});
