import { test, expect } from '@playwright/test';

test.describe('Splitter', () => {
  test.beforeEach(async ({ page }) => {
    // Clear splitter state
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('rms-main-splitter'));
  });

  test('should display splitter with two panels', async ({ page }) => {
    await page.goto('/');

    const leftPanel = page.locator('.accounts-panel');
    const rightPanel = page.locator('.content-panel');
    const handle = page.locator('.splitter-handle');

    await expect(leftPanel).toBeVisible();
    await expect(rightPanel).toBeVisible();
    await expect(handle).toBeVisible();
  });

  test('should have correct initial layout', async ({ page }) => {
    await page.goto('/');

    const container = page.locator('.splitter-container');
    await expect(container).toHaveCSS('display', 'grid');
  });

  test('should resize panels when dragging handle', async ({ page }) => {
    await page.goto('/');

    const handle = page.locator('.splitter-handle');
    const leftPanel = page.locator('.left-panel');

    // Get initial width
    const initialBox = await leftPanel.boundingBox();
    const initialWidth = initialBox?.width || 0;

    // Drag handle to the right
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(initialBox!.x + 100, initialBox!.y);
    await page.mouse.up();

    // Wait for resize
    await page.waitForTimeout(100);

    // Check new width
    const newBox = await leftPanel.boundingBox();
    const newWidth = newBox?.width || 0;

    expect(newWidth).toBeGreaterThan(initialWidth);
  });

  test('should show correct cursor on handle hover', async ({ page }) => {
    await page.goto('/');

    const handle = page.locator('.splitter-handle');
    await expect(handle).toHaveCSS('cursor', 'col-resize');
  });

  test('should persist splitter position in localStorage', async ({ page }) => {
    await page.goto('/');

    const handle = page.locator('.splitter-handle');
    const leftPanel = page.locator('.left-panel');

    const initialBox = await leftPanel.boundingBox();

    // Drag handle
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(initialBox!.x + 100, initialBox!.y);
    await page.mouse.up();

    await page.waitForTimeout(100);

    // Check localStorage
    const stored = await page.evaluate(() =>
      localStorage.getItem('rms-main-splitter')
    );
    expect(stored).toBeTruthy();
    expect(parseFloat(stored!)).toBeGreaterThan(20);
  });

  test('should restore splitter position on page reload', async ({ page }) => {
    await page.goto('/');

    const handle = page.locator('.splitter-handle');
    const leftPanel = page.locator('.left-panel');

    const initialBox = await leftPanel.boundingBox();

    // Drag handle to specific position
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(initialBox!.x + 150, initialBox!.y);
    await page.mouse.up();

    await page.waitForTimeout(100);

    const beforeReloadBox = await leftPanel.boundingBox();
    const beforeReloadWidth = beforeReloadBox?.width || 0;

    // Reload page
    await page.reload();

    // Check width is restored
    const afterReloadBox = await leftPanel.boundingBox();
    const afterReloadWidth = afterReloadBox?.width || 0;

    // Allow small difference due to rounding
    expect(Math.abs(afterReloadWidth - beforeReloadWidth)).toBeLessThan(2);
  });

  test('should clamp to minimum width', async ({ page }) => {
    await page.goto('/');

    const handle = page.locator('.splitter-handle');
    const container = page.locator('.splitter-container');

    const containerBox = await container.boundingBox();

    // Try to drag to very left (should clamp to 10%)
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(containerBox!.x + 10, containerBox!.y);
    await page.mouse.up();

    await page.waitForTimeout(100);

    const leftPanel = page.locator('.left-panel');
    const leftBox = await leftPanel.boundingBox();
    const leftWidth = leftBox?.width || 0;
    const containerWidth = containerBox?.width || 1;

    const percentage = (leftWidth / containerWidth) * 100;
    expect(percentage).toBeGreaterThanOrEqual(9); // Allow small variance
    expect(percentage).toBeLessThanOrEqual(11);
  });

  test('should clamp to maximum width', async ({ page }) => {
    await page.goto('/');

    const handle = page.locator('.splitter-handle');
    const container = page.locator('.splitter-container');

    const containerBox = await container.boundingBox();

    // Try to drag to far right (should clamp to 50%)
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(
      containerBox!.x + containerBox!.width - 10,
      containerBox!.y
    );
    await page.mouse.up();

    await page.waitForTimeout(100);

    const leftPanel = page.locator('.left-panel');
    const leftBox = await leftPanel.boundingBox();
    const leftWidth = leftBox?.width || 0;
    const containerWidth = containerBox?.width || 1;

    const percentage = (leftWidth / containerWidth) * 100;
    expect(percentage).toBeGreaterThanOrEqual(49); // Allow small variance
    expect(percentage).toBeLessThanOrEqual(51);
  });
});
