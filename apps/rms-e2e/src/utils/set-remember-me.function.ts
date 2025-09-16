import { Page } from '@playwright/test';

/**
 * Set remember me option
 */
export async function setRememberMe(
  page: Page,
  remember: boolean
): Promise<void> {
  const checkbox = page.locator('[data-testid="remember-me-checkbox"]');

  if (remember) {
    await checkbox.check();
  } else {
    await checkbox.uncheck();
  }
}
