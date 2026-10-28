import { expect, test } from 'playwright/test';
import { login } from './helpers/login.helper';

/** Known seeded universe row (tools/create-test-db.js) with a non-null ex_date. */
const SEED_SYMBOL = 'TESTEQ1';

/** Story 10.2 widened the Ex-Date column to 230px; lock in >= 200px. */
const MIN_COLUMN_WIDTH_PX = 200;

/** Tolerance (px) for "input right edge sits within the cell content box". */
const EDGE_TOLERANCE_PX = 4;

test.describe('Universe Ex-Date column width', () => {
  // The Universe table's configured column widths sum to ~1530px (+ select
  // column), wider than the default 1280px Desktop Chrome viewport. Use a wide
  // viewport so every column renders at its full configured width and the
  // assertions are deterministic instead of proportional-shrink dependent.
  test.use({ viewportSize: { width: 1920, height: 1080 } });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');

    const table = page.locator('dms-base-table');
    await expect(table).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.dms-body-row[role="row"]').first()).toBeVisible(
      { timeout: 10000 },
    );

    // The shared e2e SQLite DB accumulates rows across runs — filter to a
    // known seeded row instead of assuming which rows are present.
    const symbolInput = page.locator('input[placeholder="Search Symbol"]');
    await symbolInput.fill(SEED_SYMBOL);
    await expect(
      page.locator('.dms-body-row', { hasText: SEED_SYMBOL }).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('Ex-Date column renders at least the widened width (>= 200px)', async ({
    page,
  }) => {
    const headerWidth = await page
      .locator('mat-header-cell[data-column="ex_date"]')
      .evaluate((cell) => cell.getBoundingClientRect().width);
    expect(
      headerWidth,
      `header ex_date width ${headerWidth}px`,
    ).toBeGreaterThanOrEqual(MIN_COLUMN_WIDTH_PX);

    const bodyCell = page
      .locator('.dms-body-row', { hasText: SEED_SYMBOL })
      .first()
      .locator('mat-cell.dms-body-cell[data-column="ex_date"]');
    await expect(bodyCell).toBeVisible();

    const bodyWidth = await bodyCell.evaluate(
      (cell) => cell.getBoundingClientRect().width,
    );
    expect(
      bodyWidth,
      `body ex_date width ${bodyWidth}px`,
    ).toBeGreaterThanOrEqual(MIN_COLUMN_WIDTH_PX);
  });

  test('editable date input is not clipped by the Ex-Date cell', async ({
    page,
  }) => {
    const row = page.locator('.dms-body-row', { hasText: SEED_SYMBOL }).first();
    const bodyCell = row.locator(
      'mat-cell.dms-body-cell[data-column="ex_date"]',
    );

    // Sanity: the seeded row carries a date value in display mode.
    const displayValue = bodyCell.locator('span.display-value');
    await expect(displayValue).toBeVisible();
    await expect(displayValue).toHaveText(/\d{2}\/\d{2}\/\d{4}/);

    // Enter edit mode so the inner <input> renders.
    await displayValue.click();
    const dateInput = bodyCell.locator('input[aria-label="Edit date"]');
    await expect(dateInput).toBeVisible();

    // Overflow of the input's right edge past the cell content-box right
    // edge (cell rect right minus computed padding-right); <= 0 means fully
    // inside. Padding is read via getComputedStyle because
    // getBoundingClientRect includes it.
    const overflowPx = await bodyCell.evaluate((cell) => {
      const cellRect = cell.getBoundingClientRect();
      const style = window.getComputedStyle(cell);
      const padRight = parseFloat(style.paddingRight) || 0;
      const input = cell.querySelector('input[aria-label="Edit date"]');
      if (!input) {
        throw new Error('editable date input not found in ex_date cell');
      }
      return input.getBoundingClientRect().right - (cellRect.right - padRight);
    });

    expect(
      overflowPx,
      `date input right edge overflows the ex_date cell content box by ${overflowPx}px`,
    ).toBeLessThanOrEqual(EDGE_TOLERANCE_PX);
  });
});
