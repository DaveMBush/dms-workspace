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

import { expect, Locator, Page, test } from 'playwright/test';

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

// ─── Scroll Helpers ──────────────────────────────────────────────────────────

/**
 * Scroll the CDK virtual-scroll viewport to the very bottom in one jump.
 * Used across multiple tests to trigger SmartNgRX lazy-load in-flight windows.
 */
async function scrollViewportToBottom(viewport: Locator): Promise<void> {
  await viewport.evaluate(function setScrollTop(node: Element): void {
    node.scrollTop = node.scrollHeight;
  });
}

/**
 * Scroll the CDK virtual-scroll viewport back to the top.
 */
async function scrollViewportToTop(viewport: Locator): Promise<void> {
  await viewport.evaluate(function setScrollTop(node: Element): void {
    node.scrollTop = 0;
  });
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

  test('should have no blank symbol cells after fast scroll to bottom', async ({
    page,
  }) => {
    // Regression guard for Epics 29/31/44/60 (CDK virtual scroll blank rows).
    // Root cause Epic 60: enrichUniverseWithRiskGroups returns null for
    // isLoading rows, shrinking the data array mid-scroll and causing CDK
    // viewport height instability (blank rows at the current scroll position).
    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });

    // Fast-scroll to the bottom in one large jump to maximise the chance of
    // triggering the isLoading window (SmartNgRX lazy-load in-flight).
    await scrollViewportToBottom(viewport);

    await assertVisibleSymbolsNonEmpty(
      page,
      'Visible rows have empty symbol cells after fast scroll to bottom. ' +
        'This indicates the CDK virtual scroll blank-row regression from Epic 60 is active. ' +
        'See enrich-universe-with-risk-groups.function.ts isLoading filter.'
    );
  });

  test('should have no blank symbol cells after scroll from bottom back to top', async ({
    page,
  }) => {
    // Regression guard: scroll to bottom first, then back to top.
    // In the regression, re-entering rows that were evicted from the viewport
    // trigger another isLoading cycle → more empty rows at the top.
    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });

    // Go to bottom
    await scrollViewportToBottom(viewport);

    // Return to top
    await scrollViewportToTop(viewport);

    await assertVisibleSymbolsNonEmpty(
      page,
      'Visible rows have empty symbol cells after scrolling bottom→top. ' +
        'Epic 60 regression: isLoading filter in enrich-universe-with-risk-groups shrinks array on re-entry.'
    );
  });

  test('should have no blank symbol cells after repeated scroll oscillation', async ({
    page,
  }) => {
    // Regression guard for Epics 29/31/44/60 — repeated oscillation maximises
    // the number of SmartNgRX lazy-load in-flight windows that overlap with
    // the viewport, stress-testing the placeholder-stability fix from Story 60-2.
    //
    // Failure mode (Epic 60): each direction-change triggers a new batch of
    // isLoading=true rows.  The old null-return shrank the data array on every
    // oscillation cycle, causing the CDK viewport to jump further with each pass
    // until the scroll position was completely wrong and blank rows filled the
    // visible area.
    //
    // The fix (Story 60-2): buildEnrichedEntry returns a placeholder (not null)
    // for isLoading rows, keeping the array length stable across all cycles.
    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });

    // Oscillate: bottom → top → bottom → top
    await scrollViewportToBottom(viewport);
    await scrollViewportToTop(viewport);
    await scrollViewportToBottom(viewport);
    await scrollViewportToTop(viewport);

    await assertVisibleSymbolsNonEmpty(
      page,
      'Visible rows have empty symbol cells after repeated scroll oscillation. ' +
        'Epic 60 regression: repeated isLoading cycles destabilise CDK viewport height.'
    );
  });

  test('should have no blank symbol cells after sort change then fast scroll', async ({
    page,
  }) => {
    // Regression guard for Epics 29/31/44/60 — sort change triggers a new
    // server-side request; while the response is in-flight SmartNgRX marks all
    // rows as isLoading=true.  Under the old code this shrank the data array to
    // zero and the CDK viewport collapsed, producing a completely blank table.
    //
    // The fix (Story 60-2) keeps array length stable by returning placeholders
    // for isLoading rows, so the viewport height does not change during the
    // round-trip and a subsequent fast scroll finds fully-populated rows.
    //
    // Sort column interaction pattern (from server-side-sorting.spec.ts):
    //   page.getByRole('button', { name: 'Symbol' }) → click to apply sort.
    const symbolHeader = page.getByRole('button', { name: 'Symbol' });
    await symbolHeader.click();

    // Wait for the sort network round-trip to complete before scrolling.
    // A short debounce followed by networkidle is more reliable than
    // waitForSelector (rows persist from beforeEach and pass immediately).
    await page.waitForTimeout(100);
    await page.waitForLoadState('networkidle');

    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });

    // Fast-scroll to the bottom to enter the new sorted data range.
    await scrollViewportToBottom(viewport);

    await assertVisibleSymbolsNonEmpty(
      page,
      'Visible rows have empty symbol cells after sort change + fast scroll. ' +
        'Epic 60 regression: sort triggers mass isLoading state, old null-return collapses array.'
    );
  });

  test('should have no blank symbol cells after symbol filter change then fast scroll', async ({
    page,
  }) => {
    // Regression guard for Epics 29/31/44/60 — applying a symbol filter
    // triggers a new API request.  While the response is in-flight, SmartNgRX
    // marks the pending rows as isLoading=true.  Under the old code the null-
    // return shrank the data array during this window, collapsing the CDK scroll
    // height and producing blank rows.
    //
    // The fix (Story 60-2) preserves the array length with placeholders so the
    // viewport height is stable throughout the filter round-trip.
    //
    // All 60 seeded symbols share the prefix 'USCRL', so filtering by that
    // prefix keeps all seeded rows visible while still triggering a fresh
    // server-side query and the resulting isLoading cycle.
    const symbolInput = page.locator('input[placeholder="Search Symbol"]');
    await expect(symbolInput).toBeVisible({ timeout: 10000 });
    await symbolInput.fill('USCRL');

    // Wait for the filter network round-trip to complete before scrolling.
    await page.waitForTimeout(100);
    await page.waitForLoadState('networkidle');

    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });

    // Fast-scroll to the bottom while the filter response may still be loading.
    await scrollViewportToBottom(viewport);

    await assertVisibleSymbolsNonEmpty(
      page,
      'Visible rows have empty symbol cells after symbol filter change + fast scroll. ' +
        'Epic 60 regression: filter triggers mass isLoading state, old null-return collapses array.'
    );
  });
});
