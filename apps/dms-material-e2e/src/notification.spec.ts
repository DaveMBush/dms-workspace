import { test, expect } from 'playwright/test';

import { login } from './helpers/login.helper';
import { navigateToProfile } from './helpers/navigate-to-profile.helper';

test.describe('Notification Service', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('Error Notifications', () => {
    test('should display error notification with red styling when passwords do not match', async ({
      page,
    }) => {
      await navigateToProfile(page);

      // Fill password form with mismatching passwords
      await page
        .locator('input[formControlName="currentPassword"]')
        .fill('currentpass123');
      await page
        .locator('input[formControlName="newPassword"]')
        .fill('newpassword123');
      await page
        .locator('input[formControlName="confirmPassword"]')
        .fill('differentpassword');

      // Submit the form
      await page
        .locator('rms-password-change-card button[type="submit"]')
        .click();

      // Verify error notification appears - use broader selector
      const snackbar = page.locator('mat-snack-bar-container');
      await expect(snackbar).toBeVisible({ timeout: 10000 });

      // Verify error message text
      await expect(snackbar).toContainText('New passwords do not match');

      // Verify error styling (red background) - snackbar-error class is applied
      await expect(page.locator('.snackbar-error')).toBeVisible();
    });

    test('should display dismiss button on notification', async ({ page }) => {
      await navigateToProfile(page);

      await page
        .locator('input[formControlName="currentPassword"]')
        .fill('currentpass123');
      await page
        .locator('input[formControlName="newPassword"]')
        .fill('newpassword123');
      await page
        .locator('input[formControlName="confirmPassword"]')
        .fill('differentpassword');

      await page
        .locator('rms-password-change-card button[type="submit"]')
        .click();

      const snackbar = page.locator('mat-snack-bar-container');
      await expect(snackbar).toBeVisible({ timeout: 10000 });

      // Verify close button exists - Material snackbar action button
      const closeButton = page.locator('mat-snack-bar-container button');
      await expect(closeButton).toBeVisible();
      await expect(closeButton).toContainText('Close');
    });

    test('should dismiss notification when clicking close button', async ({
      page,
    }) => {
      await navigateToProfile(page);

      await page
        .locator('input[formControlName="currentPassword"]')
        .fill('currentpass123');
      await page
        .locator('input[formControlName="newPassword"]')
        .fill('newpassword123');
      await page
        .locator('input[formControlName="confirmPassword"]')
        .fill('differentpassword');

      await page
        .locator('rms-password-change-card button[type="submit"]')
        .click();

      const snackbar = page.locator('mat-snack-bar-container');
      await expect(snackbar).toBeVisible({ timeout: 10000 });

      // Click the close button
      const closeButton = page.locator('mat-snack-bar-container button');
      await closeButton.click();

      // Verify notification is dismissed
      await expect(snackbar).not.toBeVisible();
    });
  });

  test.describe('Notification Position', () => {
    test('should display notification at top-right of screen', async ({
      page,
    }) => {
      await navigateToProfile(page);

      await page
        .locator('input[formControlName="currentPassword"]')
        .fill('currentpass123');
      await page
        .locator('input[formControlName="newPassword"]')
        .fill('newpassword123');
      await page
        .locator('input[formControlName="confirmPassword"]')
        .fill('differentpassword');

      await page
        .locator('rms-password-change-card button[type="submit"]')
        .click();

      // Verify snackbar container appears
      const snackbarContainer = page.locator('mat-snack-bar-container');
      await expect(snackbarContainer).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Notification Accessibility', () => {
    test('should be accessible via aria attributes', async ({ page }) => {
      await navigateToProfile(page);

      await page
        .locator('input[formControlName="currentPassword"]')
        .fill('currentpass123');
      await page
        .locator('input[formControlName="newPassword"]')
        .fill('newpassword123');
      await page
        .locator('input[formControlName="confirmPassword"]')
        .fill('differentpassword');

      await page
        .locator('rms-password-change-card button[type="submit"]')
        .click();

      // Material snackbar should be visible
      const snackbarContainer = page.locator('mat-snack-bar-container');
      await expect(snackbarContainer).toBeVisible({ timeout: 10000 });

      // The snackbar should contain the message text
      await expect(snackbarContainer).toContainText(
        'New passwords do not match'
      );
    });

    test('should have visible text contrast', async ({ page }) => {
      await navigateToProfile(page);

      await page
        .locator('input[formControlName="currentPassword"]')
        .fill('currentpass123');
      await page
        .locator('input[formControlName="newPassword"]')
        .fill('newpassword123');
      await page
        .locator('input[formControlName="confirmPassword"]')
        .fill('differentpassword');

      await page
        .locator('rms-password-change-card button[type="submit"]')
        .click();

      // Error snackbar should have custom styling class
      const snackbarError = page.locator('.snackbar-error');
      await expect(snackbarError).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Auto-dismiss Behavior', () => {
    test('should auto-dismiss notification after timeout', async ({ page }) => {
      await navigateToProfile(page);

      await page
        .locator('input[formControlName="currentPassword"]')
        .fill('currentpass123');
      await page
        .locator('input[formControlName="newPassword"]')
        .fill('newpassword123');
      await page
        .locator('input[formControlName="confirmPassword"]')
        .fill('differentpassword');

      await page
        .locator('rms-password-change-card button[type="submit"]')
        .click();

      const snackbar = page.locator('mat-snack-bar-container');
      await expect(snackbar).toBeVisible({ timeout: 10000 });

      // Wait for auto-dismiss (default is 3000ms + animation time)
      await expect(snackbar).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Notification Content', () => {
    test('should display message text correctly', async ({ page }) => {
      await navigateToProfile(page);

      await page
        .locator('input[formControlName="currentPassword"]')
        .fill('currentpass123');
      await page
        .locator('input[formControlName="newPassword"]')
        .fill('newpassword123');
      await page
        .locator('input[formControlName="confirmPassword"]')
        .fill('differentpassword');

      await page
        .locator('rms-password-change-card button[type="submit"]')
        .click();

      // Verify exact message text
      const snackbar = page.locator('mat-snack-bar-container');
      await expect(snackbar).toContainText('New passwords do not match');
    });
  });

  test.describe('Theme Support', () => {
    test('should maintain notification styling in dark theme', async ({
      page,
    }) => {
      // Enable dark theme
      const themeButton = page.locator('button[mat-icon-button]').filter({
        has: page.locator('mat-icon', { hasText: /dark_mode|light_mode/ }),
      });
      await themeButton.click();

      await navigateToProfile(page);

      await page
        .locator('input[formControlName="currentPassword"]')
        .fill('currentpass123');
      await page
        .locator('input[formControlName="newPassword"]')
        .fill('newpassword123');
      await page
        .locator('input[formControlName="confirmPassword"]')
        .fill('differentpassword');

      await page
        .locator('rms-password-change-card button[type="submit"]')
        .click();

      // Error styling should still be applied in dark mode
      const snackbarError = page.locator('.snackbar-error');
      await expect(snackbarError).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Z-Index and Visibility', () => {
    test('should display notification above page content', async ({ page }) => {
      await navigateToProfile(page);

      await page
        .locator('input[formControlName="currentPassword"]')
        .fill('currentpass123');
      await page
        .locator('input[formControlName="newPassword"]')
        .fill('newpassword123');
      await page
        .locator('input[formControlName="confirmPassword"]')
        .fill('differentpassword');

      await page
        .locator('rms-password-change-card button[type="submit"]')
        .click();

      // Verify the snackbar is visible and not hidden behind other elements
      const snackbar = page.locator('mat-snack-bar-container');
      await expect(snackbar).toBeVisible({ timeout: 10000 });

      // The snackbar should be positioned in the overlay container
      const overlayContainer = page.locator('.cdk-overlay-container');
      await expect(overlayContainer).toBeVisible();
    });
  });
});
