/**
 * column-header-wrap-top-align.spec.ts — Epic 5 (Story 5.3)
 * ──────────────────────────────────────────────────────────
 *
 * E2E verification for Story 5.2's style change: the shared `.dms-header-cell`
 * must no longer clip its text, and wrapped header content must align to the top
 * of the cell. Each rendered column-label header cell is asserted to show its
 * full `column.header`:
 *   - computed `white-space` resolves to normal/unset (NOT `nowrap`)
 *   - computed `text-overflow` is NOT `ellipsis`
 *   - computed `vertical-align` is `top` (wrapped text sits at the top edge)
 *   - scrollHeight === clientHeight  (no vertical clipping)
 *   - scrollWidth  <= clientWidth     (full text fits, no horizontal clip)
 *
 * The assertions hold across two viewport sizes — 1280px desktop (the default
 * `Desktop Chrome` project viewport) and 768px tablet. Because every column has
 * a fixed inline width, wrapping happens within the cell's own box; asserting
 * per-cell containment proves the table container gains no horizontal overflow
 * from the wrapping.
 *
 * RED SIGNAL: against unfixed code `.dms-header-cell` still sets
 * `white-space: nowrap; text-overflow: ellipsis; overflow: hidden`, so the
 * computed-style and fit assertions fail. Once Story 5.2 removes those three
 * declarations, long headers wrap to fit and this spec goes green.
 */

import { expect, test } from 'playwright/test';
import type { Page } from 'playwright/test';
import { login } from './helpers/login.helper';
import { seedScrollOpenPositionsData } from './helpers/seed-scroll-open-positions-data.helper';

const HEADER_CELL_SEL = '.dms-header-cell[data-column]';

interface HeaderCellProbe {
  field: string;
  text: string;
  whiteSpace: string;
  textOverflow: string;
  overflow: string;
  verticalAlign: string;
  scrollHeight: number;
  clientHeight: number;
  scrollWidth: number;
  clientWidth: number;
}

/** Read the computed style + box metrics of every column-label header cell. */
async function probeHeaderCells(page: Page): Promise<HeaderCellProbe[]> {
  return page.evaluate(
    (sel) => {
      const cells = Array.from(
        document.querySelectorAll<HTMLElement>(sel),
      );
      return cells.map(function toProbe(cell) {
        const style = window.getComputedStyle(cell);
        return {
          field: cell.getAttribute('data-column') ?? '',
          text: (cell.textContent ?? '').trim(),
          whiteSpace: style.whiteSpace,
          textOverflow: style.textOverflow,
          overflow: style.overflow,
          verticalAlign: style.verticalAlign,
          scrollHeight: cell.scrollHeight,
          clientHeight: cell.clientHeight,
          scrollWidth: cell.scrollWidth,
          clientWidth: cell.clientWidth,
        };
      });
    },
    HEADER_CELL_SEL,
  );
}

/** Wait until at least one column-label header cell is present in the DOM. */
async function waitForHeaderCells(page: Page): Promise<void> {
  await expect(
    page.locator('dms-base-table').first(),
  ).toBeVisible({ timeout: 30000 });
  await page.waitForSelector(HEADER_CELL_SEL, { timeout: 30000 });
}

test.describe('Open Positions — column header wrap + top-align (Story 5.3)', () => {
  let cleanup: (() => Promise<void>) | undefined;
  let accountId = '';

  test.beforeAll(async () => {
    const seeder = await seedScrollOpenPositionsData();
    cleanup = seeder.cleanup;
    accountId = seeder.accountId;
  });

  test.afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  /** Assert every header cell shows its full text, top-aligned, no clipping. */
  async function assertHeadersWrapAndTopAlign(page: Page): Promise<void> {
    const cells = await probeHeaderCells(page);
    expect(
      cells.length,
      `no column-label header cells matched "${HEADER_CELL_SEL}"`,
    ).toBeGreaterThan(0);

    for (const cell of cells) {
      // (1) Header text must be allowed to wrap.
      expect(
        [cell.whiteSpace, cell.textOverflow],
        `[${cell.field}] still clips — white-space=${cell.whiteSpace}, ` +
          `text-overflow=${cell.textOverflow}`,
      ).not.toContain('nowrap');

      // (2) No ellipsis applied.
      expect(
        cell.textOverflow,
        `[${cell.field}] applies text-overflow: ellipsis`,
      ).not.toBe('ellipsis');

      // (3) Wrapped header content must align to the top of the cell. Header
      // cells render as real table cells (<th>/<td>), so computed vertical-align
      // is honoured — it resolves to "middle" before the fix and "top" after, a
      // genuine red→green signal.
      expect(
        cell.verticalAlign,
        `[${cell.field}] vertical-align=${cell.verticalAlign}; wrapped header ` +
          'text would not sit at the top of the cell',
      ).toBe('top');

      // (4) No vertical clipping: content height fits the box.
      expect(
        cell.scrollHeight,
        `[${cell.field}] vertically clipped — scrollHeight=${cell.scrollHeight} ` +
          `> clientHeight=${cell.clientHeight}`,
      ).toBeLessThanOrEqual(cell.clientHeight);

      // (5) Full text fits without horizontal overflow (long headers wrap to fit).
      expect(
        cell.scrollWidth,
        `[${cell.field}] overflows horizontally — scrollWidth=${cell.scrollWidth} ` +
          `> clientWidth=${cell.clientWidth}`,
      ).toBeLessThanOrEqual(cell.clientWidth + 1);

      // (6) The rendered text is the full header label. Control-only columns
      // (e.g. "actions") intentionally have no label, so skip them.
      if (cell.field !== 'actions') {
        expect(
          cell.text.length,
          `[${cell.field}] rendered empty`,
        ).toBeGreaterThan(0);
      }
    }
  }

  test('every column-label header cell shows its full header text, top-aligned (1280px desktop)', async ({
    page,
  }) => {
    await login(page);
    await page.goto(`/account/${accountId}/open`);
    await waitForHeaderCells(page);
    await assertHeadersWrapAndTopAlign(page);
  });

  test('headers wrap rather than clip and add no horizontal overflow at 768px tablet', async ({
    page,
  }) => {
    // AC #3 — repeat the assertions at a second (narrower) viewport size. Set it
    // before navigation so the table lays out at tablet width from first paint.
    await page.setViewportSize({ width: 768, height: 1024 });
    await login(page);
    await page.goto(`/account/${accountId}/open`);
    await waitForHeaderCells(page);
    await assertHeadersWrapAndTopAlign(page);
  });
});
