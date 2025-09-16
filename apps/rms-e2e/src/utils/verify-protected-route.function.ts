import { Page } from '@playwright/test';

/**
 * Navigate to a protected route and verify authentication is required
 */
export async function verifyProtectedRoute(
  page: Page,
  route: string
): Promise<void> {
  await page.goto(route);

  // Should redirect to login with return URL
  const expectedUrl = `/auth/login?returnUrl=${encodeURIComponent(route)}`;
  await page.waitForURL(function checkUrlContainsReturnUrl(
    url: string
  ): boolean {
    return url.includes(expectedUrl);
  });
}
