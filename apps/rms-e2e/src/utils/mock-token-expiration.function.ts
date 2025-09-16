import { Page } from '@playwright/test';

/**
 * Mock token expiration for testing refresh scenarios
 */
export async function mockTokenExpiration(page: Page): Promise<void> {
  await page.evaluate(function createExpiredToken() {
    // Mock expired access token
    const expiredPayload = {
      exp: Math.floor(Date.now() / 1000) - 100, // Expired 100 seconds ago
      iat: Math.floor(Date.now() / 1000) - 3700, // Issued 1 hour and 100 seconds ago
      sub: 'test-user-id',
    };

    const header = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' })
    ).toString('base64');
    const payload = Buffer.from(JSON.stringify(expiredPayload)).toString(
      'base64'
    );
    const signature = 'mock-signature';

    const expiredToken = `${header}.${payload}.${signature}`;

    // Set expired token in session storage
    sessionStorage.setItem('accessToken', expiredToken);
  });
}
