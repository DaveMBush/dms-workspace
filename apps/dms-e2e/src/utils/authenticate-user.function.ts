import { expect, Page } from '@playwright/test';

import { TEST_USER } from './default-test-user.constant';
import { TestUser } from './test-user.interface';

/**
 * Authenticate a user for E2E tests
 */
export async function authenticateUser(
  page: Page,
  user: TestUser = TEST_USER
): Promise<void> {
  await page.goto('/auth/login');

  // Fill login form
  await page.fill('[data-testid="email-input"]', user.email);
  // p-password is a PrimeNG component - target the input inside it
  await page.fill('[data-testid="password-input"] input', user.password);

  // Submit login
  await page.click('[data-testid="login-button"]');

  // Wait for successful login (redirect to main app)
  await expect(page).toHaveURL(/^(?!.*\/auth\/login)/);

  // Verify authenticated state
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
}
