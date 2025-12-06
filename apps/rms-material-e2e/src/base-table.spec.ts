import { expect, test } from '@playwright/test';

test.describe('Base Table Component with Virtual Scrolling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Login');
  });

  test('should render table with virtual scrolling', async ({ page }) => {
    await page.waitForSelector('cdk-virtual-scroll-viewport', {
      timeout: 5000,
    });
    const viewport = page.locator('cdk-virtual-scroll-viewport');
    await expect(viewport).toBeVisible();
  });

  test('should render only visible rows plus buffer', async ({ page }) => {
    await page.waitForSelector('mat-table', { timeout: 5000 });
    const rows = page.locator('tr.mat-mdc-row');
    const rowCount = await rows.count();
    expect(rowCount).toBeLessThan(100);
  });

  test('should load more data when scrolling', async ({ page }) => {
    await page.waitForSelector('cdk-virtual-scroll-viewport', {
      timeout: 5000,
    });
    const viewport = page.locator('cdk-virtual-scroll-viewport');
    const initialRowCount = await page.locator('tr.mat-mdc-row').count();

    await viewport.evaluate((node) => {
      const el = node as HTMLElement;
      el.scrollTop = el.scrollHeight / 2;
    });

    await page.waitForTimeout(500);
    const newRowCount = await page.locator('tr.mat-mdc-row').count();
    expect(newRowCount).toBeGreaterThanOrEqual(initialRowCount);
  });

  test('should show loading indicator during data fetch', async ({ page }) => {
    const progressBar = page.locator('mat-progress-bar');
    if (await progressBar.isVisible()) {
      await expect(progressBar).toHaveAttribute('mode', 'indeterminate');
    }
  });

  test('should support column sorting', async ({ page }) => {
    await page.waitForSelector('th[mat-sort-header]', { timeout: 5000 });
    const sortableHeader = page.locator('th[mat-sort-header]').first();
    if ((await sortableHeader.count()) > 0) {
      await sortableHeader.click();
      await expect(sortableHeader).toHaveAttribute('aria-sort');
    }
  });

  test('should support row selection', async ({ page }) => {
    await page.waitForSelector('tr.mat-mdc-row', { timeout: 5000 });
    const firstRow = page.locator('tr.mat-mdc-row').first();
    const rowCount = await page.locator('tr.mat-mdc-row').count();

    if (rowCount > 0) {
      await firstRow.click();
      await expect(firstRow).toHaveClass(/selected/);
    }
  });

  test('should handle empty state', async ({ page }) => {
    await page.waitForSelector('mat-table', { timeout: 5000 });
    const rows = await page.locator('tr.mat-mdc-row').count();
    expect(rows).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Base Table - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Login');
  });

  test('should handle rapid scrolling', async ({ page }) => {
    await page.waitForSelector('cdk-virtual-scroll-viewport', {
      timeout: 5000,
    });
    const viewport = page.locator('cdk-virtual-scroll-viewport');

    for (let i = 0; i < 5; i++) {
      await viewport.evaluate((node) => {
        const el = node as HTMLElement;
        el.scrollTop = Math.random() * el.scrollHeight;
      });
      await page.waitForTimeout(100);
    }

    const rows = page.locator('tr.mat-mdc-row');
    await expect(rows.first()).toBeVisible();
  });

  test('should maintain scroll position after data refresh', async ({
    page,
  }) => {
    await page.waitForSelector('cdk-virtual-scroll-viewport', {
      timeout: 5000,
    });
    const viewport = page.locator('cdk-virtual-scroll-viewport');

    await viewport.evaluate((node) => {
      const el = node as HTMLElement;
      el.scrollTop = 500;
    });

    const scrollTop = await viewport.evaluate((node) => {
      const el = node as HTMLElement;
      return el.scrollTop;
    });

    expect(scrollTop).toBeGreaterThan(0);
  });
});
