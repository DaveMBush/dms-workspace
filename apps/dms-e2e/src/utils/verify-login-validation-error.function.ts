import { expect, Page } from '@playwright/test';

/**
 * Verify login form validation errors
 */
export async function verifyLoginValidationError(
  page: Page,
  errorMessage: string
): Promise<void> {
  await expect(
    page.locator(
      '[data-testid="email-error-message"], [data-testid="password-error-message"]'
    )
  ).toContainText(errorMessage);
}
