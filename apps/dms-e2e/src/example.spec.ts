import { expect, test } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // App redirects unauthenticated users to login page
  expect(await page.locator('h1').innerText()).toContain(
    'Dividend Management System Login'
  );
});
