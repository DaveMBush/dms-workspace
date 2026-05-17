/**
 * scrolling-regression-105.spec.ts — Round 8 (Epic 105)
 * ──────────────────────────────────────────────────────
 *
 * WHAT THIS SPEC TESTS:
 *   Sticky-header artifacts that appear AFTER an in-place context-change
 *   (account swap or filter apply/clear) on CDK virtual-scrolled screens.
 *
 * DIFFERENCE FROM ROUND-7 SPEC (scrolling-regression-101.spec.ts):
 *   Round 7 covered only the freshly-loaded baseline. Each Round-7 test did a
 *   single slow-scroll immediately after page load.
 *
 *   Round-8 tests perform a TWO-PASS sequence:
 *     Pass 1:  slow-scroll on freshly-loaded screen → confirm clean baseline.
 *     Change:  account swap (in-place via currentAccountSignalStore / route-param
 *              change) or filter apply/clear.
 *     Pass 2:  slow-scroll again → assert same geometric invariants.
 *
 *   A FAIL cell is one where Pass 1 is clean AND Pass 2 shows an artifact.
 *   A cell that also fails on Pass 1 is a Round-7 regression — call it out and
 *   escalate before treating it as Round 8.
 *
 * ACCOUNT-CHANGE MECHANISM (account-panel screens):
 *   Navigating from /account/{id1}/open to /account/{id2}/open reuses
 *   AccountPanelComponent (same route config → same routeConfig reference →
 *   Angular Router default shouldReuseRoute returns true).
 *   AccountPanelComponent.ngOnInit subscribes to ActivatedRoute.params; when
 *   :accountId changes, it calls currentAccountSignalStore.setCurrentAccountId().
 *   This triggers the per-screen computed signal (selectOpenPositions$, etc.)
 *   to recompute with the new account's data. The CDK viewport stays in the DOM
 *   and receives the new dataset without being destroyed — an in-place data swap.
 *
 * FILTER-CHANGE MECHANISM:
 *   Typing in the symbol filter input or changing the risk-group select updates
 *   a local signal (symbolFilter$ / riskGroupFilter$). The filteredData$ computed
 *   signal recalculates, producing a shorter (or longer) array. CDK receives the
 *   new array without resetting its internal range state or scroll position.
 *
 * ALL TESTS are annotated test.fixme() — they encode hypothetical FAIL cells
 * based on code-analysis. Story 105.2 will:
 *   (a) remove test.fixme() and add test.fail() for cells confirmed to fail on the live app,
 *   (b) delete tests for cells confirmed clean on the live app.
 * Story 105.3 owns the persistent regression suite.
 *
 * WHY ROUND 8 EXISTS (Epic 101 did not cover context-change):
 *   Epic 101 (Story 101.2) removed contain:paint from .virtual-scroll-viewport
 *   in base-table.component.scss. That fix eliminated position:sticky breaking
 *   on freshly-loaded screens. It did NOT exercise an in-place data swap after
 *   page load — none of the Round-7 tests change the active account or apply a
 *   filter between scroll passes. The 4px/16ms slow-scroll pattern applied in
 *   Round 8 exposes whether CDK's internal state is coherent after the swap.
 */

import { expect, Locator, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedScrollDivDepositsWithSymbolsData } from './helpers/seed-scroll-div-deposits-with-symbols-data.helper';
import { seedScrollOpenPositionsData } from './helpers/seed-scroll-open-positions-data.helper';
import { seedScrollScreenerData } from './helpers/seed-scroll-screener-data.helper';
import { seedScrollSoldPositionsData } from './helpers/seed-scroll-sold-positions-data.helper';
import { seedScrollUniverseData } from './helpers/seed-scroll-universe-data.helper';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Row height as declared in base-table.component.scss
 * (--mat-table-row-item-container-height: 57px).
 */
export const ROW_HEIGHT_PX = 57;

const VIEWPORT_SELECTOR = 'cdk-virtual-scroll-viewport';
const HEADER_ROW_SELECTOR = 'tr.mat-mdc-header-row';
const ROW_SELECTOR = 'tr.mat-mdc-row';

/** Pixel tolerance for floating-point bounding-box comparisons. */
const PIXEL_TOLERANCE = 2;

/**
 * Total scroll distance — enough to exercise multiple CDK virtual windows
 * and expose sticky-header position instability after a context-change.
 */
const SLOW_SCROLL_TOTAL_PX = 400;

/**
 * Step size that triggers Round-7 layout drift and (hypothesis) Round-8 drift
 * after context-change. 4px keeps the sticky resolver behind the scroll stream.
 */
const SLOW_SCROLL_STEP_PX = 4;

/**
 * One browser animation frame (≈60fps). Yields to the layout engine between
 * each scroll step.
 */
const SLOW_SCROLL_FRAME_MS = 16;

// ─── Types ────────────────────────────────────────────────────────────────────

interface FrameSnapshot {
  /** CDK viewport scrollTop at this frame. */
  scrollTop: number;
  /** header getBoundingClientRect().top (screen Y) at this frame. */
  headerTop: number;
  /** cdk-virtual-scroll-viewport getBoundingClientRect().top (screen Y). */
  viewportTop: number;
}

interface SlowScrollOptions {
  totalPx?: number;
  stepPx?: number;
  frameDelayMs?: number;
}

// ─── Slow-Scroll Frame Capture ────────────────────────────────────────────────

/**
 * Same 4px/16ms pattern as scrolling-regression-101.spec.ts.
 * Reused verbatim so that Pass-1 baseline assertions are directly comparable
 * with Round-7 results.
 */
async function captureSlowScrollFrames(
  page: Page,
  viewportLocator: Locator,
  headerLocator: Locator,
  options: SlowScrollOptions = {}
): Promise<FrameSnapshot[]> {
  const {
    totalPx = SLOW_SCROLL_TOTAL_PX,
    stepPx = SLOW_SCROLL_STEP_PX,
    frameDelayMs = SLOW_SCROLL_FRAME_MS,
  } = options;
  const snapshots: FrameSnapshot[] = [];

  for (let y = stepPx; y <= totalPx; y += stepPx) {
    await viewportLocator.evaluate(function setScrollTop(
      el: Element,
      top: number
    ) {
      (el as HTMLElement).scrollTop = top;
    },
    y);
    await page.waitForTimeout(frameDelayMs);

    const [hb, vb, st] = await Promise.all([
      headerLocator.boundingBox(),
      viewportLocator.boundingBox(),
      viewportLocator.evaluate(function readScrollTop(el: Element): number {
        return (el as HTMLElement).scrollTop;
      }),
    ]);

    snapshots.push({
      scrollTop: st,
      headerTop: hb?.y ?? -9999,
      viewportTop: vb?.y ?? -9999,
    });
  }

  return snapshots;
}

// ─── Universe — account-change ────────────────────────────────────────────────

test.describe('Universe — account-change sticky-header regression (Story 105.1)', () => {
  let universeCleanup: () => Promise<void>;
  let openPositionsCleanup: () => Promise<void>;

  test.beforeAll(async () => {
    // Universe rows are required so the screen has scrollable content.
    const universeSeeder = await seedScrollUniverseData();
    universeCleanup = universeSeeder.cleanup;
    // One account with open positions gives the toolbar account-select a second
    // option (besides "All Accounts") so the swap actually changes the dataset.
    const openPositionsSeeder = await seedScrollOpenPositionsData();
    openPositionsCleanup = openPositionsSeeder.cleanup;
  });

  test.afterAll(async () => {
    if (universeCleanup) {
      await universeCleanup();
    }
    if (openPositionsCleanup) {
      await openPositionsCleanup();
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/universe');
    await expect(page.locator('dms-base-table')).toBeVisible({
      timeout: 15000,
    });
    await page.waitForSelector(ROW_SELECTOR, { timeout: 15000 });
  });

  test('Universe: sticky header does not drift down after account-change (header-scrolls-with-content)', async ({
    page,
  }) => {
    // Context-change: toolbar mat-select in .account-select form-field.
    // GlobalUniverseComponent.onAccountChange() sets selectedAccountId$ and
    // calls notifyFilterChange() → server returns filtered universe data for
    // the new account → universeService.universes() signal updates →
    // filteredData$ recomputes → CDK receives new array in-place.
    // [artifact not confirmed to reproduce in headless CI; deferred to Story 105.2 for live verification]
    test.fixme();

    const viewport = page.locator(VIEWPORT_SELECTOR);
    const header = page.locator(HEADER_ROW_SELECTOR).first();
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await expect(header).toBeVisible({ timeout: 5000 });

    // Pass 1: baseline (must be clean — Round-7 fix should hold)
    const baselineSnapshots = await captureSlowScrollFrames(
      page,
      viewport,
      header
    );
    const baselineDrift = baselineSnapshots.filter(function checkBaselineDrift(
      snap: FrameSnapshot
    ) {
      return snap.headerTop - snap.viewportTop > PIXEL_TOLERANCE;
    });
    expect(
      baselineDrift,
      `Universe account-change: Pass-1 baseline already has ${baselineDrift.length} drifting frame(s). ` +
        'This is a Round-7 regression (Epic 101), not Round 8 — escalate before continuing.'
    ).toHaveLength(0);

    // Reset scroll to top before context-change
    await viewport.evaluate(function resetScrollTop(el: Element) {
      (el as HTMLElement).scrollTop = 0;
    });

    // Context-change: click the account mat-select and choose the second option
    // (index 1; index 0 is "All Accounts").
    const accountSelect = page.locator('.account-select mat-select');
    await accountSelect.click();
    await page.locator('mat-option').nth(1).click();
    // Allow time for server notification round-trip and signal propagation
    await page.waitForTimeout(500);
    await expect(page.locator(ROW_SELECTOR)).toBeVisible({ timeout: 10000 });

    // Pass 2: slow-scroll AFTER account-change
    const snapshots = await captureSlowScrollFrames(page, viewport, header);
    const driftingDown = snapshots.filter(function isDriftingDown(
      snap: FrameSnapshot
    ) {
      return snap.headerTop - snap.viewportTop > PIXEL_TOLERANCE;
    });

    expect(
      driftingDown,
      `Universe account-change header-scrolls-with-content: ${driftingDown.length} frame(s) where ` +
        `header Y exceeded viewport Y by >${PIXEL_TOLERANCE}px after account-change. Fix in Story 105.2.`
    ).toHaveLength(0);
  });

  test('Universe: sticky header does not slide behind app bar after account-change (header-under-header)', async ({
    page,
  }) => {
    // [artifact not confirmed to reproduce in headless CI; deferred to Story 105.2 for live verification]
    test.fixme();

    const viewport = page.locator(VIEWPORT_SELECTOR);
    const header = page.locator(HEADER_ROW_SELECTOR).first();
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await expect(header).toBeVisible({ timeout: 5000 });

    await viewport.evaluate(function resetScrollTop(el: Element) {
      (el as HTMLElement).scrollTop = 0;
    });

    // Context-change
    const accountSelect = page.locator('.account-select mat-select');
    await accountSelect.click();
    await page.locator('mat-option').nth(1).click();
    await page.waitForTimeout(500);
    await expect(page.locator(ROW_SELECTOR)).toBeVisible({ timeout: 10000 });

    // Pass 2
    const snapshots = await captureSlowScrollFrames(page, viewport, header);
    const hiddenBehindBar = snapshots.filter(function isAboveViewport(
      snap: FrameSnapshot
    ) {
      return snap.viewportTop - snap.headerTop > PIXEL_TOLERANCE;
    });

    expect(
      hiddenBehindBar,
      `Universe account-change header-under-header: ${hiddenBehindBar.length} frame(s) where ` +
        `header Y was >${PIXEL_TOLERANCE}px above viewport Y (slid behind app bar) after account-change. Fix in Story 105.2.`
    ).toHaveLength(0);
  });
});

// ─── Universe — filter-change (symbol) ───────────────────────────────────────

test.describe('Universe — filter-change (symbol) sticky-header regression (Story 105.1)', () => {
  let cleanup: () => Promise<void>;
  let symbols: string[];

  test.beforeAll(async () => {
    const seeder = await seedScrollUniverseData();
    cleanup = seeder.cleanup;
    symbols = seeder.symbols;
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
    await page.waitForSelector(ROW_SELECTOR, { timeout: 15000 });
  });

  test.fixme(
    'Universe: sticky header does not drift down after symbol filter applied (header-scrolls-with-content) [filter-change not reproducible in test env — investigate manually or in story 105.2]',
    async ({ page }) => {
      // Context-change: type a 6-char symbol prefix in the column filter input.
      // filterUniverses() preserves placeholder rows but removes non-matching
      // data rows → shorter array → CDK recalculates total scroll height.

      const viewport = page.locator(VIEWPORT_SELECTOR);
      const header = page.locator(HEADER_ROW_SELECTOR).first();
      await expect(viewport).toBeVisible({ timeout: 10000 });
      await expect(header).toBeVisible({ timeout: 5000 });

      // Pass 1: baseline
      const baselineSnapshots = await captureSlowScrollFrames(
        page,
        viewport,
        header
      );
      const baselineDrift = baselineSnapshots.filter(
        function checkBaselineDrift(snap: FrameSnapshot) {
          return snap.headerTop - snap.viewportTop > PIXEL_TOLERANCE;
        }
      );
      expect(
        baselineDrift,
        `Universe filter-change: Pass-1 baseline already drifting in ${baselineDrift.length} frame(s). Round-7 regression — escalate.`
      ).toHaveLength(0);

      await viewport.evaluate(function resetScrollTop(el: Element) {
        (el as HTMLElement).scrollTop = 0;
      });

      // Context-change: type the first 6 chars of the seeded symbol prefix
      // (e.g. 'USCRL0'), which matches ~10 of the 60 rows. The universe server
      // notification is debounced; wait 600ms for it to apply.
      const symbolPrefix =
        symbols.length > 0 ? symbols[0].substring(0, 6) : 'USCRL0';
      const filterInput = page
        .locator(`${VIEWPORT_SELECTOR} thead input[placeholder]`)
        .first();
      await filterInput.click();
      await filterInput.fill(symbolPrefix);
      await page.waitForTimeout(600);

      // Pass 2: slow-scroll after filter applied
      const snapshots = await captureSlowScrollFrames(page, viewport, header);
      const driftingDown = snapshots.filter(function isDriftingDown(
        snap: FrameSnapshot
      ) {
        return snap.headerTop - snap.viewportTop > PIXEL_TOLERANCE;
      });

      expect(
        driftingDown,
        `Universe filter-change header-scrolls-with-content: ${driftingDown.length} frame(s) drifting after symbol filter applied. Fix in Story 105.2.`
      ).toHaveLength(0);
    }
  );

  test('Universe: sticky header does not slide behind app bar after symbol filter applied (header-under-header)', async ({
    page,
  }) => {
    test.fixme();
    // [filter-change not reproducible in test env — investigate manually or in story 105.2]

    const viewport = page.locator(VIEWPORT_SELECTOR);
    const header = page.locator(HEADER_ROW_SELECTOR).first();
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await expect(header).toBeVisible({ timeout: 5000 });

    await viewport.evaluate(function resetScrollTop(el: Element) {
      (el as HTMLElement).scrollTop = 0;
    });

    const symbolPrefix =
      symbols.length > 0 ? symbols[0].substring(0, 6) : 'USCRL0';
    const filterInput = page
      .locator(`${VIEWPORT_SELECTOR} thead input[placeholder]`)
      .first();
    await filterInput.click();
    await filterInput.fill(symbolPrefix);
    await page.waitForTimeout(600);

    const snapshots = await captureSlowScrollFrames(page, viewport, header);
    const hiddenBehindBar = snapshots.filter(function isAboveViewport(
      snap: FrameSnapshot
    ) {
      return snap.viewportTop - snap.headerTop > PIXEL_TOLERANCE;
    });

    expect(
      hiddenBehindBar,
      `Universe filter-change header-under-header: ${hiddenBehindBar.length} frame(s) hidden behind app bar after filter applied. Fix in Story 105.2.`
    ).toHaveLength(0);
  });
});

// ─── Open Positions — account-change ─────────────────────────────────────────

test.describe('Open Positions — account-change sticky-header regression (Story 105.1)', () => {
  let cleanup1: () => Promise<void>;
  let cleanup2: () => Promise<void>;
  let accountId1: string;
  let accountId2: string;

  test.beforeAll(async () => {
    // Two accounts required so the route-param change triggers a real data swap.
    const seeder1 = await seedScrollOpenPositionsData();
    cleanup1 = seeder1.cleanup;
    accountId1 = seeder1.accountId;
    const seeder2 = await seedScrollOpenPositionsData();
    cleanup2 = seeder2.cleanup;
    accountId2 = seeder2.accountId;
  });

  test.afterAll(async () => {
    if (cleanup1) {
      await cleanup1();
    }
    if (cleanup2) {
      await cleanup2();
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`/account/${accountId1}/open`);
    await expect(page.locator('dms-base-table')).toBeVisible({
      timeout: 15000,
    });
    await page.waitForSelector(ROW_SELECTOR, { timeout: 15000 });
  });

  test('Open Positions: sticky header does not drift down after account-change (header-scrolls-with-content)', async ({
    page,
  }) => {
    // Context-change: navigate to /account/{id2}/open.
    // AccountPanelComponent is reused (same routeConfig); ActivatedRoute.params
    // emits new :accountId → currentAccountSignalStore.setCurrentAccountId() →
    // openPositionsService.selectOpenPositions() recomputes → CDK data swaps.
    // [page.goto() causes a full-page reload, not an in-place SPA account-change;
    //  true in-place navigation test deferred to Story 105.2]
    test.fixme();

    const viewport = page.locator(VIEWPORT_SELECTOR);
    const header = page.locator(HEADER_ROW_SELECTOR).first();
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await expect(header).toBeVisible({ timeout: 5000 });

    // Pass 1: baseline
    const baselineSnapshots = await captureSlowScrollFrames(
      page,
      viewport,
      header
    );
    const baselineDrift = baselineSnapshots.filter(function checkBaselineDrift(
      snap: FrameSnapshot
    ) {
      return snap.headerTop - snap.viewportTop > PIXEL_TOLERANCE;
    });
    expect(
      baselineDrift,
      `Open Positions account-change: baseline drifting in ${baselineDrift.length} frame(s) — Round-7 regression.`
    ).toHaveLength(0);

    await viewport.evaluate(function resetScrollTop(el: Element) {
      (el as HTMLElement).scrollTop = 0;
    });

    // Context-change: navigate to second account's open positions
    await page.goto(`/account/${accountId2}/open`);
    await expect(page.locator(ROW_SELECTOR)).toBeVisible({ timeout: 15000 });

    // Pass 2
    const snapshots = await captureSlowScrollFrames(page, viewport, header);
    const driftingDown = snapshots.filter(function isDriftingDown(
      snap: FrameSnapshot
    ) {
      return snap.headerTop - snap.viewportTop > PIXEL_TOLERANCE;
    });

    expect(
      driftingDown,
      `Open Positions account-change header-scrolls-with-content: ${driftingDown.length} frame(s) drifting after account-change. Fix in Story 105.2.`
    ).toHaveLength(0);
  });

  test('Open Positions: sticky header does not slide behind app bar after account-change (header-under-header)', async ({
    page,
  }) => {
    // [page.goto() causes a full-page reload, not an in-place SPA account-change;
    //  true in-place navigation test deferred to Story 105.2]
    test.fixme();

    const viewport = page.locator(VIEWPORT_SELECTOR);
    const header = page.locator(HEADER_ROW_SELECTOR).first();
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await expect(header).toBeVisible({ timeout: 5000 });

    await viewport.evaluate(function resetScrollTop(el: Element) {
      (el as HTMLElement).scrollTop = 0;
    });

    await page.goto(`/account/${accountId2}/open`);
    await expect(page.locator(ROW_SELECTOR)).toBeVisible({ timeout: 15000 });

    const snapshots = await captureSlowScrollFrames(page, viewport, header);
    const hiddenBehindBar = snapshots.filter(function isAboveViewport(
      snap: FrameSnapshot
    ) {
      return snap.viewportTop - snap.headerTop > PIXEL_TOLERANCE;
    });

    expect(
      hiddenBehindBar,
      `Open Positions account-change header-under-header: ${hiddenBehindBar.length} frame(s) hidden behind app bar after account-change. Fix in Story 105.2.`
    ).toHaveLength(0);
  });
});

// ─── Open Positions — filter-change (symbol) ─────────────────────────────────

test.describe('Open Positions — filter-change (symbol) sticky-header regression (Story 105.1)', () => {
  let cleanup: () => Promise<void>;
  let accountId: string;

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

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`/account/${accountId}/open`);
    await expect(page.locator('dms-base-table')).toBeVisible({
      timeout: 15000,
    });
    await page.waitForSelector(ROW_SELECTOR, { timeout: 15000 });
  });

  test.fixme(
    'Open Positions: sticky header does not drift down after symbol filter applied (header-scrolls-with-content) [filter-change not reproducible in test env — investigate manually or in story 105.2]',
    async ({ page }) => {
      // Context-change: type prefix in [data-testid="symbol-search-input"].
      // The symbol filter is server-side (via searchText signal interceptor) so
      // there is a network round-trip before the data array changes.

      const viewport = page.locator(VIEWPORT_SELECTOR);
      const header = page.locator(HEADER_ROW_SELECTOR).first();
      await expect(viewport).toBeVisible({ timeout: 10000 });
      await expect(header).toBeVisible({ timeout: 5000 });

      const baselineSnapshots = await captureSlowScrollFrames(
        page,
        viewport,
        header
      );
      const baselineDrift = baselineSnapshots.filter(
        function checkBaselineDrift(snap: FrameSnapshot) {
          return snap.headerTop - snap.viewportTop > PIXEL_TOLERANCE;
        }
      );
      expect(
        baselineDrift,
        `Open Positions filter-change: baseline drifting in ${baselineDrift.length} frame(s) — Round-7 regression.`
      ).toHaveLength(0);

      await viewport.evaluate(function resetScrollTop(el: Element) {
        (el as HTMLElement).scrollTop = 0;
      });

      // Context-change: fill the symbol search input with the seeded account prefix
      // ('E2E-OP'). All 60 seeded symbols contain this prefix, so the filter matches
      // all rows — the point is to trigger a server round-trip + CDK data refresh.
      const filterInput = page.locator('[data-testid="symbol-search-input"]');
      await filterInput.click();
      await filterInput.fill('E2E-OP');
      await page.waitForTimeout(600);

      const snapshots = await captureSlowScrollFrames(page, viewport, header);
      const driftingDown = snapshots.filter(function isDriftingDown(
        snap: FrameSnapshot
      ) {
        return snap.headerTop - snap.viewportTop > PIXEL_TOLERANCE;
      });

      expect(
        driftingDown,
        `Open Positions filter-change header-scrolls-with-content: ${driftingDown.length} frame(s) drifting after filter applied. Fix in Story 105.2.`
      ).toHaveLength(0);
    }
  );

  test.fixme(
    'Open Positions: sticky header does not slide behind app bar after symbol filter applied (header-under-header) [filter-change not reproducible in test env — investigate manually or in story 105.2]',
    async ({ page }) => {
      const viewport = page.locator(VIEWPORT_SELECTOR);
      const header = page.locator(HEADER_ROW_SELECTOR).first();
      await expect(viewport).toBeVisible({ timeout: 10000 });
      await expect(header).toBeVisible({ timeout: 5000 });

      await viewport.evaluate(function resetScrollTop(el: Element) {
        (el as HTMLElement).scrollTop = 0;
      });

      const filterInput = page.locator('[data-testid="symbol-search-input"]');
      await filterInput.click();
      await filterInput.fill('E2E-OP');
      await page.waitForTimeout(600);

      const snapshots = await captureSlowScrollFrames(page, viewport, header);
      const hiddenBehindBar = snapshots.filter(function isAboveViewport(
        snap: FrameSnapshot
      ) {
        return snap.viewportTop - snap.headerTop > PIXEL_TOLERANCE;
      });

      expect(
        hiddenBehindBar,
        `Open Positions filter-change header-under-header: ${hiddenBehindBar.length} frame(s) hidden behind app bar after filter applied. Fix in Story 105.2.`
      ).toHaveLength(0);
    }
  );
});

// ─── Sold Positions — account-change ─────────────────────────────────────────

test.describe('Sold Positions — account-change sticky-header regression (Story 105.1)', () => {
  let cleanup1: () => Promise<void>;
  let cleanup2: () => Promise<void>;
  let accountId1: string;
  let accountId2: string;

  test.beforeAll(async () => {
    const seeder1 = await seedScrollSoldPositionsData();
    cleanup1 = seeder1.cleanup;
    accountId1 = seeder1.accountId;
    const seeder2 = await seedScrollSoldPositionsData();
    cleanup2 = seeder2.cleanup;
    accountId2 = seeder2.accountId;
  });

  test.afterAll(async () => {
    if (cleanup1) {
      await cleanup1();
    }
    if (cleanup2) {
      await cleanup2();
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`/account/${accountId1}/sold`);
    await expect(page.locator('dms-base-table')).toBeVisible({
      timeout: 15000,
    });
    await page.waitForSelector(ROW_SELECTOR, { timeout: 15000 });
  });

  test('Sold Positions: sticky header does not drift down after account-change (header-scrolls-with-content)', async ({
    page,
  }) => {
    // [page.goto() causes a full-page reload, not an in-place SPA account-change;
    //  true in-place navigation test deferred to Story 105.2]
    test.fixme();

    const viewport = page.locator(VIEWPORT_SELECTOR);
    const header = page.locator(HEADER_ROW_SELECTOR).first();
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await expect(header).toBeVisible({ timeout: 5000 });

    const baselineSnapshots = await captureSlowScrollFrames(
      page,
      viewport,
      header
    );
    const baselineDrift = baselineSnapshots.filter(function checkBaselineDrift(
      snap: FrameSnapshot
    ) {
      return snap.headerTop - snap.viewportTop > PIXEL_TOLERANCE;
    });
    expect(
      baselineDrift,
      `Sold Positions account-change: baseline drifting in ${baselineDrift.length} frame(s) — Round-7 regression.`
    ).toHaveLength(0);

    await viewport.evaluate(function resetScrollTop(el: Element) {
      (el as HTMLElement).scrollTop = 0;
    });

    await page.goto(`/account/${accountId2}/sold`);
    await expect(page.locator(ROW_SELECTOR)).toBeVisible({ timeout: 15000 });

    const snapshots = await captureSlowScrollFrames(page, viewport, header);
    const driftingDown = snapshots.filter(function isDriftingDown(
      snap: FrameSnapshot
    ) {
      return snap.headerTop - snap.viewportTop > PIXEL_TOLERANCE;
    });

    expect(
      driftingDown,
      `Sold Positions account-change header-scrolls-with-content: ${driftingDown.length} frame(s) drifting after account-change. Fix in Story 105.2.`
    ).toHaveLength(0);
  });

  test('Sold Positions: sticky header does not slide behind app bar after account-change (header-under-header)', async ({
    page,
  }) => {
    // [page.goto() causes a full-page reload, not an in-place SPA account-change;
    //  true in-place navigation test deferred to Story 105.2]
    test.fixme();

    const viewport = page.locator(VIEWPORT_SELECTOR);
    const header = page.locator(HEADER_ROW_SELECTOR).first();
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await expect(header).toBeVisible({ timeout: 5000 });

    await viewport.evaluate(function resetScrollTop(el: Element) {
      (el as HTMLElement).scrollTop = 0;
    });

    await page.goto(`/account/${accountId2}/sold`);
    await expect(page.locator(ROW_SELECTOR)).toBeVisible({ timeout: 15000 });

    const snapshots = await captureSlowScrollFrames(page, viewport, header);
    const hiddenBehindBar = snapshots.filter(function isAboveViewport(
      snap: FrameSnapshot
    ) {
      return snap.viewportTop - snap.headerTop > PIXEL_TOLERANCE;
    });

    expect(
      hiddenBehindBar,
      `Sold Positions account-change header-under-header: ${hiddenBehindBar.length} frame(s) hidden behind app bar after account-change. Fix in Story 105.2.`
    ).toHaveLength(0);
  });
});

// ─── Sold Positions — filter-change (symbol) ─────────────────────────────────

test.describe('Sold Positions — filter-change (symbol) sticky-header regression (Story 105.1)', () => {
  let cleanup: () => Promise<void>;
  let accountId: string;

  test.beforeAll(async () => {
    const seeder = await seedScrollSoldPositionsData();
    cleanup = seeder.cleanup;
    accountId = seeder.accountId;
  });

  test.afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`/account/${accountId}/sold`);
    await expect(page.locator('dms-base-table')).toBeVisible({
      timeout: 15000,
    });
    await page.waitForSelector(ROW_SELECTOR, { timeout: 15000 });
  });

  test.fixme(
    'Sold Positions: sticky header does not drift down after symbol filter applied (header-scrolls-with-content) [filter-change not reproducible in test env — investigate manually or in story 105.2]',
    async ({ page }) => {
      const viewport = page.locator(VIEWPORT_SELECTOR);
      const header = page.locator(HEADER_ROW_SELECTOR).first();
      await expect(viewport).toBeVisible({ timeout: 10000 });
      await expect(header).toBeVisible({ timeout: 5000 });

      const baselineSnapshots = await captureSlowScrollFrames(
        page,
        viewport,
        header
      );
      const baselineDrift = baselineSnapshots.filter(
        function checkBaselineDrift(snap: FrameSnapshot) {
          return snap.headerTop - snap.viewportTop > PIXEL_TOLERANCE;
        }
      );
      expect(
        baselineDrift,
        `Sold Positions filter-change: baseline drifting in ${baselineDrift.length} frame(s) — Round-7 regression.`
      ).toHaveLength(0);

      await viewport.evaluate(function resetScrollTop(el: Element) {
        (el as HTMLElement).scrollTop = 0;
      });

      // Context-change: symbol filter input (placeholder="Search Symbol")
      const filterInput = page.locator(
        `${VIEWPORT_SELECTOR} thead input[placeholder="Search Symbol"]`
      );
      await filterInput.click();
      await filterInput.fill('E2E-SD');
      await page.waitForTimeout(600);

      const snapshots = await captureSlowScrollFrames(page, viewport, header);
      const driftingDown = snapshots.filter(function isDriftingDown(
        snap: FrameSnapshot
      ) {
        return snap.headerTop - snap.viewportTop > PIXEL_TOLERANCE;
      });

      expect(
        driftingDown,
        `Sold Positions filter-change header-scrolls-with-content: ${driftingDown.length} frame(s) drifting after filter applied. Fix in Story 105.2.`
      ).toHaveLength(0);
    }
  );

  test.fixme(
    'Sold Positions: sticky header does not slide behind app bar after symbol filter applied (header-under-header) [filter-change not reproducible in test env — investigate manually or in story 105.2]',
    async ({ page }) => {
      const viewport = page.locator(VIEWPORT_SELECTOR);
      const header = page.locator(HEADER_ROW_SELECTOR).first();
      await expect(viewport).toBeVisible({ timeout: 10000 });
      await expect(header).toBeVisible({ timeout: 5000 });

      await viewport.evaluate(function resetScrollTop(el: Element) {
        (el as HTMLElement).scrollTop = 0;
      });

      const filterInput = page.locator(
        `${VIEWPORT_SELECTOR} thead input[placeholder="Search Symbol"]`
      );
      await filterInput.click();
      await filterInput.fill('E2E-SD');
      await page.waitForTimeout(600);

      const snapshots = await captureSlowScrollFrames(page, viewport, header);
      const hiddenBehindBar = snapshots.filter(function isAboveViewport(
        snap: FrameSnapshot
      ) {
        return snap.viewportTop - snap.headerTop > PIXEL_TOLERANCE;
      });

      expect(
        hiddenBehindBar,
        `Sold Positions filter-change header-under-header: ${hiddenBehindBar.length} frame(s) hidden behind app bar after filter applied. Fix in Story 105.2.`
      ).toHaveLength(0);
    }
  );
});

// ─── Dividend Deposits — account-change ──────────────────────────────────────

test.describe('Dividend Deposits — account-change sticky-header regression (Story 105.1)', () => {
  let cleanup1: () => Promise<void>;
  let cleanup2: () => Promise<void>;
  let accountId1: string;
  let accountId2: string;

  test.beforeAll(async () => {
    // Requires pre-existing universe rows (e.g. seeded by the Universe describe
    // above or present in the test DB). Both accounts reuse the same first-50
    // universe rows; their div-deposit records differ only by accountId.
    const seeder1 = await seedScrollDivDepositsWithSymbolsData();
    cleanup1 = seeder1.cleanup;
    accountId1 = seeder1.accountId;
    const seeder2 = await seedScrollDivDepositsWithSymbolsData();
    cleanup2 = seeder2.cleanup;
    accountId2 = seeder2.accountId;
  });

  test.afterAll(async () => {
    if (cleanup1) {
      await cleanup1();
    }
    if (cleanup2) {
      await cleanup2();
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`/account/${accountId1}/div-dep`);
    await expect(page.locator('dms-base-table')).toBeVisible({
      timeout: 15000,
    });
    await page.waitForSelector(ROW_SELECTOR, { timeout: 15000 });
  });

  test('Dividend Deposits: sticky header does not drift down after account-change (header-scrolls-with-content)', async ({
    page,
  }) => {
    // Dividend Deposits has no filter row (#filterRowTemplate is absent from the
    // template). Only account-change is exercised for this screen.
    // [page.goto() causes a full-page reload, not an in-place SPA account-change;
    //  true in-place navigation test deferred to Story 105.2]
    test.fixme();

    const viewport = page.locator(VIEWPORT_SELECTOR);
    const header = page.locator(HEADER_ROW_SELECTOR).first();
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await expect(header).toBeVisible({ timeout: 5000 });

    const baselineSnapshots = await captureSlowScrollFrames(
      page,
      viewport,
      header
    );
    const baselineDrift = baselineSnapshots.filter(function checkBaselineDrift(
      snap: FrameSnapshot
    ) {
      return snap.headerTop - snap.viewportTop > PIXEL_TOLERANCE;
    });
    expect(
      baselineDrift,
      `Dividend Deposits account-change: baseline drifting in ${baselineDrift.length} frame(s) — Round-7 regression.`
    ).toHaveLength(0);

    await viewport.evaluate(function resetScrollTop(el: Element) {
      (el as HTMLElement).scrollTop = 0;
    });

    await page.goto(`/account/${accountId2}/div-dep`);
    await expect(page.locator(ROW_SELECTOR)).toBeVisible({ timeout: 15000 });

    const snapshots = await captureSlowScrollFrames(page, viewport, header);
    const driftingDown = snapshots.filter(function isDriftingDown(
      snap: FrameSnapshot
    ) {
      return snap.headerTop - snap.viewportTop > PIXEL_TOLERANCE;
    });

    expect(
      driftingDown,
      `Dividend Deposits account-change header-scrolls-with-content: ${driftingDown.length} frame(s) drifting after account-change. Fix in Story 105.2.`
    ).toHaveLength(0);
  });

  test('Dividend Deposits: sticky header does not slide behind app bar after account-change (header-under-header)', async ({
    page,
  }) => {
    // [page.goto() causes a full-page reload, not an in-place SPA account-change;
    //  true in-place navigation test deferred to Story 105.2]
    test.fixme();

    const viewport = page.locator(VIEWPORT_SELECTOR);
    const header = page.locator(HEADER_ROW_SELECTOR).first();
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await expect(header).toBeVisible({ timeout: 5000 });

    await viewport.evaluate(function resetScrollTop(el: Element) {
      (el as HTMLElement).scrollTop = 0;
    });

    await page.goto(`/account/${accountId2}/div-dep`);
    await expect(page.locator(ROW_SELECTOR)).toBeVisible({ timeout: 15000 });

    const snapshots = await captureSlowScrollFrames(page, viewport, header);
    const hiddenBehindBar = snapshots.filter(function isAboveViewport(
      snap: FrameSnapshot
    ) {
      return snap.viewportTop - snap.headerTop > PIXEL_TOLERANCE;
    });

    expect(
      hiddenBehindBar,
      `Dividend Deposits account-change header-under-header: ${hiddenBehindBar.length} frame(s) hidden behind app bar after account-change. Fix in Story 105.2.`
    ).toHaveLength(0);
  });
});

// ─── Screener — filter-change (risk group) ───────────────────────────────────

test.describe('Screener — filter-change (risk group) sticky-header regression (Story 105.1)', () => {
  let cleanup: () => Promise<void>;

  test.beforeAll(async () => {
    const seeder = await seedScrollScreenerData();
    cleanup = seeder.cleanup;
  });

  test.afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/screener');
    await expect(page.locator('dms-base-table')).toBeVisible({
      timeout: 15000,
    });
    await page.waitForSelector(ROW_SELECTOR, { timeout: 15000 });
  });

  test('Screener: sticky header does not drift down after risk-group filter applied then cleared (header-scrolls-with-content)', async ({
    page,
  }) => {
    // Screener has no account-change trigger. Filter-change is via the
    // [data-testid="risk-group-filter"] mat-select in the filter row.
    // Seed creates 60 rows in the "Equities" risk group. Selecting "Income"
    // collapses data to 0; selecting "All" restores 60 rows. The CDK viewport
    // may have stale measurements from the collapsed state when data restores.
    // [artifact not confirmed to reproduce in headless CI; deferred to Story 105.2 for live verification]
    test.fixme();

    const viewport = page.locator(VIEWPORT_SELECTOR);
    const header = page.locator(HEADER_ROW_SELECTOR).first();
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await expect(header).toBeVisible({ timeout: 5000 });

    const baselineSnapshots = await captureSlowScrollFrames(
      page,
      viewport,
      header
    );
    const baselineDrift = baselineSnapshots.filter(function checkBaselineDrift(
      snap: FrameSnapshot
    ) {
      return snap.headerTop - snap.viewportTop > PIXEL_TOLERANCE;
    });
    expect(
      baselineDrift,
      `Screener filter-change: baseline drifting in ${baselineDrift.length} frame(s) — Round-7 regression.`
    ).toHaveLength(0);

    await viewport.evaluate(function resetScrollTop(el: Element) {
      (el as HTMLElement).scrollTop = 0;
    });

    // Context-change: apply "Income" filter (collapses data), then clear (restores)
    const riskGroupFilter = page.locator('[data-testid="risk-group-filter"]');
    await riskGroupFilter.click();
    await page
      .locator('mat-option')
      .filter({ hasText: 'Income' })
      .first()
      .click();
    await page.waitForTimeout(300);
    await riskGroupFilter.click();
    // "All" is the placeholder option — select it to clear the filter
    await page.locator('mat-option').filter({ hasText: 'All' }).first().click();
    await page.waitForTimeout(300);
    await expect(page.locator(ROW_SELECTOR)).toBeVisible({ timeout: 10000 });

    const snapshots = await captureSlowScrollFrames(page, viewport, header);
    const driftingDown = snapshots.filter(function isDriftingDown(
      snap: FrameSnapshot
    ) {
      return snap.headerTop - snap.viewportTop > PIXEL_TOLERANCE;
    });

    expect(
      driftingDown,
      `Screener filter-change header-scrolls-with-content: ${driftingDown.length} frame(s) drifting after filter cleared. Fix in Story 105.2.`
    ).toHaveLength(0);
  });

  test('Screener: sticky header does not slide behind app bar after risk-group filter applied then cleared (header-under-header)', async ({
    page,
  }) => {
    // [artifact not confirmed to reproduce in headless CI; deferred to Story 105.2 for live verification]
    test.fixme();

    const viewport = page.locator(VIEWPORT_SELECTOR);
    const header = page.locator(HEADER_ROW_SELECTOR).first();
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await expect(header).toBeVisible({ timeout: 5000 });

    await viewport.evaluate(function resetScrollTop(el: Element) {
      (el as HTMLElement).scrollTop = 0;
    });

    const riskGroupFilter = page.locator('[data-testid="risk-group-filter"]');
    await riskGroupFilter.click();
    await page
      .locator('mat-option')
      .filter({ hasText: 'Income' })
      .first()
      .click();
    await page.waitForTimeout(300);
    await riskGroupFilter.click();
    await page.locator('mat-option').filter({ hasText: 'All' }).first().click();
    await page.waitForTimeout(300);
    await expect(page.locator(ROW_SELECTOR)).toBeVisible({ timeout: 10000 });

    const snapshots = await captureSlowScrollFrames(page, viewport, header);
    const hiddenBehindBar = snapshots.filter(function isAboveViewport(
      snap: FrameSnapshot
    ) {
      return snap.viewportTop - snap.headerTop > PIXEL_TOLERANCE;
    });

    expect(
      hiddenBehindBar,
      `Screener filter-change header-under-header: ${hiddenBehindBar.length} frame(s) hidden behind app bar after filter cleared. Fix in Story 105.2.`
    ).toHaveLength(0);
  });
});
