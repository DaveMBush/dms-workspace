import { test, expect } from 'playwright/test';

import { login } from './helpers/login.helper';

test.describe('Logout', () => {
  test('should display user menu button in toolbar', async ({ page }) => {
    await login(page);

    const userMenuButton = page.locator('button[aria-label="User menu"]');
    await expect(userMenuButton).toBeVisible();
    await expect(userMenuButton.locator('mat-icon')).toContainText(
      'account_circle'
    );
  });

  test('should open user menu when clicked', async ({ page }) => {
    await login(page);

    const userMenuButton = page.locator('button[aria-label="User menu"]');
    await userMenuButton.click();

    // Menu items should be visible in the CDK overlay
    await expect(
      page.locator('a[mat-menu-item]', { hasText: 'Profile' })
    ).toBeVisible();
    await expect(
      page.locator('button[mat-menu-item]', { hasText: 'Logout' })
    ).toBeVisible();
  });

  test('should show profile and logout options with icons', async ({
    page,
  }) => {
    await login(page);

    await page.locator('button[aria-label="User menu"]').click();

    const profileItem = page.locator('a[mat-menu-item]', {
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

  test('should show confirmation dialog when clicking logout', async ({
    page,
  }) => {
    await login(page);

    await page.locator('button[aria-label="User menu"]').click();
    await page.locator('button[mat-menu-item]', { hasText: 'Logout' }).click();

    // Should show confirmation dialog
    await expect(page.getByText('Confirm Logout')).toBeVisible();
    await expect(
      page.getByText('Are you sure you want to log out?')
    ).toBeVisible();
  });

  test('should redirect to login when confirming logout', async ({ page }) => {
    await login(page);

    await page.locator('button[aria-label="User menu"]').click();
    await page.locator('button[mat-menu-item]', { hasText: 'Logout' }).click();

    // Confirm the logout dialog
    await page.locator('button', { hasText: 'Logout' }).last().click();

    // Should redirect to login page
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should stay on page when canceling logout', async ({ page }) => {
    await login(page);

    await page.locator('button[aria-label="User menu"]').click();
    await page.locator('button[mat-menu-item]', { hasText: 'Logout' }).click();

    // Cancel the logout dialog
    await page.locator('button', { hasText: 'Cancel' }).click();

    // Should stay on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should close menu when clicking outside', async ({ page }) => {
    await login(page);

    const userMenuButton = page.locator('button[aria-label="User menu"]');
    await userMenuButton.click();

    // Menu items should be visible
    await expect(
      page.locator('button[mat-menu-item]', { hasText: 'Logout' })
    ).toBeVisible();

    // Click the CDK overlay backdrop to close menu
    await page.locator('.cdk-overlay-backdrop').click();

    // Menu items should disappear
    await expect(
      page.locator('button[mat-menu-item]', { hasText: 'Logout' })
    ).not.toBeVisible();
  });

  test('should show user menu in both light and dark themes', async ({
    page,
  }) => {
    await login(page);

    // Test in light theme
    await page.locator('button[aria-label="User menu"]').click();
    await expect(
      page.locator('button[mat-menu-item]', { hasText: 'Logout' })
    ).toBeVisible();
    await page.keyboard.press('Escape');

    // Switch to dark theme
    await page.locator('button[aria-label="Toggle theme"]').click();

    // Test in dark theme
    await page.locator('button[aria-label="User menu"]').click();
    await expect(
      page.locator('button[mat-menu-item]', { hasText: 'Logout' })
    ).toBeVisible();
  });

  test('should close menu when pressing Escape key', async ({ page }) => {
    await login(page);

    await page.locator('button[aria-label="User menu"]').click();

    // Menu should be visible
    await expect(
      page.locator('button[mat-menu-item]', { hasText: 'Logout' })
    ).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Menu should close
    await expect(
      page.locator('button[mat-menu-item]', { hasText: 'Logout' })
    ).not.toBeVisible();
  });

  test('should toggle menu when clicking user menu button', async ({
    page,
  }) => {
    await login(page);

    const userMenuButton = page.locator('button[aria-label="User menu"]');
    const logoutMenuItem = page.locator('button[mat-menu-item]', {
      hasText: 'Logout',
    });

    // Open menu
    await userMenuButton.click();
    await expect(logoutMenuItem).toBeVisible();

    // Close menu by clicking outside or waiting for it to close
    await page.locator('body').click({ position: { x: 0, y: 0 } });
    await expect(logoutMenuItem).not.toBeVisible();

    // Open menu again
    await userMenuButton.click();
    await expect(logoutMenuItem).toBeVisible();
  });

  test('should close logout dialog when pressing Escape', async ({ page }) => {
    await login(page);

    await page.locator('button[aria-label="User menu"]').click();
    await page.locator('button[mat-menu-item]', { hasText: 'Logout' }).click();

    // Dialog should be visible
    await expect(page.getByText('Confirm Logout')).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Should stay on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should disable logout button during logout process', async ({
    page,
  }) => {
    await login(page);

    await page.locator('button[aria-label="User menu"]').click();
    await page.locator('button[mat-menu-item]', { hasText: 'Logout' }).click();

    // Click logout in dialog
    const logoutButton = page.locator('button', { hasText: 'Logout' }).last();
    await logoutButton.click();

    // Should navigate to login (logout completed)
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should not show user menu on login page', async ({ page }) => {
    await page.goto('/auth/login');

    const userMenuButton = page.locator('button[aria-label="User menu"]');
    await expect(userMenuButton).not.toBeVisible();
  });
});
