import { Page } from '@playwright/test';

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
