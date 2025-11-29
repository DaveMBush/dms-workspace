import { test, expect } from '@playwright/test';

import { login } from './helpers/auth.helper';

test.describe('Splitter', () => {
  test.beforeEach(async ({ page }) => {
    // Clear splitter state and login
    await page.goto('/auth/login');
    await page.evaluate(() => localStorage.removeItem('rms-main-splitter'));
    await login(page);
  });

  test('should display splitter with two panels', async ({ page }) => {
    const leftPanel = page.locator('.accounts-panel');
    const rightPanel = page.locator('.content-panel');
    const handle = page.locator('.splitter-handle');

    await expect(leftPanel).toBeVisible();
    await expect(rightPanel).toBeVisible();
    await expect(handle).toBeVisible();
  });

  test('should have correct initial layout', async ({ page }) => {
    const container = page.locator('.splitter-container');
    await expect(container).toHaveCSS('display', 'grid');
  });

  test('should show correct cursor on handle hover', async ({ page }) => {
    const handle = page.locator('.splitter-handle');
    await expect(handle).toHaveCSS('cursor', 'col-resize');
  });

  test('should clamp to minimum width (10%)', async ({ page }) => {
    const handle = page.locator('.splitter-handle');
    const container = page.locator('.splitter-container');

    const containerBox = await container.boundingBox();

    // Try to drag to very left (should clamp to 10%)
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(containerBox!.x + 10, containerBox!.y);
    await page.mouse.up();

    await page.waitForTimeout(100);

    // Check localStorage value is clamped to minimum
    const stored = await page.evaluate(() =>
      localStorage.getItem('rms-main-splitter')
    );
    expect(stored).toBeTruthy();
    const percentage = parseFloat(stored!);
    expect(percentage).toBeGreaterThanOrEqual(9);
    expect(percentage).toBeLessThanOrEqual(11);
  });

  test('should clamp to maximum width (50%)', async ({ page }) => {
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

    // Check localStorage value is clamped to maximum
    const stored = await page.evaluate(() =>
      localStorage.getItem('rms-main-splitter')
    );
    expect(stored).toBeTruthy();
    const percentage = parseFloat(stored!);
    expect(percentage).toBeGreaterThanOrEqual(49);
    expect(percentage).toBeLessThanOrEqual(51);
  });

  test('should resize panels when dragging handle left and right', async ({
    page,
  }) => {
    const handle = page.locator('.splitter-handle');
    const leftPanel = page.locator('.accounts-panel');
    const container = page.locator('.splitter-container');

    const containerBox = await container.boundingBox();
    const initialLeftBox = await leftPanel.boundingBox();
    const initialLeftWidth = initialLeftBox?.width || 0;

    // Drag handle to the right (increase left panel width)
    const targetX = containerBox!.x + containerBox!.width * 0.35;
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(targetX, containerBox!.y);
    await page.mouse.up();

    await page.waitForTimeout(100);

    // Left panel should be wider
    const afterRightDragBox = await leftPanel.boundingBox();
    const afterRightDragWidth = afterRightDragBox?.width || 0;
    expect(afterRightDragWidth).toBeGreaterThan(initialLeftWidth);

    // Drag handle to the left (decrease left panel width)
    const targetX2 = containerBox!.x + containerBox!.width * 0.15;
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(targetX2, containerBox!.y);
    await page.mouse.up();

    await page.waitForTimeout(100);

    // Left panel should be narrower than after right drag
    const afterLeftDragBox = await leftPanel.boundingBox();
    const afterLeftDragWidth = afterLeftDragBox?.width || 0;
    expect(afterLeftDragWidth).toBeLessThan(afterRightDragWidth);
  });

  test('should persist splitter position in localStorage', async ({ page }) => {
    const handle = page.locator('.splitter-handle');
    const container = page.locator('.splitter-container');

    const containerBox = await container.boundingBox();

    // Drag handle to 30% position
    const targetX = containerBox!.x + containerBox!.width * 0.3;
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(targetX, containerBox!.y);
    await page.mouse.up();

    await page.waitForTimeout(100);

    // Check localStorage
    const stored = await page.evaluate(() =>
      localStorage.getItem('rms-main-splitter')
    );
    expect(stored).toBeTruthy();
    const percentage = parseFloat(stored!);
    expect(percentage).toBeGreaterThan(25);
    expect(percentage).toBeLessThan(35);
  });

  test('should restore splitter position on page reload', async ({ page }) => {
    const handle = page.locator('.splitter-handle');
    const container = page.locator('.splitter-container');

    const containerBox = await container.boundingBox();

    // Drag handle to 30% position
    const targetX = containerBox!.x + containerBox!.width * 0.3;
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(targetX, containerBox!.y);
    await page.mouse.up();

    await page.waitForTimeout(100);

    // Get the stored value before reload
    const storedBefore = await page.evaluate(() =>
      localStorage.getItem('rms-main-splitter')
    );

    // Reload page
    await page.reload();
    await page.waitForTimeout(500);

    // Check the stored value after reload matches
    const storedAfter = await page.evaluate(() =>
      localStorage.getItem('rms-main-splitter')
    );

    expect(storedAfter).toBe(storedBefore);
  });

  test('should restore visual splitter position after app restart', async ({
    page,
    context,
  }) => {
    const handle = page.locator('.splitter-handle');
    const leftPanel = page.locator('.accounts-panel');
    const container = page.locator('.splitter-container');

    const containerBox = await container.boundingBox();

    // Drag handle to 35% position
    const targetX = containerBox!.x + containerBox!.width * 0.35;
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(targetX, containerBox!.y);
    await page.mouse.up();

    await page.waitForTimeout(100);

    // Get actual panel width before restart
    const beforeRestartBox = await leftPanel.boundingBox();
    const beforeRestartWidth = beforeRestartBox?.width || 0;
    const containerWidth = containerBox?.width || 1;
    const beforeRestartPercentage = (beforeRestartWidth / containerWidth) * 100;

    // Close page and create new one (simulating app restart)
    await page.close();
    const newPage = await context.newPage();
    await login(newPage);

    await newPage.waitForTimeout(500);

    // Get panel width after restart
    const newLeftPanel = newPage.locator('.accounts-panel');
    const newContainer = newPage.locator('.splitter-container');
    const afterRestartBox = await newLeftPanel.boundingBox();
    const newContainerBox = await newContainer.boundingBox();
    const afterRestartWidth = afterRestartBox?.width || 0;
    const newContainerWidth = newContainerBox?.width || 1;
    const afterRestartPercentage = (afterRestartWidth / newContainerWidth) * 100;

    // Visual position should be restored (allow 2% variance)
    expect(Math.abs(afterRestartPercentage - beforeRestartPercentage)).toBeLessThan(
      2
    );
  });

  test('should not resize when clicking handle without dragging', async ({
    page,
  }) => {
    const handle = page.locator('.splitter-handle');
    const leftPanel = page.locator('.accounts-panel');

    const initialBox = await leftPanel.boundingBox();
    const initialWidth = initialBox?.width || 0;

    // Click handle without dragging
    await handle.click();

    await page.waitForTimeout(100);

    // Width should remain the same
    const afterClickBox = await leftPanel.boundingBox();
    const afterClickWidth = afterClickBox?.width || 0;

    expect(afterClickWidth).toBe(initialWidth);
  });

  test('should maintain splitter position when window resizes', async ({
    page,
  }) => {
    const handle = page.locator('.splitter-handle');
    const leftPanel = page.locator('.accounts-panel');
    const container = page.locator('.splitter-container');

    const containerBox = await container.boundingBox();

    // Drag to 30% position
    const targetX = containerBox!.x + containerBox!.width * 0.3;
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(targetX, containerBox!.y);
    await page.mouse.up();

    await page.waitForTimeout(100);

    // Get percentage
    const beforeBox = await leftPanel.boundingBox();
    const beforeContainerBox = await container.boundingBox();
    const beforePercentage =
      ((beforeBox?.width || 0) / (beforeContainerBox?.width || 1)) * 100;

    // Resize window
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(300);

    // Get new percentage
    const afterBox = await leftPanel.boundingBox();
    const afterContainerBox = await container.boundingBox();
    const afterPercentage =
      ((afterBox?.width || 0) / (afterContainerBox?.width || 1)) * 100;

    // Percentage should be approximately the same (allow 2% variance)
    expect(Math.abs(afterPercentage - beforePercentage)).toBeLessThan(2);
  });

  test('should handle rapid dragging correctly', async ({ page }) => {
    const handle = page.locator('.splitter-handle');
    const container = page.locator('.splitter-container');

    const containerBox = await container.boundingBox();

    // Rapid drag sequence
    for (let i = 0; i < 3; i++) {
      const targetX =
        containerBox!.x + containerBox!.width * (0.2 + i * 0.1);
      await handle.hover();
      await page.mouse.down();
      await page.mouse.move(targetX, containerBox!.y);
      await page.mouse.up();
      await page.waitForTimeout(50);
    }

    // Should have a valid stored value
    const stored = await page.evaluate(() =>
      localStorage.getItem('rms-main-splitter')
    );
    expect(stored).toBeTruthy();
    const percentage = parseFloat(stored!);
    expect(percentage).toBeGreaterThanOrEqual(10);
    expect(percentage).toBeLessThanOrEqual(50);
  });

  test('should use default 20% width when no localStorage value exists', async ({
    page,
  }) => {
    const leftPanel = page.locator('.accounts-panel');
    const container = page.locator('.splitter-container');

    await page.waitForTimeout(500);

    const leftBox = await leftPanel.boundingBox();
    const containerBox = await container.boundingBox();

    const percentage =
      ((leftBox?.width || 0) / (containerBox?.width || 1)) * 100;

    // Should be close to 20% (allow 2% variance)
    expect(percentage).toBeGreaterThan(18);
    expect(percentage).toBeLessThan(22);
  });
});

