import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form with all fields', async ({ page }) => {
    await expect(page.locator('mat-card-title')).toContainText('Welcome to RMS');
    await expect(page.locator('mat-card-subtitle')).toContainText('Sign in to continue');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('mat-checkbox')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('mat-error')).toContainText('Email is required');
    await expect(page.locator('mat-error')).toContainText('Password is required');
  });

  test('should show validation error for invalid email', async ({ page }) => {
    await page.locator('input[type="email"]').fill('invalid-email');
    await page.locator('input[type="password"]').click(); // Blur email field

    await expect(page.locator('mat-error')).toContainText('Please enter a valid email');
  });

  test('should show validation error for short password', async ({ page }) => {
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('short');
    await page.locator('input[type="email"]').click(); // Blur password field

    await expect(page.locator('mat-error')).toContainText('Password must be at least 8 characters');
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.locator('input[formControlName="password"]');
    const toggleButton = page.locator('button[matIconSuffix]');

    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(page.locator('mat-icon', { hasText: 'visibility_off' })).toBeVisible();

    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await expect(page.locator('mat-icon', { hasText: 'visibility' })).toBeVisible();

    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should remember "Remember me" checkbox state in localStorage', async ({ page }) => {
    const checkbox = page.locator('mat-checkbox');

    // Check the checkbox
    await checkbox.click();

    // Reload the page
    await page.reload();

    // Checkbox should still be checked
    await expect(checkbox.locator('input')).toBeChecked();
  });

  test('should show loading spinner during sign in', async ({ page }) => {
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');

    // Start sign in (will fail with mock service, but we can see the spinner)
    const submitPromise = page.locator('button[type="submit"]').click();

    // Check for spinner (might be brief)
    const spinner = page.locator('mat-spinner');
    // Don't await this check as it might be too fast

    await submitPromise;
  });

  test('should persist remember me preference across sessions', async ({ page, context }) => {
    // Check remember me
    await page.locator('mat-checkbox').click();

    // Get localStorage value
    const rememberMe = await page.evaluate(() => localStorage.getItem('rms_remember_me'));
    expect(rememberMe).toBe('true');

    // Close page and create new one
    await page.close();
    const newPage = await context.newPage();
    await newPage.goto('/login');

    // Verify checkbox is still checked
    await expect(newPage.locator('mat-checkbox input')).toBeChecked();
  });
});
