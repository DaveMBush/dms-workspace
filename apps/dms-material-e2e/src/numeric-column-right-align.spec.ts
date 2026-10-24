import { expect, test } from 'playwright/test';
import type { Page } from 'playwright/test';
import { login } from './helpers/login.helper';
import { settle } from './helpers/settle.helper';

const ACCOUNT_UUID = '1677e04f-ef9b-4372-adb3-b740443088dc';

/** Tolerance (px) for "content sits at the cell edge". */
const EDGE_TOLERANCE_PX = 4;

interface CellAlignment {
  /** Gap between value right edge and cell content-box right edge. */
  rightGap: number;
  /** Gap between value left edge and cell content-box left edge. */
  leftGap: number;
}

/**
 * Measure where the rendered value sits inside a `<mat-cell>`.
 * The value element is the first child element (e.g. editable-cell's
 * display span); for plain-text cells we measure the rendered glyph extent
 * via a Range over the non-whitespace text so alignment gaps are real.
 * Padding is read via getComputedStyle because getBoundingClientRect
 * includes it.
 */
async function measureCellAlignment(
  page: Page,
  rowLocator: ReturnType<Page['locator']>,
  columnField: string,
): Promise<CellAlignment> {
  return rowLocator
    .locator(`mat-cell.dms-body-cell[data-column="${columnField}"]`)
    .first()
    .evaluate((cell) => {
      const cellRect = cell.getBoundingClientRect();
      const style = window.getComputedStyle(cell);
      const padLeft = parseFloat(style.paddingLeft) || 0;
      const padRight = parseFloat(style.paddingRight) || 0;

      let valueRect: DOMRect;
      const firstChild = cell.firstElementChild;
      if (firstChild) {
        valueRect = firstChild.getBoundingClientRect();
      } else {
        // Plain text node: measure the rendered glyph extent via a Range so
        // left/right gaps are real (a full-width fallback rect would make the
        // alignment assertion vacuous).
        const range = document.createRange();
        range.selectNodeContents(cell);
        valueRect = range.getBoundingClientRect();
      }

      return {
        rightGap: cellRect.right - padRight - valueRect.right,
        leftGap: valueRect.left - (cellRect.left + padLeft),
      };
    });
}

test.describe('Numeric column right-alignment', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`/account/${ACCOUNT_UUID}/open`);
    await page.waitForLoadState('networkidle');
    await settle(page, 2000); // Give time for positions data to load

    const table = page.locator('[data-testid="open-positions-table"]');
    await expect(table).toBeVisible({ timeout: 10000 });
    await expect(
      table.locator('.dms-body-row[role="row"]').first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('numeric column content is right-aligned, text column left-aligned', async ({
    page,
  }) => {
    const row = page
      .locator('[data-testid="open-positions-table"]')
      .locator('.dms-body-row[role="row"]')
      .first();

    // Sanity: the sampled numeric cell actually carries the numeric class.
    await expect(
      row.locator('mat-cell.dms-body-cell--numeric[data-column="quantity"]'),
    ).toBeVisible();

    const quantity = await measureCellAlignment(page, row, 'quantity');
    expect(
      Math.abs(quantity.rightGap),
      `quantity value right edge should sit at the cell content-box right edge (gap ${quantity.rightGap}px)`,
    ).toBeLessThanOrEqual(EDGE_TOLERANCE_PX);

    const symbol = await measureCellAlignment(page, row, 'symbol');
    expect(
      Math.abs(symbol.leftGap),
      `symbol value left edge should sit at the cell content-box left edge (gap ${symbol.leftGap}px)`,
    ).toBeLessThanOrEqual(EDGE_TOLERANCE_PX);
  });
});
