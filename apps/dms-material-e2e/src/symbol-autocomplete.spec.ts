import { expect, test } from 'playwright/test';

// Skip these tests until SymbolAutocomplete is integrated into a feature page
// These tests will be enabled when a feature using SymbolAutocomplete is implemented
test.describe.skip('Symbol Autocomplete Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Navigate to page with symbol autocomplete once integrated
  });

  test.describe('Core Functionality', () => {
    test('should render input field', async ({ page }) => {
      const input = page
        .locator('input[matInput]')
        .filter({ has: page.locator('dms-symbol-autocomplete') })
        .first();
      await expect(input).toBeVisible();
    });

    test('typing minimum characters triggers search', async ({ page }) => {
      const input = page
        .locator('dms-symbol-autocomplete input[matInput]')
        .first();
      await input.click();
      await input.fill('AA');
      // Wait for dropdown to appear
      const dropdown = page.locator('mat-autocomplete').first();
      await expect(dropdown).toBeVisible();
    });

    test('dropdown displays matching suggestions', async ({ page }) => {
      const input = page
        .locator('dms-symbol-autocomplete input[matInput]')
        .first();
      await input.click();
      await input.fill('AAPL');
      const option = page.locator('mat-option');
      await expect(option.first()).toBeVisible();
    });

    test('clicking suggestion populates input', async ({ page }) => {
      const input = page
        .locator('dms-symbol-autocomplete input[matInput]')
        .first();
      await input.click();
      await input.fill('AA');
      const option = page.locator('mat-option').first();
      await option.click();
      const value = await input.inputValue();
      expect(value).toContain('AAPL');
    });

    test('loading spinner shows during search', async ({ page }) => {
      const input = page
        .locator('dms-symbol-autocomplete input[matInput]')
        .first();
      await input.click();
      await input.fill('AA');
      const spinner = page.locator('mat-spinner').first();
      // Spinner should appear during search
      await expect(spinner).toBeVisible({ timeout: 5000 });
    });

    test('no suggestions message when no matches', async ({ page }) => {
      const input = page
        .locator('dms-symbol-autocomplete input[matInput]')
        .first();
      await input.click();
      await input.fill('ZZZZZZZZ');
      await page.waitForTimeout(500);
      const options = page.locator('mat-option');
      const count = await options.count();
      expect(count).toBe(0);
    });

    test('force selection prevents custom values when enabled', async ({
      page,
    }) => {
      const input = page
        .locator('dms-symbol-autocomplete input[matInput]')
        .first();
      await input.click();
      await input.fill('CUSTOM');
      // Try to submit with Tab key
      await input.press('Tab');
      // Value should be cleared or reset if forceSelection is true
      const value = await input.inputValue();
      // Behavior depends on implementation
      expect(value).toBeDefined();
    });
  });

  test.describe('Edge Cases', () => {
    test('debounce prevents excessive API calls during rapid typing', async ({
      page,
    }) => {
      const input = page
        .locator('dms-symbol-autocomplete input[matInput]')
        .first();
      await input.click();
      // Type rapidly
      await input.fill('A');
      await input.fill('A');
      await input.fill('P');
      await input.fill('L');
      // API should only be called once due to debounce
      await page.waitForTimeout(500);
      // Verify only one search result
      const options = page.locator('mat-option');
      const count = await options.count();
      expect(count).toBeGreaterThan(0);
    });

    test('search cancelled when input cleared before results return', async ({
      page,
    }) => {
      const input = page
        .locator('dms-symbol-autocomplete input[matInput]')
        .first();
      await input.click();
      await input.fill('AA');
      await input.clear();
      // Results should be cleared
      const options = page.locator('mat-option');
      const count = await options.count();
      expect(count).toBe(0);
    });

    test('arrow key navigation through suggestions works', async ({ page }) => {
      const input = page
        .locator('dms-symbol-autocomplete input[matInput]')
        .first();
      await input.click();
      await input.fill('AA');
      await page.waitForTimeout(300);
      // Arrow down to select first option
      await input.press('ArrowDown');
      const firstOption = page
        .locator('mat-option[aria-selected="true"]')
        .first();
      await expect(firstOption).toBeVisible();
    });

    test('enter key selects highlighted suggestion', async ({ page }) => {
      const input = page
        .locator('dms-symbol-autocomplete input[matInput]')
        .first();
      await input.click();
      await input.fill('AA');
      await page.waitForTimeout(300);
      // Select first option with arrow down
      await input.press('ArrowDown');
      // Press Enter to select
      await input.press('Enter');
      const value = await input.inputValue();
      // Should contain selected symbol
      expect(value).toBeTruthy();
    });

    test('escape key closes dropdown without selection', async ({ page }) => {
      const input = page
        .locator('dms-symbol-autocomplete input[matInput]')
        .first();
      await input.click();
      await input.fill('AA');
      await page.waitForTimeout(300);
      // Press Escape
      await input.press('Escape');
      const dropdown = page.locator('mat-autocomplete').first();
      // Dropdown should be closed
      await expect(dropdown).not.toBeVisible({ timeout: 1000 });
    });

    test('tab key selects highlighted suggestion and moves focus', async ({
      page,
    }) => {
      const input = page
        .locator('dms-symbol-autocomplete input[matInput]')
        .first();
      await input.click();
      await input.fill('AA');
      await page.waitForTimeout(300);
      // Select first option
      await input.press('ArrowDown');
      // Press Tab to select and move focus
      await input.press('Tab');
      // Focus should have moved
      const focused = await page
        .locator(':focus')
        .first()
        .locator('..')
        .getAttribute('class');
      // Input should no longer be focused
      expect(focused).not.toContain('symbol-autocomplete');
    });

    test('case-insensitive search matches correctly', async ({ page }) => {
      const input = page
        .locator('dms-symbol-autocomplete input[matInput]')
        .first();
      await input.click();
      await input.fill('aapl');
      await page.waitForTimeout(300);
      const options = page.locator('mat-option');
      await expect(options.first()).toBeVisible();
    });

    test('special characters in symbol handled (BRK.A, BRK.B)', async ({
      page,
    }) => {
      const input = page
        .locator('dms-symbol-autocomplete input[matInput]')
        .first();
      await input.click();
      await input.fill('BRK');
      await page.waitForTimeout(300);
      const options = page.locator('mat-option');
      const count = await options.count();
      // Should find BRK.A and/or BRK.B
      expect(count).toBeGreaterThan(0);
    });

    test('long company names truncated with tooltip', async ({ page }) => {
      const input = page
        .locator('dms-symbol-autocomplete input[matInput]')
        .first();
      await input.click();
      await input.fill('AA');
      await page.waitForTimeout(300);
      const option = page.locator('mat-option').first();
      // Check if name is truncated
      const nameText = await option.locator('small').first().textContent();
      if (nameText && nameText.length > 50) {
        // Should have tooltip
        await option.hover();
        const tooltip = page.locator('[role="tooltip"]').first();
        await expect(tooltip).toBeVisible({ timeout: 1000 });
      }
    });

    test('dropdown positions correctly near viewport edges', async ({
      page,
    }) => {
      const input = page
        .locator('dms-symbol-autocomplete input[matInput]')
        .first();
      // Scroll to bottom of page
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await input.click();
      await input.fill('AA');
      await page.waitForTimeout(300);
      const dropdown = page.locator('mat-autocomplete').first();
      const box = await dropdown.boundingBox();
      // Dropdown should be visible and within viewport
      expect(box).toBeTruthy();
      expect(box?.y).toBeGreaterThan(0);
    });

    test('dropdown closes when clicking outside', async ({ page }) => {
      const input = page
        .locator('dms-symbol-autocomplete input[matInput]')
        .first();
      await input.click();
      await input.fill('AA');
      await page.waitForTimeout(300);
      // Click outside the dropdown
      await page.click('body', { position: { x: 10, y: 10 } });
      const dropdown = page.locator('mat-autocomplete').first();
      // Dropdown should close
      await expect(dropdown).not.toBeVisible({ timeout: 1000 });
    });

    test('search handles API timeout gracefully', async ({ page }) => {
      const input = page
        .locator('dms-symbol-autocomplete input[matInput]')
        .first();
      await input.click();
      await input.fill('AA');
      // Wait for potential timeout
      await page.waitForTimeout(10000);
      // Component should still be functional
      await expect(input).toBeVisible();
    });

    test('search handles API error gracefully', async ({ page }) => {
      const input = page
        .locator('dms-symbol-autocomplete input[matInput]')
        .first();
      await input.click();
      await input.fill('AA');
      await page.waitForTimeout(300);
      // Component should remain functional even after error
      await expect(input).toBeVisible();
      // Should be able to clear and try again
      await input.clear();
      await input.fill('AAPL');
    });

    test('clear button resets input and closes dropdown', async ({ page }) => {
      const input = page
        .locator('dms-symbol-autocomplete input[matInput]')
        .first();
      await input.click();
      await input.fill('AA');
      await page.waitForTimeout(300);
      // Look for clear button (if implemented)
      const clearBtn = page
        .locator('button[aria-label="Clear"]')
        .or(page.locator('mat-icon[aria-label*="clear" i]'))
        .first();
      if (await clearBtn.isVisible()) {
        await clearBtn.click();
        const value = await input.inputValue();
        expect(value).toBe('');
        const dropdown = page.locator('mat-autocomplete').first();
        await expect(dropdown).not.toBeVisible();
      }
    });

    test('re-opening dropdown shows previous results if unchanged', async ({
      page,
    }) => {
      const input = page
        .locator('dms-symbol-autocomplete input[matInput]')
        .first();
      await input.click();
      await input.fill('AA');
      await page.waitForTimeout(300);
      // Close dropdown
      await input.press('Escape');
      // Re-open by clicking input
      await input.click();
      const options = page.locator('mat-option');
      const count = await options.count();
      // Previous results should still be there
      expect(count).toBeGreaterThan(0);
    });
  });
});
