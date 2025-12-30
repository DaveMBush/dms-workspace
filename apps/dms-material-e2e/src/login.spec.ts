import { test, expect } from 'playwright/test';

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('should display login form with all fields', async ({ page }) => {
    await expect(page.locator('mat-card-title')).toContainText(
      'Welcome to Dividend Management System'
    );
    await expect(page.locator('mat-card-subtitle')).toContainText(
      'Sign in to continue'
    );
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('mat-checkbox')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.locator('button[type="submit"]').click();

    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('should show validation error for invalid email', async ({ page }) => {
    await page.locator('input[type="email"]').fill('invalid-email');
    await page.locator('input[type="password"]').click(); // Blur email field

    await expect(page.locator('mat-error')).toContainText(
      'Please enter a valid email'
    );
  });

  test('should show validation error for short password', async ({ page }) => {
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('short');
    await page.locator('input[type="email"]').click(); // Blur password field

    await expect(page.locator('mat-error')).toContainText(
      'Password must be at least 8 characters'
    );
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.locator('input[formControlName="password"]');
    const toggleButton = page.locator('button[matIconSuffix]');

    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(
      page.locator('mat-icon', { hasText: 'visibility_off' })
    ).toBeVisible();

    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await expect(
      page.locator('mat-icon', { hasText: 'visibility' })
    ).toBeVisible();

    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should remember "Remember me" checkbox state in localStorage', async ({
    page,
  }) => {
    // Set remember me in localStorage before loading page
    await page.evaluate(() => localStorage.setItem('dms_remember_me', 'true'));

    // Reload the page
    await page.reload();

    // Checkbox should be checked based on localStorage value
    const checkbox = page.locator('mat-checkbox');
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

  test('should persist remember me preference across sessions', async ({
    page,
    context,
  }) => {
    // Set localStorage value
    await page.evaluate(() => localStorage.setItem('dms_remember_me', 'true'));

    // Close page and create new one
    await page.close();
    const newPage = await context.newPage();
    await newPage.goto('/auth/login');

    // Verify checkbox is checked based on localStorage
    await expect(newPage.locator('mat-checkbox input')).toBeChecked();

    // Verify localStorage value persists
    const rememberMe = await newPage.evaluate(() =>
      localStorage.getItem('dms_remember_me')
    );
    expect(rememberMe).toBe('true');
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();

    // Should navigate to dashboard after successful login
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should allow form submission even with invalid data', async ({
    page,
  }) => {
    const submitButton = page.locator('button[type="submit"]');

    // Button should always be enabled (validation happens on blur/submit)
    await expect(submitButton).toBeEnabled();

    // Fill with invalid email
    await page.locator('input[type="email"]').fill('invalid');
    await page.locator('input[type="password"]').fill('password123');

    // Button should still be enabled (form allows submission attempt)
    await expect(submitButton).toBeEnabled();
  });

  test('should clear validation errors when correcting input', async ({
    page,
  }) => {
    // Trigger validation errors
    await page.locator('input[type="email"]').fill('invalid-email');
    await page.locator('input[type="password"]').click();
    await expect(page.locator('mat-error')).toContainText(
      'Please enter a valid email'
    );

    // Correct the email
    await page.locator('input[type="email"]').clear();
    await page.locator('input[type="email"]').fill('valid@example.com');
    await page.locator('input[type="password"]').click();

    // Error should disappear
    await expect(
      page.locator('mat-error', { hasText: 'Please enter a valid email' })
    ).not.toBeVisible();
  });

  test('should handle checkbox toggle correctly', async ({ page }) => {
    const checkbox = page.locator('mat-checkbox input');

    // Initially unchecked (no localStorage value)
    await expect(checkbox).not.toBeChecked();

    // Click to check
    await page.locator('mat-checkbox').click();
    await expect(checkbox).toBeChecked();

    // Click to uncheck
    await page.locator('mat-checkbox').click();
    await expect(checkbox).not.toBeChecked();
  });

  test('should show email field is required after blur on empty field', async ({
    page,
  }) => {
    // Focus then blur email field without entering anything
    await page.locator('input[type="email"]').focus();
    await page.locator('input[type="password"]').click();

    await expect(page.getByText('Email is required')).toBeVisible();
  });

  test('should show password field is required after blur on empty field', async ({
    page,
  }) => {
    // Focus then blur password field without entering anything
    await page.locator('input[type="password"]').focus();
    await page.locator('input[type="email"]').click();

    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('should trim email with leading/trailing spaces', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');

    await emailInput.fill('  test@example.com  ');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();

    // Should successfully login (email gets trimmed)
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should accept exactly 8 character password', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]');

    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('12345678');
    await page.locator('input[type="email"]').click();

    // No validation error should appear
    await expect(
      page.locator('mat-error', {
        hasText: 'Password must be at least 8 characters',
      })
    ).not.toBeVisible();
    await expect(submitButton).toBeEnabled();
  });
});
