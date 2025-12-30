import { Page } from '@playwright/test';

/**
 * Wait for API requests with authentication headers
 */
export async function waitForAuthenticatedApiRequest(
  page: Page,
  urlPattern: RegExp | string
): Promise<void> {
  const apiResponse = page.waitForResponse(function checkAuthenticatedResponse(
    response
  ) {
    const url = response.url();
    const isMatch =
      typeof urlPattern === 'string'
        ? url.includes(urlPattern)
        : urlPattern.test(url);
    return (
      isMatch && response.request().headers()['authorization'] !== undefined
    );
  });

  await apiResponse;
}
