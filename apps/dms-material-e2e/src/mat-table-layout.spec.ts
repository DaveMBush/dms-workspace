import { expect, Page, test } from 'playwright/test';
import { login } from './helpers/login.helper';
import { seedUniverseE2eData } from './helpers/seed-universe-e2e-data.helper';
import { settle } from './helpers/settle.helper';

/**
 * Story 3.3 — E2E verification of the div-based mat-table layout (Epic 3).
 *
 * The DMS BaseTable was converted from a native <table> to Material's
 * div-based <mat-table> (Story 3.2): rows/cells are now `mat-row` / `mat-cell`
 * custom elements carrying ARIA roles, with no native table semantics left in
 * the DOM. This spec verifies that contract in a real browser against the
 * running app:
 *   1. the table renders as a div-based mat-table (no native <table>/<tr>/<td>), and
 *   2. each row lays its cells out horizontally, left to right — i.e. the visual
 *      layout is preserved even though the DOM structure changed.
 */

const HOST_SELECTOR = 'dms-base-table';
const ROW_SELECTOR = '.dms-body-row[role="row"]';
const CELL_SELECTOR = '.dms-body-cell[role="cell"]';

async function waitForTableRows(page: Page): Promise<void> {
  await expect(page.locator(HOST_SELECTOR)).toBeVisible({ timeout: 15000 });
  await page.waitForSelector(ROW_SELECTOR, { timeout: 15000 });
}

test.describe('div-based mat-table layout', () => {
  const cleanups: Array<() => Promise<void>> = [];

  test.afterAll(async () => {
    for (const cleanup of cleanups.splice(0)) {
      await cleanup();
    }
  });

  test.beforeEach(async ({ page }) => {
    // Seed a known set of universe rows so the table is guaranteed to render.
    const result = await seedUniverseE2eData();
    cleanups.push(result.cleanup);

    await login(page);
    await page.goto('/global/universe');

    // Filter down to only the seeded rows (they share a symbol suffix) so the
    // assertions run against a small, deterministic set.
    const sharedSuffix = result.symbols[0].slice('UAAA-'.length);
    const symbolInput = page.locator('input[placeholder="Search Symbol"]');
    await symbolInput.fill(sharedSuffix);
    await settle(page, 1000);

    await waitForTableRows(page);
  });

  test('renders as a div-based mat-table with no native <table> element', async ({
    page,
  }) => {
    const host = page.locator(HOST_SELECTOR);

    // AC #1: the div-based mat-table is present inside the virtual-scroll viewport.
    await expect(
      host.locator(
        'cdk-virtual-scroll-viewport mat-table[role="table"], cdk-virtual-scroll-viewport .mat-mdc-table',
      ),
    ).toBeVisible();

    // AC #2: no native table elements remain anywhere inside the base-table host.
    for (const tag of ['table', 'th', 'td', 'thead', 'tbody', 'tr']) {
      expect(await host.locator(tag).count()).toBe(0);
    }

    // Rows and cells are Material custom elements carrying ARIA roles — not
    // native table semantics, and not literal <div>s.
    const firstRow = host.locator(ROW_SELECTOR).first();
    await expect(firstRow).toBeVisible();
    expect(await firstRow.evaluate((el) => el.tagName.toLowerCase())).toBe('mat-row');

    const cell = firstRow.locator(CELL_SELECTOR).first();
    expect(await cell.evaluate((el) => el.tagName.toLowerCase())).toBe('mat-cell');
  });

  test('lays out row cells horizontally, left to right', async ({ page }) => {
    const host = page.locator(HOST_SELECTOR);
    const firstRow = host.locator(ROW_SELECTOR).first();
    const cells = firstRow.locator(CELL_SELECTOR);

    // The universe table has multiple columns; assert we rendered them.
    const cellCount = await cells.count();
    expect(cellCount).toBeGreaterThan(1);

    // Every cell sits at or to the right of the previous one (left-to-right
    // order), and all cells in the row share a top edge — confirming the
    // horizontal layout is preserved by the div-based structure.
    const boxes = await cells.evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top };
      }),
    );

    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i].left).toBeGreaterThanOrEqual(boxes[i - 1].left);
    }
    // The row actually spans horizontally (last cell is to the right of first).
    expect(boxes[boxes.length - 1].left).toBeGreaterThan(boxes[0].left);

    // Cells in the same row share a top edge.
    const tops = new Set(boxes.map((b) => Math.round(b.top)));
    expect(tops.size).toBe(1);
  });
});
