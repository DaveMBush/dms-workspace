import { expect, Page } from '@playwright/test';

/**
 * Verify authentication error message
 */
export async function verifyAuthError(
  page: Page,
  expectedError: string
): Promise<void> {
  await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  await expect(page.locator('[data-testid="error-message"]')).toContainText(
    expectedError
  );
}
