import { expect, test } from 'playwright/test';

// Skip these tests until EditableCell is integrated into a feature page
// These tests will be enabled when a feature using EditableCell is implemented
test.describe.skip('Editable Cell Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Navigate to page with editable cells once integrated
  });

  test.describe('Core Functionality', () => {
    test('should display value in non-edit mode', async ({ page }) => {
      const displayValue = page.locator('.display-value').first();
      await expect(displayValue).toBeVisible();
      const text = await displayValue.textContent();
      expect(text).toBeTruthy();
    });

    test('should enter edit mode on click', async ({ page }) => {
      const displayValue = page.locator('.display-value').first();
      await displayValue.click();
      const input = page.locator('input[matInput]').first();
      await expect(input).toBeVisible();
      await expect(input).toBeFocused();
    });

    test('should show input field in edit mode', async ({ page }) => {
      const displayValue = page.locator('.display-value').first();
      await displayValue.click();
      const input = page.locator('input[type="number"]').first();
      await expect(input).toBeVisible();
    });

    test('should save value on Enter key', async ({ page }) => {
      const displayValue = page.locator('.display-value').first();
      const originalValue = await displayValue.textContent();
      await displayValue.click();
      const input = page.locator('input[matInput]').first();
      await input.fill('200');
      await input.press('Enter');
      await expect(input).not.toBeVisible();
      const newValue = await displayValue.textContent();
      expect(newValue).not.toBe(originalValue);
    });

    test('should cancel edit on Escape key', async ({ page }) => {
      const displayValue = page.locator('.display-value').first();
      const originalValue = await displayValue.textContent();
      await displayValue.click();
      const input = page.locator('input[matInput]').first();
      await input.fill('999');
      await input.press('Escape');
      await expect(input).not.toBeVisible();
      const currentValue = await displayValue.textContent();
      expect(currentValue).toBe(originalValue);
    });

    test('should save value on blur', async ({ page }) => {
      const displayValue = page.locator('.display-value').first();
      await displayValue.click();
      const input = page.locator('input[matInput]').first();
      await input.fill('300');
      await page.click('body');
      await expect(input).not.toBeVisible();
    });

    test('should display currency format correctly', async ({ page }) => {
      const currencyCell = page
        .locator('.display-value[data-format="currency"]')
        .first();
      const text = await currencyCell.textContent();
      expect(text).toContain('$');
    });

    test('should display decimal format correctly', async ({ page }) => {
      const decimalCell = page
        .locator('.display-value[data-format="decimal"]')
        .first();
      const text = await decimalCell.textContent();
      // eslint-disable-next-line sonarjs/slow-regex -- Simple regex for decimal format validation
      expect(text).toMatch(/\d+\.\d{2}/);
    });
  });

  test.describe('Edge Cases', () => {
    test('should not trigger duplicate events on double-click', async ({
      page,
    }) => {
      const displayValue = page.locator('.display-value').first();
      await displayValue.dblclick();
      const inputs = page.locator('input[matInput]');
      const inputCount = await inputs.count();
      expect(inputCount).toBe(1);
    });

    test('should move to next cell on Tab key', async ({ page }) => {
      const firstCell = page.locator('.display-value').first();
      await firstCell.click();
      const input = page.locator('input[matInput]').first();
      await input.press('Tab');
      const secondInput = page.locator('input[matInput]').nth(1);
      await expect(secondInput).toBeFocused();
    });

    test('should move to previous cell on Shift+Tab', async ({ page }) => {
      const secondCell = page.locator('.display-value').nth(1);
      await secondCell.click();
      const input = page.locator('input[matInput]').first();
      await input.press('Shift+Tab');
      const firstInput = page.locator('input[matInput]').first();
      await expect(firstInput).toBeFocused();
    });

    test('should reject non-numeric input', async ({ page }) => {
      const displayValue = page.locator('.display-value').first();
      await displayValue.click();
      const input = page.locator('input[type="number"]').first();
      await input.fill('abc');
      const value = await input.inputValue();
      expect(value).toBe('');
    });

    test('should handle negative numbers when allowed', async ({ page }) => {
      const displayValue = page
        .locator('.display-value[data-allow-negative]')
        .first();
      await displayValue.click();
      const input = page.locator('input[matInput]').first();
      await input.fill('-50');
      await input.press('Enter');
      const text = await displayValue.textContent();
      expect(text).toContain('-');
    });

    test('should save zero value correctly', async ({ page }) => {
      const displayValue = page.locator('.display-value').first();
      await displayValue.click();
      const input = page.locator('input[matInput]').first();
      await input.fill('0');
      await input.press('Enter');
      const text = await displayValue.textContent();
      expect(text).toContain('0');
    });

    test('should format very large numbers correctly', async ({ page }) => {
      const displayValue = page.locator('.display-value').first();
      await displayValue.click();
      const input = page.locator('input[matInput]').first();
      await input.fill('1000000');
      await input.press('Enter');
      await expect(displayValue).toBeVisible();
    });

    test('should display very small decimals correctly', async ({ page }) => {
      const displayValue = page
        .locator('.display-value[data-format="decimal"]')
        .first();
      await displayValue.click();
      const input = page.locator('input[matInput]').first();
      await input.fill('0.0001');
      await input.press('Enter');
      const text = await displayValue.textContent();
      expect(parseFloat(text!)).toBeCloseTo(0.0001, 4);
    });

    test('should handle empty value correctly', async ({ page }) => {
      const displayValue = page.locator('.display-value').first();
      await displayValue.click();
      const input = page.locator('input[matInput]').first();
      await input.fill('');
      await input.press('Enter');
      await expect(displayValue).toBeVisible();
    });

    test('should handle concurrent edits in multiple cells', async ({
      page,
    }) => {
      const firstCell = page.locator('.display-value').first();
      const secondCell = page.locator('.display-value').nth(1);
      await firstCell.click();
      const firstInput = page.locator('input[matInput]').first();
      await firstInput.fill('100');
      await secondCell.click();
      const firstCellVisible = await firstInput.isVisible();
      expect(firstCellVisible).toBe(false);
      const secondInput = page.locator('input[matInput]').first();
      await expect(secondInput).toBeVisible();
    });

    test('should cancel edit when cell scrolls out of view', async ({
      page,
    }) => {
      const displayValue = page.locator('.display-value').first();
      await displayValue.click();
      const input = page.locator('input[matInput]').first();
      await expect(input).toBeVisible();
      await page.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(500);
      const inputVisible = await input.isVisible();
      expect(inputVisible).toBe(false);
    });

    test('should support copy/paste values', async ({ page }) => {
      const displayValue = page.locator('.display-value').first();
      await displayValue.click();
      const input = page.locator('input[matInput]').first();
      await input.fill('123');
      await input.press('Control+A');
      await input.press('Control+C');
      await input.fill('');
      await input.press('Control+V');
      const value = await input.inputValue();
      expect(value).toBe('123');
    });

    test('should support undo within edit mode', async ({ page }) => {
      const displayValue = page.locator('.display-value').first();
      await displayValue.click();
      const input = page.locator('input[matInput]').first();
      await input.fill('100');
      await input.fill('200');
      await input.press('Control+Z');
      const value = await input.inputValue();
      expect(value).not.toBe('200');
    });

    test('should enter edit mode on tap for touch devices', async ({
      page,
    }) => {
      const displayValue = page.locator('.display-value').first();
      await displayValue.tap();
      const input = page.locator('input[matInput]').first();
      await expect(input).toBeVisible();
    });
  });
});
