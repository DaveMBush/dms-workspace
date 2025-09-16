import { Page } from '@playwright/test';

/**
 * Fill login form but don't submit (for testing validation)
 */
export async function fillLoginForm(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
}
