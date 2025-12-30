import { expect, Page } from '@playwright/test';

/**
 * Logout user for E2E tests
 */
export async function logoutUser(page: Page): Promise<void> {
  // Click logout button
  await page.click('[data-testid="logout-button"]');

  // Wait for confirmation dialog and confirm
  const confirmDialog = page.locator('[data-testid="confirm-dialog"]');
  await expect(confirmDialog).toBeVisible();

  // Click the confirm logout button in the dialog
  await page.click('p-confirmdialog .p-confirm-dialog-accept');

  // Should redirect to login page
  await page.waitForURL(function checkLoginRedirect(url: string): boolean {
    return url.includes('/auth/login');
  });
}
