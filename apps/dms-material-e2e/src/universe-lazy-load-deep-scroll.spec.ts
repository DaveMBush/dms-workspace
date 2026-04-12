/**
 * Story 65-1 / 65-3: Universe Lazy-Load Deep Scroll — Regression Prevention Suite
 *
 * ── Root cause (Epic 65) ──────────────────────────────────────────────────────
 * `filteredData$` in `global-universe.component.ts` applied an
 * `excludeLoadingRows` filter (`.filter(row => row.symbol !== '')`) that
 * stripped SmartNgRX placeholder rows from the CDK data source.  Although
 * `buildEnrichedEntry` was updated in Story 60.2 to return a stable placeholder
 * (instead of null) for `isLoading` rows, `filteredData$` continued to hide
 * those placeholders from CDK.
 *
 * Consequence for multi-page deep scroll:
 *   - Initial `/api/top` load returns `startIndex: 0, indexes: [first 50 IDs],
 *     length: 150` — SmartNgRX creates an `ArrayProxy` of length 150.
 *   - When `enrichUniverseWithRiskGroups` iterates all 150 proxy positions,
 *     positions 50-149 return placeholders with `symbol: ''`.
 *   - `filteredData$` strips them → CDK data source length ≤ 50.
 *   - CDK virtual-scroll viewport total height ≈ 50 × 52px = 2600px.
 *   - The user scrolling to the viewport bottom never causes `visibleRange`
 *     to exceed ~50; `triggerProxyLoad` therefore never dispatches
 *     `loadByIndexes` for pages 2–3.
 *   - Even if the main enrichment loop triggers a bulk `loadByIndexes`
 *     request for all positions, the signal re-emission after IDs arrive
 *     does not reliably force `filteredData$` to re-include those rows
 *     before the test assertion runs.
 *
 * This is a distinct defect from Epic 60 / 64 (fast-scroll blank rows):
 *   - Epic 60/64 symptom: rows briefly go blank during fast scroll because
 *     the array temporarily shrinks, causing CDK to jump.
 *   - Epic 65 symptom: rows at the END of the list remain empty (symbol = '')
 *     after incremental scrolling across page boundaries — the data for
 *     pages 2+ is never fully loaded or the signal chain does not re-render.
 *
 * ── Story 65.2 fix ────────────────────────────────────────────────────────────
 * Added `if (row.symbol === '') { return true; }` guard in `filterUniverses()`
 * (apps/dms-material/src/app/global/universe/filter-universes.function.ts) so
 * SmartNgRX placeholder rows (symbol = '') are never stripped by the filter
 * pipeline.  All other filters (risk group, text search, expired, etc.) continue
 * to apply normally to fully-loaded rows.
 *
 * ── Structural tension this fix navigates ────────────────────────────────────
 * Epics 55/56 required placeholder rows to be HIDDEN from the CDK data source
 * (using the `excludeLoadingRows` filter) to prevent empty-symbol cells from
 * clustering at the top on symbol-ascending sort.
 *
 * Epics 29/31/44/60/65 required the CDK data source to have STABLE length so
 * the virtual-scroll viewport preserves total height across lazy-load events.
 *
 * The 65.2 guard resolves this tension by keeping placeholder rows in the CDK
 * array (satisfying 29/31/44/60/65) while relying on CDK virtual-scroll to
 * render only the rows in the current `visibleRange` — the placeholder rows are
 * present but scroll off screen immediately once their data loads (satisfying
 * the 55/56 concern that empty rows must not be persistently visible).
 *
 * ── Lazy-load page boundaries ─────────────────────────────────────────────────
 * `TOP_PAGE_SIZE = 50` rows per lazy-load page.  A 150-row seeded data set
 * (prefix `UDSCRL`) spans exactly 3 pages:
 *   - Page 1: rows 0–49
 *   - Page 2: rows 50–99
 *   - Page 3: rows 100–149
 *
 * Row height after Story 29.1 fix = 52px.  Approximate scroll offsets:
 *   - Page 1/2 boundary ≈  50 × 52px = 2600px
 *   - Page 2/3 boundary ≈ 100 × 52px = 5200px
 *   - Bottom            ≈ 150 × 52px = 7800px
 *
 * ── excludeLoadingRows filter history ────────────────────────────────────────
 * - Story 56.2: introduced `excludeLoadingRows` to suppress empty-symbol rows
 *   from symbol-sort clustering.
 * - Story 60.2: `buildEnrichedEntry` returns stable placeholder (not null) but
 *   `filteredData$` still stripped symbol=''.
 * - Story 65.2: `filterUniverses()` guard allows symbol='' rows through CDK.
 *
 * ── Epic regression coverage map ─────────────────────────────────────────────
 * | Epic | Defect                                       | Guard spec file               |
 * |------|----------------------------------------------|-------------------------------|
 * | 29   | rowHeight mismatch → CDK viewport jump       | universe-scrolling-regression |
 * | 31   | contain:strict → sticky header reset         | universe-scrolling-regression |
 * | 44   | CSS will-change: transform thrashing         | universe-scrolling-regression |
 * | 55   | Duplicate symbol rows after sort             | universe-duplicate-symbols    |
 * | 56   | Empty symbol cells at top on symbol-asc sort | universe-symbol-sort-empty-rows|
 * | 60   | isLoading→null array shrink → viewport jump  | universe-scrolling-regression |
 * | 64   | Round 5 recurrence of Epic 60 pattern        | universe-scrolling-regression |
 * | 65   | Multi-page lazy-load deep scroll empty cells | THIS FILE                     |
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
 * Timeout is set to 20 s for deep-scroll scenarios where up to three network
 * round-trips (page 1 → page 2 → page 3 ID fetch, then entity fetch) must
 * all complete before the assertion can pass.
 *
 * Story 65.2 regression guard: if the filterUniverses() placeholder guard
 * (symbol === '' pass-through) is removed, CDK height is capped at ~50 rows
 * and rows past the page 1 boundary will show empty symbol cells.
 */
async function assertVisibleSymbolsNonEmpty(
  page: Page,
  failureMessage: string
): Promise<void> {
  // Wait for at least one row to be visible first
  await expect(page.locator(ROW_SELECTOR).first()).toBeVisible({
    timeout: 10000,
  });

  // Poll until no empty cells remain (auto-retries until timeout).
  // 20 s covers 3 lazy-load page fetches (ID + entity) that may be in-flight.
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
      { message: failureMessage, timeout: 20000 }
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

/**
 * Scroll the CDK virtual-scroll viewport to the very bottom in one jump.
 * Mirrors the Epic 60/64 fast-scroll pattern; used here against 150-row
 * deep-scroll data spanning 3 lazy-load pages.
 */
async function scrollViewportToBottom(viewport: Locator): Promise<void> {
  await viewport.evaluate(function setScrollToBottom(node: Element): void {
    node.scrollTop = node.scrollHeight;
  });
}

/**
 * Scroll the CDK virtual-scroll viewport back to the very top.
 */
async function scrollViewportToTop(viewport: Locator): Promise<void> {
  await viewport.evaluate(function setScrollToTop(node: Element): void {
    node.scrollTop = 0;
  });
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
    // stripped placeholder rows from the CDK data source, preventing
    // `visibleRange` from ever reaching pages 2-3 and causing
    // `triggerProxyLoad` to never dispatch loadByIndexes for those pages.
    //
    // Story 65.2 fix applied in filterUniverses():
    //   `if (row.symbol === '') { return true; }` — ensures CDK receives
    //   all 150 rows (including symbol='' placeholders) so total scroll
    //   height is correct and triggerProxyLoad can dispatch loadByIndexes
    //   for pages 2 and 3.
    //
    // TOP_PAGE_SIZE = 50; ROW_HEIGHT_PX = 52.
    // Page boundaries: ~2600px (p1/p2), ~5200px (p2/p3), ~7800px (bottom).
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
        'Story 65.2 regression: filterUniverses() placeholder guard may have been removed, ' +
        'causing CDK data source to cap at ~50 rows and preventing pages 2-3 from loading.'
    );
  });

  // ── Test 2: Fast scroll to bottom ──────────────────────────────────────────

  test('should have no blank symbol cells after fast scroll to bottom', async ({
    page,
  }) => {
    // Regression guard for Story 65.2 fix: fast-scroll to bottom (one jump).
    //
    // This pattern mirrors the Epic 60/64 guard (universe-scrolling-regression.spec.ts)
    // but against 150 seeded rows spanning 3 lazy-load pages.
    //
    // Without the Story 65.2 fix, CDK viewport total height is capped at
    // ~2600px (50 rows × 52px) because filterUniverses() strips symbol=''
    // placeholder rows. Scrolling to `scrollHeight` lands at row ~50 rather
    // than row ~150, so pages 2-3 are never requested and bottom rows remain
    // empty.
    //
    // With the fix, CDK receives all 150 rows, viewport height is ~7800px,
    // and fast scroll to bottom triggers loadByIndexes for pages 2 and 3.
    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });

    // Fast scroll to bottom in one jump (scrollHeight)
    await scrollViewportToBottom(viewport);

    await page
      .waitForLoadState('networkidle', { timeout: 10000 })
      .catch(function ignoreTimeout() {
        // networkidle may not fire if no requests are in-flight
      });

    await assertVisibleSymbolsNonEmpty(
      page,
      'Visible rows have empty symbol cells after fast scroll to bottom. ' +
        'Story 65.2 regression: filterUniverses() placeholder guard may be missing, ' +
        'capping CDK viewport at 50 rows and leaving pages 2-3 unreachable.'
    );
  });

  // ── Test 3: Sort change then deep scroll ───────────────────────────────────

  test('should have no blank symbol cells after sort change followed by incremental deep scroll', async ({
    page,
  }) => {
    // Regression guard for Story 65.2 fix: sort change triggers a full data
    // reload from the server, then incremental deep scroll verifies that
    // placeholder rows from the new sorted result set still pass through
    // filterUniverses() to CDK so all 3 pages can load.
    //
    // Sorting by 'Yield %' causes SmartNgRX to issue new /api/top calls with
    // the new sort order. Placeholder rows (symbol='') appear while the new
    // data loads. Without the 65.2 guard, filterUniverses() strips them and
    // CDK height collapses to ~50 rows again — identical to the initial load bug.
    //
    // Pattern from universe-scrolling-regression.spec.ts:
    //   click Yield % header → waitForLoadState('networkidle') → scroll incrementally.
    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });

    // Click 'Yield %' column header to trigger sort change and data reload
    // Use exact:true to avoid matching 'Avg Purch Yield %' which also contains 'Yield %'
    const yieldHeader = page.getByRole('button', {
      name: 'Yield %',
      exact: true,
    });
    await yieldHeader.click();
    await page.waitForTimeout(100);
    await page
      .waitForLoadState('networkidle', { timeout: 10000 })
      .catch(function ignoreTimeout() {
        // networkidle may not fire between synchronous sort reactions
      });

    // Scroll incrementally through all 3 pages after sort change
    await scrollViewportTo(viewport, 50 * ROW_HEIGHT_PX);
    await page
      .waitForLoadState('networkidle', { timeout: 5000 })
      .catch(function ignoreTimeout() {});

    await scrollViewportTo(viewport, 100 * ROW_HEIGHT_PX);
    await page
      .waitForLoadState('networkidle', { timeout: 5000 })
      .catch(function ignoreTimeout() {});

    await scrollViewportTo(viewport, 150 * ROW_HEIGHT_PX);
    await page
      .waitForLoadState('networkidle', { timeout: 5000 })
      .catch(function ignoreTimeout() {});

    await assertVisibleSymbolsNonEmpty(
      page,
      'Visible rows have empty symbol cells after sort change + deep scroll. ' +
        'Story 65.2 regression: after sort-triggered reload, filterUniverses() ' +
        'may be stripping placeholder rows from CDK, capping visibleRange at 50 rows.'
    );
  });

  // ── Test 4: Repeated incremental deep scroll (down → up → down) ───────────

  test('should have no blank symbol cells after repeated scroll: page1→page2→page3→top→bottom', async ({
    page,
  }) => {
    // Regression guard for Story 65.2 fix: bidirectional scroll validates
    // that lazy-load data for pages 2-3 loaded on the way down is still
    // correctly rendered when the user scrolls away and returns.
    //
    // Structural tension this test exercises:
    //   - Epics 55/56 guard: placeholder rows must not cluster at top on
    //     symbol-ascending sort (old excludeLoadingRows was the guard).
    //   - Epics 29/31/44/60/65 guard: CDK data source length must be stable
    //     across lazy-load events so viewport height does not collapse.
    //
    // The 65.2 fix (symbol='' rows pass through filterUniverses) means both
    // concerns are satisfied: placeholder rows stay in CDK array maintaining
    // height stability, while CDK virtual-scroll only renders rows in the
    // current visibleRange (so unseen placeholders do not appear on screen).
    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });

    // Page 1 → Page 2 → Page 3
    await scrollViewportTo(viewport, 50 * ROW_HEIGHT_PX);
    await page
      .waitForLoadState('networkidle', { timeout: 5000 })
      .catch(function ignoreTimeout() {});

    await scrollViewportTo(viewport, 100 * ROW_HEIGHT_PX);
    await page
      .waitForLoadState('networkidle', { timeout: 5000 })
      .catch(function ignoreTimeout() {});

    await scrollViewportTo(viewport, 150 * ROW_HEIGHT_PX);
    await page
      .waitForLoadState('networkidle', { timeout: 5000 })
      .catch(function ignoreTimeout() {});

    // Back to top
    await scrollViewportToTop(viewport);
    await page
      .waitForLoadState('networkidle', { timeout: 5000 })
      .catch(function ignoreTimeout() {});

    // Back to bottom (fast scroll)
    await scrollViewportToBottom(viewport);
    await page
      .waitForLoadState('networkidle', { timeout: 10000 })
      .catch(function ignoreTimeout() {});

    await assertVisibleSymbolsNonEmpty(
      page,
      'Visible rows have empty symbol cells after bidirectional deep scroll. ' +
        'Story 65.2 regression: scroll page1→page2→page3→top→bottom must keep ' +
        'all rows populated. filterUniverses() placeholder guard may be missing.'
    );
  });

  // ── Test 5: Filter then deep scroll ──────────────────────────────────────

  test('should have no blank symbol cells after applying symbol filter and scrolling to bottom', async ({
    page,
  }) => {
    // Regression guard for Story 65.2 fix: symbol text filter reduces the
    // visible set but must still include placeholder rows (symbol='') so CDK
    // height remains stable during lazy load.
    //
    // All 150 seeded rows share prefix 'UDSCRL'
    // (see seed-deep-scroll-universe-data.helper.ts).  Entering 'UDSCRL' in
    // the symbol search input matches all 150 rows and exercises the
    // interaction between the symbol-text filter and the 65.2 placeholder guard.
    //
    // Without the 65.2 fix, the symbol-text filter and the old
    // excludeLoadingRows filter both strip symbol='' rows — CDK caps at 0
    // visible rows that match the filter prefix, making the bug even more
    // severe after filtering.
    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });

    // Apply symbol filter matching all 150 seeded rows (prefix 'UDSCRL')
    const symbolInput = page.locator('input[placeholder="Search Symbol"]');
    await expect(symbolInput).toBeVisible({ timeout: 10000 });
    await symbolInput.fill('UDSCRL');
    await page.waitForTimeout(100);
    await page
      .waitForLoadState('networkidle', { timeout: 10000 })
      .catch(function ignoreTimeout() {});

    // Scroll incrementally through all 3 pages
    await scrollViewportTo(viewport, 50 * ROW_HEIGHT_PX);
    await page
      .waitForLoadState('networkidle', { timeout: 5000 })
      .catch(function ignoreTimeout() {});

    await scrollViewportTo(viewport, 100 * ROW_HEIGHT_PX);
    await page
      .waitForLoadState('networkidle', { timeout: 5000 })
      .catch(function ignoreTimeout() {});

    await scrollViewportToBottom(viewport);
    await page
      .waitForLoadState('networkidle', { timeout: 10000 })
      .catch(function ignoreTimeout() {});

    await assertVisibleSymbolsNonEmpty(
      page,
      'Visible rows have empty symbol cells after UDSCRL filter + scroll to bottom. ' +
        "Story 65.2 regression: filterUniverses() placeholder guard must allow symbol='' " +
        'rows through even when symbol text filter is active. All 150 seeded rows (prefix ' +
        'UDSCRL) should be visible and fully loaded after deep scroll.'
    );
  });
});
