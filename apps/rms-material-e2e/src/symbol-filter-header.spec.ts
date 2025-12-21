import { test, expect } from 'playwright/test';

test.describe('Symbol Filter Header Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.skip('should display filter dropdown with options', async ({ page }) => {
    const filterField = page.locator('mat-select');
    await expect(filterField).toBeVisible();
    await filterField.click();
    const options = page.locator('mat-option');
    await expect(options).not.toHaveCount(0);
  });

  test.skip('should filter table data when option selected', async ({
    page,
  }) => {
    const filterField = page.locator('mat-select');
    await filterField.click();
    const option = page.locator('mat-option').first();
    await option.click();
    await expect(filterField).toContainText(await option.textContent());
  });

  test.skip('should show all data when "All" option selected', async ({
    page,
  }) => {
    const filterField = page.locator('mat-select');
    await filterField.click();
    await page.locator('mat-option', { hasText: 'All' }).click();
    const tableRows = page.locator('table tbody tr');
    await expect(tableRows).not.toHaveCount(0);
  });

  test.skip('should fit filter within table header cell', async ({ page }) => {
    const filterField = page.locator('mat-form-field.filter-field');
    const boundingBox = await filterField.boundingBox();
    expect(boundingBox?.width).toBeLessThanOrEqual(150);
  });

  test.skip('should navigate filter options with keyboard', async ({
    page,
  }) => {
    const filterField = page.locator('mat-select');
    await filterField.click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(filterField).not.toBeEmpty();
  });

  test.skip('should close dropdown with Escape key', async ({ page }) => {
    const filterField = page.locator('mat-select');
    await filterField.click();
    await page.keyboard.press('Escape');
    const panel = page.locator('.mat-mdc-select-panel');
    await expect(panel).not.toBeVisible();
  });

  test.skip('should close dropdown when clicking outside', async ({ page }) => {
    const filterField = page.locator('mat-select');
    await filterField.click();
    const panel = page.locator('.mat-mdc-select-panel');
    await expect(panel).toBeVisible();
    await page.locator('body').click({ position: { x: 0, y: 0 } });
    await expect(panel).not.toBeVisible();
  });

  test.skip('should render many options performantly', async ({ page }) => {
    const filterField = page.locator('mat-select');
    const startTime = Date.now();
    await filterField.click();
    const renderTime = Date.now() - startTime;
    expect(renderTime).toBeLessThan(500);
    const options = page.locator('mat-option');
    await expect(options).not.toHaveCount(0);
  });

  test.skip('should show active filter indicator when not "All"', async ({
    page,
  }) => {
    const filterField = page.locator('mat-select');
    await filterField.click();
    const option = page.locator('mat-option').nth(1);
    await option.click();
    const selectedText = await filterField.textContent();
    expect(selectedText).not.toBe('All');
  });

  test.skip('should announce filter changes to screen readers', async ({
    page,
  }) => {
    const filterField = page.locator('mat-select');
    await filterField.click();
    const option = page.locator('mat-option').first();
    await option.click();
    const ariaLabel = await filterField.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
  });
});
