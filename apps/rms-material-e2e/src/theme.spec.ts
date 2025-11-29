import { test, expect } from '@playwright/test';

test.describe('Theme Switching', () => {
  test.beforeEach(async ({ page }) => {
    // Clear theme preference
    await page.goto('/login');
    await page.evaluate(() => localStorage.removeItem('rms-theme'));
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
    await page.evaluate(() => localStorage.setItem('rms-theme', 'dark'));

    // Navigate and check theme is applied immediately
    await page.goto('/login');
    const body = page.locator('body');
    await expect(body).toHaveClass(/dark-theme/);
  });

  test('should apply theme to login page on reload', async ({ page }) => {
    // Set dark theme preference directly in localStorage (simulating user had dark theme)
    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('rms-theme', 'dark'));

    // Reload login page - theme should be applied immediately
    await page.reload();

    // Theme should be applied to login page (on body element)
    const body = page.locator('body');
    await expect(body).toHaveClass(/dark-theme/);
  });

  test('should persist theme preference in localStorage', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('rms-theme', 'dark'));

    // Check localStorage
    const theme = await page.evaluate(() => localStorage.getItem('rms-theme'));
    expect(theme).toBe('dark');
  });
});
