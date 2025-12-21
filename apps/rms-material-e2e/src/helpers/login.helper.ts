import { Page } from 'playwright/test';

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
  await page.waitForURL('**/dashboard');
}
