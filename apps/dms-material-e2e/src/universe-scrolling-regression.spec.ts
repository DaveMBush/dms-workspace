/**
 * Story 60-1: Universe Scrolling Regression — Blank Rows After Fast Scroll
 *
 * Root cause hypothesis (from investigation):
 *   In `enrich-universe-with-risk-groups.function.ts`, rows where
 *   `SmartNgRXRowBase.isLoading === true` are returned as `null` and filtered
 *   out of the data array passed to `<dms-base-table>`. When the user fast-scrolls
 *   into a new viewport region, SmartNgRX marks those rows as `isLoading=true`
 *   during the in-flight API call. The data array temporarily shrinks, so the
 *   CDK virtual-scroll viewport recalculates a shorter total scroll height and
 *   jumps back — producing blank rows at the current scroll position.
 *
 *   This is a regression from Story 56.2, which added the `isLoading` filter to
 *   prevent empty symbol cells from clustering at the top on initial sort.
 *   The prior fixes in Epics 29 (rowHeight mismatch), 31 (contain:strict header
 *   jump), and 44 (CSS transitions + CD cycles) did not cover this failure mode.
 *
 * Test strategy:
 *   Seed 60 universe rows (enough for virtual scroll to activate), navigate to
 *   the Universe screen, perform programmatic fast-scroll to the bottom, wait
 *   briefly for rendering, then assert that every visible data row has a
 *   non-empty symbol cell.
 *
 *   If the bug is active, some visible rows will have empty symbol text
 *   (placeholder rows surfaced by SmartNgRX isLoading → null filter mismatch)
 *   and the assertion will fail.
 */

import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedScrollUniverseData } from './helpers/seed-scroll-universe-data.helper';

const VIEWPORT_SELECTOR = 'cdk-virtual-scroll-viewport';
const ROW_SELECTOR = 'tr.mat-mdc-row';
// Symbol is the first data cell (column 1, after no selection column in universe)
const SYMBOL_CELL_SELECTOR = 'tr.mat-mdc-row td:first-child';

/**
 * Assert that all currently visible symbol cells have non-empty text content.
 * Uses expect.poll to retry the assertion until all rows are populated or the
 * timeout expires — no fixed sleeps required.
 *
 * Regression guard for Epics 29/31/44/60 (CDK virtual scroll blank rows).
 */
async function assertVisibleSymbolsNonEmpty(
  page: Page,
  failureMessage: string
): Promise<void> {
  // Wait for at least one row to be visible first
  await expect(page.locator(ROW_SELECTOR).first()).toBeVisible({
    timeout: 10000,
  });

  // Poll until no empty cells remain (auto-retries until timeout)
  await expect
    .poll(
      async function countEmptySymbols() {
        const symbolCells = page.locator(SYMBOL_CELL_SELECTOR);
        const count = await symbolCells.count();
        if (count === 0) {
          return -1; // no rows yet — keep polling
        }
        const emptyIndices: number[] = [];
        for (let i = 0; i < count; i++) {
          const text = await symbolCells.nth(i).textContent();
          if ((text ?? '').trim() === '') {
            emptyIndices.push(i);
          }
        }
        return emptyIndices.length;
      },
      { message: failureMessage, timeout: 10000 }
    )
    .toBe(0);
}

// ─── Universe Scrolling Regression Tests ─────────────────────────────────────

test.describe('Universe Scrolling Regression — blank rows on fast scroll', () => {
  let cleanup: () => Promise<void>;

  test.beforeAll(async () => {
    const seeder = await seedScrollUniverseData();
    cleanup = seeder.cleanup;
  });

  test.afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/universe');
    await expect(page.locator('dms-base-table')).toBeVisible({
      timeout: 15000,
    });
    // Wait for at least one data row to be rendered before scrolling
    await page.waitForSelector(ROW_SELECTOR, { timeout: 15000 });
  });

  test(
    'should have no blank symbol cells after fast scroll to bottom',
    async ({ page }) => {
      // Regression guard for Epics 29/31/44/60 (CDK virtual scroll blank rows).
      // Root cause Epic 60: enrichUniverseWithRiskGroups returns null for
      // isLoading rows, shrinking the data array mid-scroll and causing CDK
      // viewport height instability (blank rows at the current scroll position).
      const viewport = page.locator(VIEWPORT_SELECTOR);
      await expect(viewport).toBeVisible({ timeout: 10000 });

      // Fast-scroll to the bottom in one large jump to maximise the chance of
      // triggering the isLoading window (SmartNgRX lazy-load in-flight).
      await viewport.evaluate(function scrollToBottom(node: Element): void {
        node.scrollTop = node.scrollHeight;
      });

      await assertVisibleSymbolsNonEmpty(
        page,
        'Visible rows have empty symbol cells after fast scroll to bottom. ' +
          'This indicates the CDK virtual scroll blank-row regression from Epic 60 is active. ' +
          'See enrich-universe-with-risk-groups.function.ts isLoading filter.'
      );
    }
  );

  test(
    'should have no blank symbol cells after scroll from bottom back to top',
    async ({ page }) => {
      // Regression guard: scroll to bottom first, then back to top.
      // In the regression, re-entering rows that were evicted from the viewport
      // trigger another isLoading cycle → more empty rows at the top.
      const viewport = page.locator(VIEWPORT_SELECTOR);
      await expect(viewport).toBeVisible({ timeout: 10000 });

      // Go to bottom
      await viewport.evaluate(function scrollToBottom(node: Element): void {
        node.scrollTop = node.scrollHeight;
      });

      // Return to top
      await viewport.evaluate(function scrollToTop(node: Element): void {
        node.scrollTop = 0;
      });

      await assertVisibleSymbolsNonEmpty(
        page,
        'Visible rows have empty symbol cells after scrolling bottom→top. ' +
          'Epic 60 regression: isLoading filter in enrich-universe-with-risk-groups shrinks array on re-entry.'
      );
    }
  );
});
