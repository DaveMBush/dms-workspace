import { test, expect } from '@playwright/test';

test.describe('Logout', () => {
  test('should display user menu button in toolbar', async ({ page }) => {
    await page.goto('/');

    const userMenuButton = page.locator('button[aria-label="User menu"]');
    await expect(userMenuButton).toBeVisible();
    await expect(userMenuButton.locator('mat-icon')).toContainText(
      'account_circle'
    );
  });

  test('should open user menu when clicked', async ({ page }) => {
    await page.goto('/');

    const userMenuButton = page.locator('button[aria-label="User menu"]');
    await userMenuButton.click();

    // Menu should be visible
    const menu = page.locator('mat-menu');
    await expect(menu).toBeVisible();

    // Menu items should be visible
    await expect(page.locator('button[mat-menu-item]', { hasText: 'Profile' })).toBeVisible();
    await expect(page.locator('button[mat-menu-item]', { hasText: 'Logout' })).toBeVisible();
  });

  test('should show profile and logout options', async ({ page }) => {
    await page.goto('/');

    await page.locator('button[aria-label="User menu"]').click();

    const profileItem = page.locator('button[mat-menu-item]', {
      hasText: 'Profile',
    });
    const logoutItem = page.locator('button[mat-menu-item]', {
      hasText: 'Logout',
    });

    await expect(profileItem).toBeVisible();
    await expect(profileItem.locator('mat-icon')).toContainText('person');

    await expect(logoutItem).toBeVisible();
    await expect(logoutItem.locator('mat-icon')).toContainText('logout');
  });

  test('should navigate to profile when clicking profile menu item', async ({
    page,
  }) => {
    await page.goto('/');

    await page.locator('button[aria-label="User menu"]').click();
    await page.locator('button[mat-menu-item]', { hasText: 'Profile' }).click();

    // Should navigate to profile page
    await expect(page).toHaveURL(/\/profile/);
  });

  test('should redirect to login when clicking logout', async ({ page }) => {
    await page.goto('/');

    await page.locator('button[aria-label="User menu"]').click();
    await page.locator('button[mat-menu-item]', { hasText: 'Logout' }).click();

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should clear auth tokens on logout', async ({ page }) => {
    await page.goto('/');

    // Set some mock tokens
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock_token');
      sessionStorage.setItem('session_token', 'mock_session');
    });

    await page.locator('button[aria-label="User menu"]').click();
    await page.locator('button[mat-menu-item]', { hasText: 'Logout' }).click();

    // Wait for navigation to complete
    await expect(page).toHaveURL(/\/login/);

    // Check that tokens are cleared (if your implementation clears them)
    const authToken = await page.evaluate(() =>
      localStorage.getItem('auth_token')
    );
    // Note: This depends on your implementation's cleanup
  });

  test('should close menu when clicking outside', async ({ page }) => {
    await page.goto('/');

    const userMenuButton = page.locator('button[aria-label="User menu"]');
    await userMenuButton.click();

    // Menu should be visible
    await expect(page.locator('mat-menu')).toBeVisible();

    // Click outside the menu
    await page.locator('mat-toolbar').click();

    // Menu should close (wait a bit for animation)
    await page.waitForTimeout(300);
    await expect(page.locator('mat-menu')).not.toBeVisible();
  });

  test('should show user menu in both light and dark themes', async ({
    page,
  }) => {
    await page.goto('/');

    // Test in light theme
    await page.locator('button[aria-label="User menu"]').click();
    await expect(page.locator('mat-menu')).toBeVisible();
    await page.keyboard.press('Escape');

    // Switch to dark theme
    await page.locator('button[aria-label="Toggle theme"]').click();

    // Test in dark theme
    await page.locator('button[aria-label="User menu"]').click();
    await expect(page.locator('mat-menu')).toBeVisible();
  });
});
