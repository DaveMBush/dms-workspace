import { test, expect } from '@playwright/test';

test.describe('Theme Switching', () => {
  test.beforeEach(async ({ page }) => {
    // Clear theme preference
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('rms-theme'));
  });

  test('should default to light theme', async ({ page }) => {
    await page.goto('/');
    const body = page.locator('body');
    await expect(body).not.toHaveClass(/dark-theme/);
  });

  test('should toggle to dark theme when clicking theme button', async ({
    page,
  }) => {
    await page.goto('/');

    const themeButton = page.locator('button[aria-label="Toggle theme"]');
    await expect(themeButton).toBeVisible();

    // Verify light theme icon
    await expect(
      page.locator('mat-icon', { hasText: 'dark_mode' })
    ).toBeVisible();

    // Click to switch to dark theme
    await themeButton.click();

    const body = page.locator('body');
    await expect(body).toHaveClass(/dark-theme/);

    // Verify dark theme icon changed
    await expect(
      page.locator('mat-icon', { hasText: 'light_mode' })
    ).toBeVisible();
  });

  test('should toggle back to light theme', async ({ page }) => {
    await page.goto('/');

    const themeButton = page.locator('button[aria-label="Toggle theme"]');
    const body = page.locator('body');

    // Switch to dark
    await themeButton.click();
    await expect(body).toHaveClass(/dark-theme/);

    // Switch back to light
    await themeButton.click();
    await expect(body).not.toHaveClass(/dark-theme/);
  });

  test('should persist theme preference in localStorage', async ({ page }) => {
    await page.goto('/');

    // Switch to dark theme
    await page.locator('button[aria-label="Toggle theme"]').click();

    // Check localStorage
    const theme = await page.evaluate(() => localStorage.getItem('rms-theme'));
    expect(theme).toBe('dark');
  });

  test('should load persisted theme on page reload', async ({ page }) => {
    await page.goto('/');

    const body = page.locator('body');

    // Switch to dark theme
    await page.locator('button[aria-label="Toggle theme"]').click();
    await expect(body).toHaveClass(/dark-theme/);

    // Reload page
    await page.reload();

    // Theme should still be dark
    await expect(body).toHaveClass(/dark-theme/);
    await expect(
      page.locator('mat-icon', { hasText: 'light_mode' })
    ).toBeVisible();
  });

  test('should apply theme before content loads (no flash)', async ({
    page,
  }) => {
    // Set dark theme in localStorage first
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('rms-theme', 'dark'));

    // Navigate and check theme is applied immediately
    await page.goto('/');
    const body = page.locator('body');
    await expect(body).toHaveClass(/dark-theme/);
  });

  test('should apply theme to login page', async ({ page }) => {
    // Set dark theme preference directly in localStorage (simulating user had dark theme)
    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('rms-theme', 'dark'));

    // Reload login page - theme should be applied immediately
    await page.reload();

    // Theme should be applied to login page (on body element)
    const body = page.locator('body');
    await expect(body).toHaveClass(/dark-theme/);
  });
});
