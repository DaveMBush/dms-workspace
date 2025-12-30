import { test, expect } from 'playwright/test';

test.describe('Theme Switching', () => {
  test.beforeEach(async ({ page }) => {
    // Clear theme preference
    await page.goto('/login');
    await page.evaluate(() => localStorage.removeItem('dms-theme'));
  });

  test('should default to light theme on login page', async ({ page }) => {
    await page.goto('/login');
    const body = page.locator('body');
    await expect(body).not.toHaveClass(/dark-theme/);
  });

  test('should apply theme before content loads (no flash)', async ({
    page,
  }) => {
    // Set dark theme in localStorage first
    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('dms-theme', 'dark'));

    // Navigate and check theme is applied immediately
    await page.goto('/login');
    const body = page.locator('body');
    await expect(body).toHaveClass(/dark-theme/);
  });

  test('should apply theme to login page on reload', async ({ page }) => {
    // Set dark theme preference directly in localStorage (simulating user had dark theme)
    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('dms-theme', 'dark'));

    // Reload login page - theme should be applied immediately
    await page.reload();

    // Theme should be applied to login page (on body element)
    const body = page.locator('body');
    await expect(body).toHaveClass(/dark-theme/);
  });

  test('should persist theme preference in localStorage', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('dms-theme', 'dark'));

    // Check localStorage
    const theme = await page.evaluate(() => localStorage.getItem('dms-theme'));
    expect(theme).toBe('dark');
  });

  test('should toggle theme when clicking theme button after login', async ({
    page,
  }) => {
    await page.goto('/auth/login');
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/dashboard/);

    const body = page.locator('body');
    const themeButton = page.locator('button[aria-label="Toggle theme"]');

    // Initially light theme
    await expect(body).not.toHaveClass(/dark-theme/);

    // Toggle to dark
    await themeButton.click();
    await expect(body).toHaveClass(/dark-theme/);

    // Toggle back to light
    await themeButton.click();
    await expect(body).not.toHaveClass(/dark-theme/);
  });

  test('should apply dark theme before login page displays', async ({
    page,
  }) => {
    // Set dark theme in localStorage before navigating
    await page.goto('/auth/login');
    await page.evaluate(() => localStorage.setItem('dms-theme', 'dark'));

    // Navigate to login page
    await page.goto('/auth/login');

    // Theme should be applied immediately (before content loads)
    const body = page.locator('body');
    await expect(body).toHaveClass(/dark-theme/);
  });

  test('should update localStorage when toggling theme', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/dashboard/);

    const themeButton = page.locator('button[aria-label="Toggle theme"]');

    // Toggle to dark
    await themeButton.click();
    await page.waitForTimeout(100);

    let theme = await page.evaluate(() => localStorage.getItem('dms-theme'));
    expect(theme).toBe('dark');

    // Toggle to light
    await themeButton.click();
    await page.waitForTimeout(100);

    theme = await page.evaluate(() => localStorage.getItem('dms-theme'));
    expect(theme).toBe('light');
  });

  test('should show correct theme icon when toggling', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/dashboard/);

    const themeButton = page.locator('button[aria-label="Toggle theme"]');

    // In light mode, should show dark_mode icon
    await expect(themeButton.locator('mat-icon')).toContainText('dark_mode');

    // Toggle to dark
    await themeButton.click();

    // In dark mode, should show light_mode icon
    await expect(themeButton.locator('mat-icon')).toContainText('light_mode');
  });

  test('should handle invalid theme value in localStorage', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('dms-theme', 'invalid'));

    await page.reload();

    // Should default to light theme
    const body = page.locator('body');
    await expect(body).not.toHaveClass(/dark-theme/);
  });

  test('should restore theme after app restart', async ({ page, context }) => {
    await page.goto('/auth/login');
    await page.evaluate(() => localStorage.setItem('dms-theme', 'dark'));

    // Close and reopen
    await page.close();
    const newPage = await context.newPage();
    await newPage.goto('/auth/login');

    // Theme should still be dark
    const body = newPage.locator('body');
    await expect(body).toHaveClass(/dark-theme/);
  });
});
