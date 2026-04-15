import { expect, test } from '@playwright/test';

import { login } from './helpers/login.helper';

test.describe('Error Logs Navigation', () => {
  test.beforeEach(async function loginBeforeEach({ page }) {
    await login(page);
  });

  test('navigates to error logs page via nav link', async function navigateToErrorLogs({
    page,
  }) {
    const navLink = page.locator('[data-testid="global-nav-error-logs"]');
    await navLink.click();

    await expect(page).toHaveURL(/\/global\/error-logs$/);
    await expect(page.locator('mat-toolbar', { hasText: 'Error Logs' })).toBeVisible();
  });
});
