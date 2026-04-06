import { expect, test } from 'playwright/test';

import { login } from './helpers/login.helper';

/**
 * Universe Screen Accounts Filter Dropdown Width E2E Tests (Story 52.2)
 *
 * Verifies that the Accounts filter dropdown panel on the Universe screen
 * (toolbar mat-select inside mat-form-field.account-select) displays option
 * labels without text wrapping after the Story 52.1 fix
 * (panelWidth="" applied to mat-select, allowing natural content width).
 *
 * Note: At least one account must exist in the test database for the width
 * assertions to exercise a multi-option dropdown. With only "All Accounts"
 * the overflow check passes trivially.
 */

test.describe('Universe Accounts Filter Dropdown Width', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('dms-base-table')).toBeVisible({
      timeout: 15000,
    });
  });

  test('Accounts filter dropdown options do not overflow horizontally', async ({
    page,
  }) => {
    // Account filter mat-select uses panelWidth="" (content width) — Story 52.1 fix
    const accountSelect = page.locator(
      '.universe-toolbar mat-form-field.account-select mat-select'
    );
    await expect(accountSelect).toHaveCount(1);
    await expect(accountSelect).toBeVisible({ timeout: 10000 });

    // Open the dropdown panel
    await accountSelect.click();

    // Wait for the panel to appear
    const panel = page.locator('.mat-mdc-select-panel');
    await expect(panel).toBeVisible({ timeout: 10000 });

    // Assert no mat-option element has horizontal text overflow
    const hasOverflow = await page.evaluate(() => {
      const options = document.querySelectorAll(
        '.mat-mdc-select-panel mat-option'
      );
      return Array.from(options).some(
        (el) =>
          (el as HTMLElement).scrollWidth > (el as HTMLElement).clientWidth
      );
    });
    expect(hasOverflow).toBe(false);

    // Close the panel
    await page.keyboard.press('Escape');
  });

  test('Accounts filter dropdown panel is at least as wide as its widest option label', async ({
    page,
  }) => {
    // panelWidth="" means the panel grows to fit the widest option label
    const accountSelect = page.locator(
      '.universe-toolbar mat-form-field.account-select mat-select'
    );
    await expect(accountSelect).toHaveCount(1);
    await expect(accountSelect).toBeVisible({ timeout: 10000 });

    // Open the dropdown panel
    await accountSelect.click();

    // Wait for the panel to appear
    const panel = page.locator('.mat-mdc-select-panel');
    await expect(panel).toBeVisible({ timeout: 10000 });

    // Measure panel width
    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();

    // Measure the widest option label's rendered width
    const widestOptionLabelWidth = await page.evaluate(() => {
      const options = document.querySelectorAll(
        '.mat-mdc-select-panel mat-option'
      );
      let maxWidth = 0;
      options.forEach((el) => {
        const w = (el as HTMLElement).scrollWidth;
        if (w > maxWidth) {
          maxWidth = w;
        }
      });
      return maxWidth;
    });

    // Panel must be at least as wide as the widest option label
    // (-1 tolerance for sub-pixel rounding between scrollWidth integer and CSS float)
    expect(panelBox!.width).toBeGreaterThanOrEqual(widestOptionLabelWidth - 1);

    // Close the panel
    await page.keyboard.press('Escape');
  });
});
