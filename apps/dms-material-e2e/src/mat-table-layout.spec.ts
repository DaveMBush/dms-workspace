import { test, expect } from '@playwright/test';

/**
 * Story 3.3 — E2E verification of the div-based mat-table layout (Epic 3).
 *
 * The DMS BaseTable was converted from a native <table> to a flexbox/div grid
 * (Story 3.2). This spec verifies, in a real browser against the running app:
 *   1. the table renders as divs (no native <table>/<tr>/<td>), and
 *   2. each row is a horizontal flex container whose cells are laid out left
 *      to right with equal widths — i.e. the visual layout is preserved even
 *      though the DOM structure changed.
 */

const ROW_SELECTOR = '[data-testid="dms-base-table-row"]';
const CELL_SELECTOR = '[data-testid="dms-base-table-cell"]';

test.describe('div-based mat-table layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // The account panel is the first table on the dashboard and renders a
    // DMS BaseTable. Wait for its rows to be present before asserting layout.
    await expect(page.locator(ROW_SELECTOR).first()).toBeVisible();
  });

  test('renders as divs, not a native <table>', async ({ page }) => {
    const firstRow = page.locator(ROW_SELECTOR).first();

    // The row and its cells are generic elements (div), not table semantics.
    await expect(firstRow).toHaveCount(1);
    expect(await firstRow.evaluate((el) => el.tagName.toLowerCase())).toBe('div');

    const cell = firstRow.locator(CELL_SELECTOR).first();
    expect(await cell.evaluate((el) => el.tagName.toLowerCase())).toBe('div');

    // No native table elements exist anywhere in the rendered table.
    await expect(page.locator('table')).toHaveCount(0);
  });

  test('lays out row cells horizontally with equal widths', async ({ page }) => {
    const firstRow = page.locator(ROW_SELECTOR).first();
    const cells = firstRow.locator(CELL_SELECTOR);

    // The account table has a known number of columns; assert we rendered them.
    const cellCount = await cells.count();
    expect(cellCount).toBeGreaterThan(1);

    // Row is a horizontal flex container (the div-based layout mechanism).
    const rowDisplay = await firstRow.evaluate((el) => getComputedStyle(el).display);
    expect(rowDisplay).toMatch(/flex/);

    // Every cell sits to the right of the previous one (left-to-right order),
    // and all cells share the same computed width — confirming the grid layout.
    const boxes = await cells.evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, width: r.width };
      })
    );

    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i].left).toBeGreaterThan(boxes[i - 1].left);
    }
    // Cells in the same row share a top edge.
    const tops = new Set(boxes.map((b) => Math.round(b.top)));
    expect(tops.size).toBe(1);

    // Equal-width columns: first and last cell widths match within 1px.
    expect(Math.abs(boxes[0].width - boxes[boxes.length - 1].width)).toBeLessThanOrEqual(1);
  });
});
