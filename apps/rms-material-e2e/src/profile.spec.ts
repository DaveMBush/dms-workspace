import { test, expect } from '@playwright/test';

import { login } from './helpers/login.helper';
import { navigateToProfile } from './helpers/navigate-to-profile.helper';

test.describe('Profile', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to profile from user menu', async ({ page }) => {
    const userMenuButton = page.locator('button[aria-label="User menu"]');
    await userMenuButton.click();

    const profileMenuItem = page.locator('a[mat-menu-item]', {
      hasText: 'Profile',
    });

    // Wait for navigation to complete
    await Promise.all([page.waitForURL('/profile'), profileMenuItem.click()]);

    await expect(page).toHaveURL('/profile');
    await expect(page.locator('.profile-title')).toContainText('User Profile');
  });

  test('should display user name and email', async ({ page }) => {
    await navigateToProfile(page);

    await expect(page.locator('.profile-title')).toContainText('User Profile');
    await expect(
      page.locator('mat-card-title', { hasText: 'User Information' })
    ).toBeVisible();
    await expect(
      page.locator('.field-label', { hasText: 'Username' })
    ).toBeVisible();
    await expect(
      page.locator('.field-label', { hasText: 'Email Address' })
    ).toBeVisible();
  });

  test('should render password change card', async ({ page }) => {
    await navigateToProfile(page);
    await expect(
      page.locator('mat-card-title', { hasText: 'Change Password' })
    ).toBeVisible();
    await expect(
      page.locator('input[formControlName="currentPassword"]')
    ).toBeVisible();
    await expect(
      page.locator('input[formControlName="newPassword"]')
    ).toBeVisible();
    await expect(
      page.locator('input[formControlName="confirmPassword"]')
    ).toBeVisible();
  });

  test('should render email change card', async ({ page }) => {
    await navigateToProfile(page);

    await expect(
      page.locator('mat-card-title', { hasText: 'Change Email' })
    ).toBeVisible();
    await expect(page.locator('.current-email')).toContainText(
      'Current Email:'
    );
    await expect(
      page.locator('input[formControlName="newEmail"]')
    ).toBeVisible();
  });

  test('should validate current password required', async ({ page }) => {
    await navigateToProfile(page);

    const submitButton = page
      .locator('rms-password-change-card button[type="submit"]')
      .first();
    await submitButton.click();

    await expect(page.getByText('Current password is required')).toBeVisible();
  });

  test('should validate new password min length', async ({ page }) => {
    await navigateToProfile(page);

    await page.locator('input[formControlName="newPassword"]').fill('123');
    await page.locator('input[formControlName="confirmPassword"]').click();

    await expect(
      page.getByText('Password must be at least 8 characters')
    ).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    await navigateToProfile(page);

    const currentPasswordInput = page.locator(
      'input[formControlName="currentPassword"]'
    );
    const toggleButton = page
      .locator('rms-password-change-card button[matSuffix]')
      .first();

    await expect(currentPasswordInput).toHaveAttribute('type', 'password');
    await expect(
      page.locator('mat-icon', { hasText: 'visibility_off' }).first()
    ).toBeVisible();

    await toggleButton.click();
    await expect(currentPasswordInput).toHaveAttribute('type', 'text');
    await expect(
      page.locator('mat-icon', { hasText: 'visibility' }).first()
    ).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await navigateToProfile(page);

    await page.locator('input[formControlName="newEmail"]').fill('invalid');
    await page.locator('rms-email-change-card button[type="submit"]').click();

    await expect(
      page.getByText('Please enter a valid email address')
    ).toBeVisible();
  });

  test('should accept valid email format', async ({ page }) => {
    await navigateToProfile(page);

    await page
      .locator('input[formControlName="newEmail"]')
      .fill('valid@example.com');

    await expect(
      page.locator('mat-error', {
        hasText: 'Please enter a valid email address',
      })
    ).not.toBeVisible();
  });

  test('should show loading spinner during password change', async ({
    page,
  }) => {
    await navigateToProfile(page);

    await page
      .locator('input[formControlName="currentPassword"]')
      .fill('currentpass');
    await page
      .locator('input[formControlName="newPassword"]')
      .fill('newpass123');
    await page
      .locator('input[formControlName="confirmPassword"]')
      .fill('newpass123');

    const submitButton = page.locator(
      'rms-password-change-card button[type="submit"]'
    );
    await submitButton.click();

    // Button should be disabled during loading
    await expect(submitButton).toBeDisabled();
  });

  test('should show loading spinner during email change', async ({ page }) => {
    await navigateToProfile(page);

    await page
      .locator('input[formControlName="newEmail"]')
      .fill('new@example.com');

    const submitButton = page.locator(
      'rms-email-change-card button[type="submit"]'
    );
    await submitButton.click();

    // Button should be disabled during loading
    await expect(submitButton).toBeDisabled();
  });

  test('should accept password at minimum length boundary', async ({
    page,
  }) => {
    await navigateToProfile(page);

    await page.locator('input[formControlName="newPassword"]').fill('12345678');
    await page.locator('input[formControlName="confirmPassword"]').click();

    await expect(
      page.locator('mat-error', {
        hasText: 'Password must be at least 8 characters',
      })
    ).not.toBeVisible();
  });

  test('should accept password with special characters', async ({ page }) => {
    await navigateToProfile(page);

    await page
      .locator('input[formControlName="newPassword"]')
      .fill('P@ssw0rd!');
    await page.locator('input[formControlName="confirmPassword"]').click();

    await expect(
      page.locator('mat-error', {
        hasText: 'Password must be at least 8 characters',
      })
    ).not.toBeVisible();
  });

  test('should require new password confirmation', async ({ page }) => {
    await navigateToProfile(page);

    await page
      .locator('input[formControlName="currentPassword"]')
      .fill('current');
    await page
      .locator('input[formControlName="newPassword"]')
      .fill('newpass123');

    const submitButton = page.locator(
      'rms-password-change-card button[type="submit"]'
    );
    await submitButton.click();

    await expect(
      page.getByText('Please confirm your new password')
    ).toBeVisible();
  });

  test('should clear password form errors when correcting input', async ({
    page,
  }) => {
    await navigateToProfile(page);

    await page.locator('input[formControlName="newPassword"]').fill('123');
    await page.locator('input[formControlName="confirmPassword"]').click();

    await expect(
      page.getByText('Password must be at least 8 characters')
    ).toBeVisible();

    await page.locator('input[formControlName="newPassword"]').clear();
    await page
      .locator('input[formControlName="newPassword"]')
      .fill('validpass123');
    await page.locator('input[formControlName="confirmPassword"]').click();

    await expect(
      page.locator('mat-error', {
        hasText: 'Password must be at least 8 characters',
      })
    ).not.toBeVisible();
  });

  test('should clear email form errors when correcting input', async ({
    page,
  }) => {
    await navigateToProfile(page);

    await page.locator('input[formControlName="newEmail"]').fill('invalid');
    await page.locator('rms-email-change-card button[type="submit"]').click();

    await expect(
      page.getByText('Please enter a valid email address')
    ).toBeVisible();

    await page.locator('input[formControlName="newEmail"]').clear();
    await page
      .locator('input[formControlName="newEmail"]')
      .fill('valid@example.com');

    await expect(
      page.locator('mat-error', {
        hasText: 'Please enter a valid email address',
      })
    ).not.toBeVisible();
  });

  test('should have responsive grid layout', async ({ page }) => {
    await navigateToProfile(page);

    await expect(page.locator('.grid').first()).toBeVisible();
    await expect(page.locator('rms-profile-info-card')).toBeVisible();
    await expect(page.locator('rms-session-info-card')).toBeVisible();
    await expect(page.locator('rms-password-change-card')).toBeVisible();
    await expect(page.locator('rms-email-change-card')).toBeVisible();
    await expect(page.locator('rms-account-actions-card')).toBeVisible();
  });
});
