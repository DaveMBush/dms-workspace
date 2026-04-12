/**
 * Story 65-1: Reproduce Unloaded Symbols on Deep Scroll — Failing E2E Test
 *
 * Root cause hypothesis (from investigation):
 *   `filteredData$` in `global-universe.component.ts` applies an
 *   `excludeLoadingRows` filter (`.filter(row => row.symbol !== '')`) that
 *   strips SmartNgRX placeholder rows from the CDK data source.  Although
 *   `buildEnrichedEntry` was updated in Story 60.2 to return a stable
 *   placeholder (instead of null) for `isLoading` rows, `filteredData$`
 *   continues to hide those placeholders from CDK.
 *
 *   Consequence for multi-page deep scroll:
 *     - Initial `/api/top` load returns `startIndex: 0, indexes: [first 50 IDs],
 *       length: 150` — SmartNgRX creates an `ArrayProxy` of length 150.
 *     - When `enrichUniverseWithRiskGroups` iterates all 150 proxy positions,
 *       positions 50-149 return placeholders with `symbol: ''`.
 *     - `filteredData$` strips them → CDK data source length ≤ 50.
 *     - CDK virtual-scroll viewport total height ≈ 50 × 52px = 2600px.
 *     - The user scrolling to the viewport bottom never causes `visibleRange`
 *       to exceed ~50; `triggerProxyLoad` therefore never dispatches
 *       `loadByIndexes` for pages 2–3.
 *     - Even if the main enrichment loop triggers a bulk `loadByIndexes`
 *       request for all positions, the signal re-emission after IDs arrive
 *       does not reliably force `filteredData$` to re-include those rows
 *       before the test assertion runs.
 *
 *   This is a distinct defect from Epic 60 / 64 (fast-scroll blank rows):
 *     - Epic 60/64 symptom: rows briefly go blank during fast scroll because
 *       the array temporarily shrinks, causing CDK to jump.
 *     - Epic 65 symptom: rows at the END of the list remain empty (symbol = '')
 *       after incremental scrolling across page boundaries — the data for
 *       pages 2+ is never fully loaded or the signal chain does not re-render.
 *
 * Test strategy:
 *   Seed 150 universe rows (≥ 3 lazy-load pages of 50), navigate to the
 *   Universe screen, scroll incrementally — pausing briefly at approximate
 *   page-boundary positions (rows ~50, ~100) — then assert all visible
 *   symbol cells are non-empty.
 *
 *   The test is expected to FAIL against the current codebase because empty
 *   symbol cells persist at the end of the sorted list after deep scroll.
 *   This is the red test that drives the fix in Story 65.2.
 */

import { expect, Locator, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedDeepScrollUniverseData } from './helpers/seed-deep-scroll-universe-data.helper';

const VIEWPORT_SELECTOR = 'cdk-virtual-scroll-viewport';
const ROW_SELECTOR = 'tr.mat-mdc-row';
// Symbol is the first data cell in the universe table
const SYMBOL_CELL_SELECTOR = 'tr.mat-mdc-row td:first-child';

// Row height for Global Universe after Story 29.1 fix (52px, no custom binding)
const ROW_HEIGHT_PX = 52;

/**
 * Assert that all currently visible symbol cells have non-empty text content.
 * Uses expect.poll to retry until all rows are populated or timeout expires.
 *
 * This assertion is expected to FAIL in Story 65.1 because rows at page 2/3
 * boundaries remain empty after deep scroll — the failing assertion confirms
 * the deep-scroll empty-symbol bug is active.
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

/**
 * Scroll the CDK virtual-scroll viewport to a specific pixel offset.
 * Returns the actual scrollTop achieved after the operation.
 */
async function scrollViewportTo(
  viewport: Locator,
  scrollTopPx: number
): Promise<number> {
  return viewport.evaluate(function setScrollTop(
    node: Element,
    top: number
  ): number {
    node.scrollTop = top;
    return node.scrollTop;
  },
  scrollTopPx);
}

// ─── Deep-Scroll Universe Tests ───────────────────────────────────────────────

test.describe('Universe Lazy-Load Deep Scroll — empty symbols after crossing page boundaries', () => {
  let cleanup: () => Promise<void>;

  test.beforeAll(async () => {
    const seeder = await seedDeepScrollUniverseData();
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

  test('should have no blank symbol cells after incremental deep scroll across three lazy-load page boundaries', async ({
    page,
  }) => {
    // Regression test for Epic 65: deep scroll across multiple lazy-load
    // page boundaries leaves symbol cells empty because `filteredData$`
    // strips placeholder rows from the CDK data source, preventing
    // `visibleRange` from ever reaching pages 2-3 and causing
    // `triggerProxyLoad` to never dispatch loadByIndexes for those pages.
    //
    // Expected behaviour (post-fix): all rows show populated symbol cells
    // after incremental scrolling through all 150 rows.
    //
    // Current behaviour (pre-fix): rows past the first lazy-load page
    // boundary (row 50+) remain empty — this test FAILS.
    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });

    // Step 1: Scroll to approximate page 1 / page 2 boundary (~row 50)
    // TOP_PAGE_SIZE = 50; rowHeight = 52px → boundary ≈ row 50 * 52px
    const page1Boundary = 50 * ROW_HEIGHT_PX;
    const topAfterPage1 = await scrollViewportTo(viewport, page1Boundary);
    // Pause at boundary to allow lazy loading to trigger for page 2
    await page
      .waitForLoadState('networkidle', { timeout: 5000 })
      .catch(function ignoreTimeout() {
        // networkidle may not fire if no requests are in-flight
      });

    // Step 2: Scroll to approximate page 2 / page 3 boundary (~row 100)
    const page2Boundary = 100 * ROW_HEIGHT_PX;
    const topAfterPage2 = await scrollViewportTo(viewport, page2Boundary);
    // Assert the viewport actually scrolled past page 1 — if the CDK height
    // is capped (Epic 65 bug), scrollTop will be clamped and this fails.
    expect(topAfterPage2).toBeGreaterThan(topAfterPage1 + 20 * ROW_HEIGHT_PX);
    // Pause at boundary to allow lazy loading to trigger for page 3
    await page
      .waitForLoadState('networkidle', { timeout: 5000 })
      .catch(function ignoreTimeout() {
        // networkidle may not fire if no requests are in-flight
      });

    // Step 3: Scroll to the bottom of the list (~row 150)
    const page3End = 150 * ROW_HEIGHT_PX;
    const topAfterPage3 = await scrollViewportTo(viewport, page3End);
    // Assert the viewport actually scrolled past page 2.
    expect(topAfterPage3).toBeGreaterThan(topAfterPage2);
    await page
      .waitForLoadState('networkidle', { timeout: 5000 })
      .catch(function ignoreTimeout() {
        // networkidle may not fire if no requests are in-flight
      });

    // Assert: all visible symbol cells must be non-empty.
    // FAILS in current codebase — rows past page 1 boundary show
    // empty symbol cells because filteredData$ strips all placeholder rows,
    // CDK never increases visibleRange past ~50, and pages 2-3 are never
    // requested via triggerProxyLoad.
    await assertVisibleSymbolsNonEmpty(
      page,
      'Visible rows have empty symbol cells after incremental deep scroll ' +
        'across three lazy-load page boundaries. ' +
        'Epic 65 defect: filteredData$ excludeLoadingRows filter strips placeholder rows ' +
        'from the CDK data source, preventing visibleRange from exceeding ~50 rows. ' +
        'triggerProxyLoad therefore never dispatches loadByIndexes for pages 2-3. ' +
        'Fix required: ensure CDK data source receives stable placeholder rows ' +
        'so visibleRange correctly tracks scroll position across all pages.'
    );
  });
});
