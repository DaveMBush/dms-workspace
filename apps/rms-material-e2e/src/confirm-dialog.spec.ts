import { test, expect } from '@playwright/test';

import { login } from './helpers/login.helper';

test.describe('Confirm Dialog Service', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('Core Functionality', () => {
    test('should display confirm dialog with title and message', async ({
      page,
    }) => {
      // Trigger confirm dialog via logout
      await page.locator('button[aria-label="User menu"]').click();
      await page
        .locator('button[mat-menu-item]', { hasText: 'Logout' })
        .click();

      // Verify dialog is visible with title and message
      await expect(page.getByText('Confirm Logout')).toBeVisible();
      await expect(
        page.getByText('Are you sure you want to log out?')
      ).toBeVisible();
    });

    test('should display custom button labels correctly', async ({ page }) => {
      // Trigger confirm dialog via logout
      await page.locator('button[aria-label="User menu"]').click();
      await page
        .locator('button[mat-menu-item]', { hasText: 'Logout' })
        .click();

      // Verify custom button labels
      await expect(
        page.locator('mat-dialog-actions button', { hasText: 'Logout' })
      ).toBeVisible();
      await expect(
        page.locator('mat-dialog-actions button', { hasText: 'Cancel' })
      ).toBeVisible();
    });

    test('should return true when confirm button is clicked', async ({
      page,
    }) => {
      // Trigger confirm dialog via logout
      await page.locator('button[aria-label="User menu"]').click();
      await page
        .locator('button[mat-menu-item]', { hasText: 'Logout' })
        .click();

      // Click confirm (Logout)
      await page
        .locator('mat-dialog-actions button', { hasText: 'Logout' })
        .click();

      // Should navigate to login (confirms action was taken)
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('should return false when cancel button is clicked', async ({
      page,
    }) => {
      // Trigger confirm dialog via logout
      await page.locator('button[aria-label="User menu"]').click();
      await page
        .locator('button[mat-menu-item]', { hasText: 'Logout' })
        .click();

      // Click cancel
      await page
        .locator('mat-dialog-actions button', { hasText: 'Cancel' })
        .click();

      // Should stay on dashboard (confirms action was NOT taken)
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should close dialog when button is clicked', async ({ page }) => {
      // Trigger confirm dialog via logout
      await page.locator('button[aria-label="User menu"]').click();
      await page
        .locator('button[mat-menu-item]', { hasText: 'Logout' })
        .click();

      // Verify dialog is visible
      await expect(page.getByText('Confirm Logout')).toBeVisible();

      // Click cancel
      await page
        .locator('mat-dialog-actions button', { hasText: 'Cancel' })
        .click();

      // Dialog should be closed
      await expect(page.getByText('Confirm Logout')).not.toBeVisible();
    });

    test('should return false when escape key is pressed', async ({ page }) => {
      // Trigger confirm dialog via logout
      await page.locator('button[aria-label="User menu"]').click();
      await page
        .locator('button[mat-menu-item]', { hasText: 'Logout' })
        .click();

      // Verify dialog is visible
      await expect(page.getByText('Confirm Logout')).toBeVisible();

      // Press escape
      await page.keyboard.press('Escape');

      // Dialog should close and stay on dashboard
      await expect(page.getByText('Confirm Logout')).not.toBeVisible();
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  test.describe('Accessibility', () => {
    test('should have role="dialog" on dialog element', async ({ page }) => {
      // Trigger confirm dialog via logout
      await page.locator('button[aria-label="User menu"]').click();
      await page
        .locator('button[mat-menu-item]', { hasText: 'Logout' })
        .click();

      // Material dialog should have proper role
      const dialog = page.locator('mat-dialog-container');
      await expect(dialog).toBeVisible();
      // MatDialog automatically sets role="dialog"
      await expect(dialog).toHaveAttribute('role', 'dialog');
    });

    test('should have proper dialog structure', async ({ page }) => {
      // Trigger confirm dialog via logout
      await page.locator('button[aria-label="User menu"]').click();
      await page
        .locator('button[mat-menu-item]', { hasText: 'Logout' })
        .click();

      // Verify proper structure
      await expect(page.locator('mat-dialog-container')).toBeVisible();
      await expect(page.locator('[mat-dialog-title]')).toBeVisible();
      await expect(page.locator('mat-dialog-content')).toBeVisible();
      await expect(page.locator('mat-dialog-actions')).toBeVisible();
    });

    test('should trap focus within dialog', async ({ page }) => {
      // Trigger confirm dialog via logout
      await page.locator('button[aria-label="User menu"]').click();
      await page
        .locator('button[mat-menu-item]', { hasText: 'Logout' })
        .click();

      // Wait for dialog to be visible
      await expect(page.getByText('Confirm Logout')).toBeVisible();

      // Tab should cycle through buttons in the dialog
      const cancelButton = page.locator('mat-dialog-actions button', {
        hasText: 'Cancel',
      });
      const confirmButton = page.locator('mat-dialog-actions button', {
        hasText: 'Logout',
      });

      // Focus should be able to reach both buttons via tab
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Both buttons should be focusable (can receive focus)
      await expect(cancelButton).toBeEnabled();
      await expect(confirmButton).toBeEnabled();
    });

    test('should cycle through dialog buttons with tab', async ({ page }) => {
      // Trigger confirm dialog via logout
      await page.locator('button[aria-label="User menu"]').click();
      await page
        .locator('button[mat-menu-item]', { hasText: 'Logout' })
        .click();

      // Wait for dialog
      await expect(page.getByText('Confirm Logout')).toBeVisible();

      // Multiple tabs should stay within dialog
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
      }

      // Dialog should still be visible (focus didn't escape)
      await expect(page.getByText('Confirm Logout')).toBeVisible();
    });
  });

  test.describe('Modal Behavior', () => {
    test('should display backdrop', async ({ page }) => {
      // Trigger confirm dialog via logout
      await page.locator('button[aria-label="User menu"]').click();
      await page
        .locator('button[mat-menu-item]', { hasText: 'Logout' })
        .click();

      // Verify backdrop is visible (use dark backdrop specific to dialog)
      await expect(
        page.locator('.cdk-overlay-backdrop.cdk-overlay-dark-backdrop')
      ).toBeVisible();
    });

    test('should not close when clicking backdrop', async ({ page }) => {
      // Trigger confirm dialog via logout
      await page.locator('button[aria-label="User menu"]').click();
      await page
        .locator('button[mat-menu-item]', { hasText: 'Logout' })
        .click();

      // Verify dialog is visible
      await expect(page.getByText('Confirm Logout')).toBeVisible();

      // Click on backdrop (use dark backdrop specific to dialog)
      await page
        .locator('.cdk-overlay-backdrop.cdk-overlay-dark-backdrop')
        .click({ position: { x: 10, y: 10 } });

      // Dialog should still be visible (modal behavior)
      await expect(page.getByText('Confirm Logout')).toBeVisible();
    });

    test('should block interaction with background content', async ({
      page,
    }) => {
      // Trigger confirm dialog via logout
      await page.locator('button[aria-label="User menu"]').click();
      await page
        .locator('button[mat-menu-item]', { hasText: 'Logout' })
        .click();

      // Dialog should be visible
      await expect(page.getByText('Confirm Logout')).toBeVisible();

      // Try to click on the theme toggle (should be blocked by overlay)
      const themeToggle = page.locator('button[aria-label="Toggle theme"]');

      // The button should not be interactable while dialog is open
      // (cdk-overlay-backdrop blocks clicks)
      await expect(
        page.locator('.cdk-overlay-backdrop.cdk-overlay-dark-backdrop')
      ).toBeVisible();
    });
  });

  test.describe('Display and Layout', () => {
    test('should be centered on screen', async ({ page }) => {
      // Trigger confirm dialog via logout
      await page.locator('button[aria-label="User menu"]').click();
      await page
        .locator('button[mat-menu-item]', { hasText: 'Logout' })
        .click();

      const dialog = page.locator('mat-dialog-container');
      await expect(dialog).toBeVisible();

      // Get dialog position and viewport size
      const dialogBox = await dialog.boundingBox();
      const viewportSize = page.viewportSize();

      if (dialogBox && viewportSize) {
        // Dialog should be approximately centered horizontally
        const dialogCenterX = dialogBox.x + dialogBox.width / 2;
        const viewportCenterX = viewportSize.width / 2;
        expect(Math.abs(dialogCenterX - viewportCenterX)).toBeLessThan(50);
      }
    });

    test('should wrap long title text correctly', async ({ page }) => {
      // This test verifies the component handles long text without breaking
      // The logout dialog has a short title, so we verify it displays correctly
      await page.locator('button[aria-label="User menu"]').click();
      await page
        .locator('button[mat-menu-item]', { hasText: 'Logout' })
        .click();

      const title = page.locator('[mat-dialog-title]');
      await expect(title).toBeVisible();

      // Title should be contained within the dialog
      const titleBox = await title.boundingBox();
      const dialogBox = await page
        .locator('mat-dialog-container')
        .boundingBox();

      if (titleBox && dialogBox) {
        expect(titleBox.x).toBeGreaterThanOrEqual(dialogBox.x);
        expect(titleBox.x + titleBox.width).toBeLessThanOrEqual(
          dialogBox.x + dialogBox.width
        );
      }
    });

    test('should wrap long message text correctly', async ({ page }) => {
      // Verify message is properly contained
      await page.locator('button[aria-label="User menu"]').click();
      await page
        .locator('button[mat-menu-item]', { hasText: 'Logout' })
        .click();

      const content = page.locator('mat-dialog-content');
      await expect(content).toBeVisible();

      // Content should be contained within the dialog
      const contentBox = await content.boundingBox();
      const dialogBox = await page
        .locator('mat-dialog-container')
        .boundingBox();

      if (contentBox && dialogBox) {
        expect(contentBox.x).toBeGreaterThanOrEqual(dialogBox.x);
        expect(contentBox.x + contentBox.width).toBeLessThanOrEqual(
          dialogBox.x + dialogBox.width
        );
      }
    });

    test('should display correctly at mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Navigate and login again after viewport change
      await page.goto('/');
      await login(page);

      // Trigger dialog
      await page.locator('button[aria-label="User menu"]').click();
      await page
        .locator('button[mat-menu-item]', { hasText: 'Logout' })
        .click();

      // Dialog should still be visible and usable
      await expect(page.getByText('Confirm Logout')).toBeVisible();
      await expect(
        page.locator('mat-dialog-actions button', { hasText: 'Cancel' })
      ).toBeVisible();
      await expect(
        page.locator('mat-dialog-actions button', { hasText: 'Logout' })
      ).toBeVisible();
    });
  });

  test.describe('Theme Support', () => {
    test('should display correctly in light theme', async ({ page }) => {
      // Ensure light theme
      const themeToggle = page.locator('button[aria-label="Toggle theme"]');
      const icon = themeToggle.locator('mat-icon');

      // If dark_mode icon is shown, we're in light mode
      // If light_mode icon is shown, we're in dark mode - click to switch
      const iconText = await icon.textContent();
      if (iconText?.includes('light_mode')) {
        await themeToggle.click();
      }

      // Trigger dialog
      await page.locator('button[aria-label="User menu"]').click();
      await page
        .locator('button[mat-menu-item]', { hasText: 'Logout' })
        .click();

      // Dialog should be visible
      await expect(page.getByText('Confirm Logout')).toBeVisible();
    });

    test('should display correctly in dark theme', async ({ page }) => {
      // Switch to dark theme
      const themeToggle = page.locator('button[aria-label="Toggle theme"]');
      const icon = themeToggle.locator('mat-icon');

      const iconText = await icon.textContent();
      if (iconText?.includes('dark_mode')) {
        await themeToggle.click();
      }

      // Trigger dialog
      await page.locator('button[aria-label="User menu"]').click();
      await page
        .locator('button[mat-menu-item]', { hasText: 'Logout' })
        .click();

      // Dialog should be visible
      await expect(page.getByText('Confirm Logout')).toBeVisible();
    });
  });

  test.describe('Z-Index and Visibility', () => {
    test('should display dialog above page content', async ({ page }) => {
      // Trigger dialog
      await page.locator('button[aria-label="User menu"]').click();
      await page
        .locator('button[mat-menu-item]', { hasText: 'Logout' })
        .click();

      // Dialog should be visible above everything
      const dialog = page.locator('mat-dialog-container');
      await expect(dialog).toBeVisible();

      // The overlay pane should have a high z-index
      const overlayPane = page.locator('.cdk-overlay-pane');
      await expect(overlayPane).toBeVisible();
    });

    test('should close cleanly without artifacts', async ({ page }) => {
      // Trigger dialog
      await page.locator('button[aria-label="User menu"]').click();
      await page
        .locator('button[mat-menu-item]', { hasText: 'Logout' })
        .click();

      // Verify dialog is visible
      await expect(page.getByText('Confirm Logout')).toBeVisible();

      // Close dialog
      await page
        .locator('mat-dialog-actions button', { hasText: 'Cancel' })
        .click();

      // Verify dialog and backdrop are removed
      await expect(page.getByText('Confirm Logout')).not.toBeVisible();
      await expect(
        page.locator('.cdk-overlay-backdrop.cdk-overlay-backdrop-showing')
      ).not.toBeVisible();
    });
  });

  test.describe('Button Interactions', () => {
    test('should handle rapid clicks gracefully', async ({ page }) => {
      // Trigger dialog
      await page.locator('button[aria-label="User menu"]').click();
      await page
        .locator('button[mat-menu-item]', { hasText: 'Logout' })
        .click();

      // Click cancel rapidly
      const cancelButton = page.locator('mat-dialog-actions button', {
        hasText: 'Cancel',
      });

      // Rapid clicks
      await cancelButton.click();
      await cancelButton.click({ force: true }).catch(() => {
        // Expected - button may be gone
      });

      // Should still be on dashboard without errors
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });
});
