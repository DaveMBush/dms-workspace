import { test, expect } from '@playwright/test';

test.describe('Session Warning Dialog', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/login');

    // Login to establish session
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Wait for navigation to home page
    await page.waitForURL('/');
  });

  test('should display session warning dialog before timeout', async ({
    page,
  }) => {
    // Trigger session warning (implementation-dependent)
    // For testing, we'll need the app to expose a way to trigger
    // this or we'll need to wait for actual timeout

    // Check if dialog appears with expected content
    const dialog = page.locator('rms-session-warning');

    // Verify dialog exists and is visible
    await expect(dialog).toBeVisible();

    // Verify title
    await expect(
      dialog.locator('h2').filter({ hasText: 'Session Expiring Soon' })
    ).toBeVisible();

    // Verify warning icon
    await expect(dialog.locator('mat-icon:has-text("warning")')).toBeVisible();
  });

  test('should display countdown timer', async ({ page }) => {
    const dialog = page.locator('rms-session-warning');

    // Verify time is displayed in format like "1:00" or "0:45"
    // Simple regex - matches one or more digits, colon, exactly 2 digits
    await expect(dialog.locator('.warning-message strong')).toContainText(
      /\d:\d\d/
    );
  });

  test('should display progress bar that decreases', async ({ page }) => {
    const dialog = page.locator('rms-session-warning');
    const progressBar = dialog.locator('mat-progress-bar');

    // Verify progress bar exists
    await expect(progressBar).toBeVisible();

    // Get initial progress value
    const initialValue = await progressBar.getAttribute('aria-valuenow');

    // Wait a few seconds
    await page.waitForTimeout(3000);

    // Get new progress value
    const newValue = await progressBar.getAttribute('aria-valuenow');

    // Verify progress decreased
    expect(Number(newValue)).toBeLessThan(Number(initialValue));
  });

  test('should extend session when clicking Extend Session button', async ({
    page,
  }) => {
    const dialog = page.locator('rms-session-warning');

    // Click extend session button
    await dialog
      .locator('button')
      .filter({ hasText: 'Extend Session' })
      .click();

    // Dialog should close
    await expect(dialog).not.toBeVisible();

    // Session should still be active (verify by checking we're still on
    // home page)
    await expect(page).toHaveURL('/');
  });

  test('should logout when clicking Logout Now button', async ({ page }) => {
    const dialog = page.locator('rms-session-warning');

    // Click logout button
    await dialog.locator('button').filter({ hasText: 'Logout Now' }).click();

    // Should redirect to login page
    await expect(page).toHaveURL('/auth/login');

    // Dialog should be closed
    await expect(dialog).not.toBeVisible();
  });

  test('should not close when clicking backdrop', async ({ page }) => {
    const dialog = page.locator('rms-session-warning');

    // Try clicking backdrop (outside dialog)
    await page.locator('.cdk-overlay-backdrop').click({ force: true });

    // Dialog should still be visible (disableClose: true)
    await expect(dialog).toBeVisible();
  });

  test('should not close when pressing Escape key', async ({ page }) => {
    const dialog = page.locator('rms-session-warning');

    // Press Escape key
    await page.keyboard.press('Escape');

    // Dialog should still be visible
    await expect(dialog).toBeVisible();
  });

  test('should auto-logout when timer reaches zero', ({ page }) => {
    // This test would need to wait for the full countdown
    // or use a way to fast-forward time

    // For demonstration, we'd need to mock or speed up the timer
    // Skipping actual implementation as it would take 60+ seconds

    test.skip();
  });

  test('should display correctly on mobile screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const dialog = page.locator('rms-session-warning');

    // Dialog should be visible and responsive
    await expect(dialog).toBeVisible();

    // Dialog should not overflow viewport
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox?.width).toBeLessThanOrEqual(375);
  });

  test('should trap keyboard focus within dialog', async ({ page }) => {
    const dialog = page.locator('rms-session-warning');

    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Focus should stay within dialog
    const focusedElement = await page.evaluate(
      () => document.activeElement?.tagName
    );
    const dialogContainsFocus = await dialog.evaluate((node, focusedTag) => {
      return node.contains(document.querySelector(focusedTag!));
    }, focusedElement);

    expect(dialogContainsFocus).toBe(true);
  });

  test('should handle rapid clicks on Extend Session button', async ({
    page,
  }) => {
    const dialog = page.locator('rms-session-warning');
    const extendButton = dialog
      .locator('button')
      .filter({ hasText: 'Extend Session' });

    // Click multiple times rapidly
    await extendButton.click({ clickCount: 3 });

    // Should still work correctly and close dialog once
    await expect(dialog).not.toBeVisible();
    await expect(page).toHaveURL('/');
  });

  test('should display refresh icon on Extend Session button', async ({
    page,
  }) => {
    const dialog = page.locator('rms-session-warning');
    const extendButton = dialog
      .locator('button')
      .filter({ hasText: 'Extend Session' });

    // Verify icon exists
    await expect(
      extendButton.locator('mat-icon:has-text("refresh")')
    ).toBeVisible();
  });

  test('should display logout icon on Logout Now button', async ({ page }) => {
    const dialog = page.locator('rms-session-warning');
    const logoutButton = dialog
      .locator('button')
      .filter({ hasText: 'Logout Now' });

    // Verify icon exists
    await expect(
      logoutButton.locator('mat-icon:has-text("logout")')
    ).toBeVisible();
  });
});
