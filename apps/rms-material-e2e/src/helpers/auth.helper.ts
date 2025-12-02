import { Page } from '@playwright/test';

/**
 * Login helper for e2e tests
 * Uses mock auth which accepts any email/password on localhost
 */
export async function login(
  page: Page,
  email = 'test@example.com',
  password = 'password123'
): Promise<void> {
  await page.goto('/auth/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  // Wait for navigation to complete (should redirect to dashboard)
  await page.waitForURL('**/');
}

/**
 * Navigate to profile page via the user menu
 * This maintains the authenticated session properly
 */
export async function navigateToProfile(page: Page): Promise<void> {
  const userMenuButton = page.locator('button[aria-label="User menu"]');
  await userMenuButton.click();

  const profileMenuItem = page.locator('a[mat-menu-item]', {
    hasText: 'Profile',
  });

  await Promise.all([page.waitForURL('/profile'), profileMenuItem.click()]);
}
