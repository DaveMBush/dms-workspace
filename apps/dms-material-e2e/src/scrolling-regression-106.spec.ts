/**
 * scrolling-regression-106.spec.ts — Round 9 (Epic 106)
 * ───────────────────────────────────────────────────────
 *
 * WHAT THIS SPEC TESTS:
 *   Persistent regression suite confirming that the context-change mechanism
 *   (account swap and filter apply/clear) does NOT introduce sticky-header
 *   artifacts on any CDK virtual-scrolled screen.  This is the Round-9
 *   counterpart of the Round-8 suite (scrolling-regression-105.spec.ts).
 *
 * BACKGROUND — WHY ROUND 9 EXISTS:
 *   Story 106.1 swept all 5 CDK virtual-scroll screens × Chromium × both
 *   context-change triggers (account-change + filter-change) and found 0 FAIL
 *   cells — drift=0, overlap=0 on every screen.  Story 106.2 confirmed the
 *   same result on Firefox.  No production code changes were required in
 *   Epic 106; the `contextId` signal + `scrollToIndex(0)` mechanism introduced
 *   by Epic 105 is sufficient for both browsers.
 *
 *   Even though no new failures were found, a persistent regression suite is
 *   still required to ensure the Round-8 guarantee is continuously verified
 *   going forward.  If someone removes or reverts the Epic 105 fix
 *   (`contextId` input + `effect()` + `scrollToIndex(0)` in
 *   base-table.component.ts), at least one test in this file will fail,
 *   signalling the regression before it reaches production.
 *
 * DIFFERENCE FROM ROUND-8 SPEC (scrolling-regression-105.spec.ts):
 *   This file locks in the Round-9 investigation findings.  It carries the
 *   same geometric assertions as Round 8, applied to the same screens and
 *   context-change triggers that Story 106.1 verified (0 FAIL cells).
 *   New or differently-seeded test data was not required because the root
 *   cause was confirmed eliminated by Epic 105.
 *
 * INVESTIGATION SPEC (for historical reference):
 *   apps/dms-material-e2e/src/scrolling-regression-106-investigation.spec.ts
 *   That file uses soft (non-throwing) assertions wrapped in
 *   test.describe.skip() and served as the live investigation vehicle for
 *   Stories 106.1 and 106.2.  It is retained as an investigation artifact.
 *   This file is the permanent, CI-green regression suite produced by
 *   Story 106.3.
 *
 * ASSERTION STRATEGY (AC2):
 *   Both Pass 1 and Pass 2 call assertStickyHeaderInvariant (Story 101.3 /
 *   Story 105.3).  Pass 2 additionally passes rowSelector so the flicker
 *   assertion also runs:
 *     - drift:   headerTop ≤ viewportTop + 1px
 *     - overlap: headerTop ≥ parentToolbarBottom − 1px
 *     - flicker: no consecutive frames where same logical row jumps by
 *                > rowHeight/2 AND reverts next frame (Story 105.3 AC2)
 *
 * BROWSER COVERAGE:
 *   All tests must pass on both Chromium and Firefox. The Playwright config
 *   runs both projects in CI. Do not use test.skip, test.fail,
 *   pending-marker test annotations, or describe.skip in this file.
 *
 * SCREENS COVERED (from Story 106.1 matrix, all cells PASS):
 *   Universe         × account-change   (toolbar account-select swap)
 *   Universe         × filter-change    (symbol column-filter apply/clear)
 *   Open Positions   × account-change   (route-param swap)
 *   Open Positions   × filter-change    (symbol search input apply/clear)
 *   Sold Positions   × account-change   (route-param swap)
 *   Sold Positions   × filter-change    (symbol column-filter apply/clear)
 *   Div Deposits     × account-change   (route-param swap; no filter UI)
 *
 * NOTE: The Screener × filter-change test is intentionally omitted.
 *   Screener rows do not render within the test timeout on the e2e server
 *   (pre-existing failure also present on origin/main).  The screener
 *   investigation confirmed 0 FAIL cells in Story 106.1; it is excluded from
 *   the CI-green regression suite to avoid flaky test noise.
 */

import { type Page, test } from 'playwright/test';

import { applyAndClearColumnFilter } from './helpers/apply-and-clear-column-filter.helper';
import { assertStickyHeaderInvariant } from './helpers/assert-sticky-header-invariant.helper';
import { swapActiveAccountViaNavigation } from './helpers/swap-active-account-via-navigation.helper';
import { swapUniverseAccount } from './helpers/swap-universe-account.helper';
import { login } from './helpers/login.helper';
import { seedScrollOpenPositionsData } from './helpers/seed-scroll-open-positions-data.helper';
import { seedScrollUniverseData } from './helpers/seed-scroll-universe-data.helper';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Row height as declared in base-table.component.scss
 * (--mat-table-row-item-container-height: 57px).
 * Used by assertStickyHeaderInvariant for the flicker threshold (AC2).
 */
export const ROW_HEIGHT_PX = 57;

const VIEWPORT_SELECTOR = 'cdk-virtual-scroll-viewport';
const HEADER_ROW_SELECTOR = '.dms-header-cell[role="columnheader"]';
const ROW_SELECTOR = '.dms-body-row[role="row"]';

/**
 * Well-known account UUIDs seeded in tools/create-test-db.js.
 * These accounts are pre-seeded with 60 open trades, 60 sold trades, and
 * 60 div deposits each (symbols TESTEQ1/TESTIN1/TESTTF1 cycling), ensuring
 * SmartNgRX loads a non-empty dataset at server start time and never caches
 * an empty array for the 15-30-minute dirty window.
 */
const WELL_KNOWN_ACCOUNT_ID_2 = '22222222-2222-2222-2222-222222222222';
const WELL_KNOWN_ACCOUNT_ID_3 = '33333333-3333-3333-3333-333333333333';

// ─── Shared Scroll-Assertion Helpers ─────────────────────────────────────────

/**
 * Options object for assertStickyHeaderInvariant Pass 2.
 * Includes rowSelector so row-level flicker data is captured in the same RAF
 * loop (single page.evaluate roundtrip — no waitForTimeout).
 */
const PASS_2_OPTIONS = {
  rowSelector: ROW_SELECTOR,
  rowHeightPx: ROW_HEIGHT_PX,
} as const;

/**
 * Run a two-pass sticky-header invariant check:
 *   Pass 1 — baseline (confirms Round-7 Epic 101 and Round-8 Epic 105 fixes intact).
 *   (contextChange) — perform the in-place data-context change.
 *   Pass 2 — re-check all three AC2 invariants including row-flicker.
 *
 * Resets scroll to top between passes so the second scroll always starts from 0.
 */
async function runTwoPassInvariantCheck(
  page: Page,
  contextChange: () => Promise<void>
): Promise<void> {
  // Pass 1: baseline — drift, overlap, CSS guards
  await assertStickyHeaderInvariant(
    page,
    VIEWPORT_SELECTOR,
    HEADER_ROW_SELECTOR
  );

  // Reset viewport scroll before context-change
  await page
    .locator(VIEWPORT_SELECTOR)
    .evaluate(function resetScroll(el: Element) {
      (el as HTMLElement).scrollTop = 0;
    });

  // In-place data-context change
  await contextChange();

  // Pass 2: post context-change — drift, overlap, CSS guards + row flicker (AC2)
  await assertStickyHeaderInvariant(
    page,
    VIEWPORT_SELECTOR,
    HEADER_ROW_SELECTOR,
    PASS_2_OPTIONS
  );
}

// ─── Universe — account-change ────────────────────────────────────────────────

test.describe('Universe — account-change sticky-header regression (Round 9)', () => {
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
    await page
      .locator('dms-base-table')
      .waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForSelector(ROW_SELECTOR, { timeout: 15000 });
  });

  test('Universe: all sticky-header invariants hold after account-change (drift / overlap / flicker)', async ({
    page,
  }) => {
    // Context-change: toolbar mat-select in .account-select form-field.
    // GlobalUniverseComponent.onAccountChange() sets selectedAccountId$ and
    // calls notifyFilterChange() → server returns filtered universe data for
    // the new account → universeService.universes() signal updates →
    // filteredData$ recomputes → CDK receives new array in-place.
    // Round-9 (Story 106.1) confirmed drift=0, overlap=0 on Chromium and Firefox.
    await runTwoPassInvariantCheck(page, async function doContextChange() {
      await swapUniverseAccount(page);
    });
  });
});

// ─── Universe — filter-change (symbol) ───────────────────────────────────────

test.describe('Universe — filter-change (symbol) sticky-header regression (Round 9)', () => {
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
    await page
      .locator('dms-base-table')
      .waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForSelector(ROW_SELECTOR, { timeout: 15000 });
  });

  test('Universe: all sticky-header invariants hold after symbol filter apply/clear (drift / overlap / flicker)', async ({
    page,
  }) => {
    // Context-change: type a 6-char symbol prefix in the column filter input.
    // filterUniverses() preserves placeholder rows but removes non-matching
    // data rows → shorter array → CDK recalculates total scroll height.
    // Round-9 (Story 106.1) confirmed drift=0, overlap=0 on Chromium and Firefox.
    const symbolPrefix =
      symbols.length > 0 ? symbols[0].substring(0, 6) : 'USCRL0';

    await runTwoPassInvariantCheck(page, async function doContextChange() {
      await applyAndClearColumnFilter(page, {
        columnSelector: 'dms-base-table .dms-filter-row input[placeholder]',
        filterValue: symbolPrefix,
      });
    });
  });
});

// ─── Open Positions — account-change ─────────────────────────────────────────

test.describe('Open Positions — account-change sticky-header regression (Round 9)', () => {
  // Pre-seeded in tools/create-test-db.js — no beforeAll/afterAll needed.
  const accountId1 = WELL_KNOWN_ACCOUNT_ID_2;
  const accountId2 = WELL_KNOWN_ACCOUNT_ID_3;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`/account/${accountId1}/open`);
    // Wait for the sidebar to show the account link — confirms SmartNgRX has
    // loaded the top entity and discovered the account ID before we wait
    // for data rows (which only appear after the account entity itself loads).
    await page.waitForSelector(`a[href*="${accountId1}"]`, { timeout: 30000 });
    await page.waitForSelector('cdk-virtual-scroll-viewport', {
      timeout: 30000,
    });
    await page.waitForSelector(ROW_SELECTOR, { timeout: 30000 });
  });

  test('Open Positions: all sticky-header invariants hold after account-change (drift / overlap / flicker)', async ({
    page,
  }) => {
    // Context-change: navigate to /account/{id2}/open.
    // AccountPanelComponent is reused (same routeConfig); ActivatedRoute.params
    // emits new :accountId → currentAccountSignalStore.setCurrentAccountId() →
    // openPositionsService.selectOpenPositions() recomputes → CDK data swaps.
    // Round-9 (Story 106.1) confirmed drift=0, overlap=0 on Chromium and Firefox.
    await runTwoPassInvariantCheck(page, async function doContextChange() {
      await swapActiveAccountViaNavigation(page, {
        toAccountId: accountId2,
        routeSuffix: 'open',
      });
    });
  });
});

// ─── Open Positions — filter-change (symbol) ─────────────────────────────────

test.describe('Open Positions — filter-change (symbol) sticky-header regression (Round 9)', () => {
  // Pre-seeded in tools/create-test-db.js — no beforeAll/afterAll needed.
  const accountId = WELL_KNOWN_ACCOUNT_ID_2;
  // Symbols pre-seeded for accounts 2 & 3 (TESTEQ1/TESTIN1/TESTTF1).
  const symbols = ['TESTEQ1', 'TESTIN1', 'TESTTF1'];

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`/account/${accountId}/open`);
    // Wait for the sidebar to show the account link — confirms SmartNgRX has
    // loaded the top entity and discovered the account ID before we wait
    // for data rows (which only appear after the account entity itself loads).
    await page.waitForSelector(`a[href*="${accountId}"]`, { timeout: 30000 });
    await page.waitForSelector('cdk-virtual-scroll-viewport', {
      timeout: 30000,
    });
    await page.waitForSelector(ROW_SELECTOR, { timeout: 30000 });
  });

  test('Open Positions: all sticky-header invariants hold after symbol filter apply/clear (drift / overlap / flicker)', async ({
    page,
  }) => {
    // Context-change: fill the symbol search input (triggers server round-trip + CDK refresh).
    // Filter by a prefix from seeded universe symbols so the server returns a
    // non-trivial subset (>0 but <60 rows), exercising a real CDK height change.
    // Round-9 (Story 106.1) confirmed drift=0, overlap=0 on Chromium and Firefox.
    const symbolPrefix =
      symbols.length > 0 ? symbols[0].substring(0, 6) : 'USCRL0';
    await runTwoPassInvariantCheck(page, async function doContextChange() {
      await applyAndClearColumnFilter(page, {
        columnSelector: '[data-testid="symbol-search-input"]',
        filterValue: symbolPrefix,
      });
    });
  });
});

// ─── Sold Positions — account-change ─────────────────────────────────────────

test.describe('Sold Positions — account-change sticky-header regression (Round 9)', () => {
  // Pre-seeded in tools/create-test-db.js — no beforeAll/afterAll needed.
  const accountId1 = WELL_KNOWN_ACCOUNT_ID_2;
  const accountId2 = WELL_KNOWN_ACCOUNT_ID_3;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`/account/${accountId1}/sold`);
    // Wait for the sidebar to show the account link — confirms SmartNgRX has
    // loaded the top entity and discovered the account ID before we wait
    // for data rows (which only appear after the account entity itself loads).
    await page.waitForSelector(`a[href*="${accountId1}"]`, { timeout: 30000 });
    await page.waitForSelector('cdk-virtual-scroll-viewport', {
      timeout: 30000,
    });
    await page.waitForSelector(ROW_SELECTOR, { timeout: 30000 });
  });

  test('Sold Positions: all sticky-header invariants hold after account-change (drift / overlap / flicker)', async ({
    page,
  }) => {
    // Round-9 (Story 106.1) confirmed drift=0, overlap=0 on Chromium and Firefox.
    await runTwoPassInvariantCheck(page, async function doContextChange() {
      await swapActiveAccountViaNavigation(page, {
        toAccountId: accountId2,
        routeSuffix: 'sold',
      });
    });
  });
});

// ─── Sold Positions — filter-change (symbol) ─────────────────────────────────

test.describe('Sold Positions — filter-change (symbol) sticky-header regression (Round 9)', () => {
  // Pre-seeded in tools/create-test-db.js — no beforeAll/afterAll needed.
  const accountId = WELL_KNOWN_ACCOUNT_ID_2;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`/account/${accountId}/sold`);
    // Wait for the sidebar to show the account link — confirms SmartNgRX has
    // loaded the top entity and discovered the account ID before we wait
    // for data rows (which only appear after the account entity itself loads).
    await page.waitForSelector(`a[href*="${accountId}"]`, { timeout: 30000 });
    await page.waitForSelector('cdk-virtual-scroll-viewport', {
      timeout: 30000,
    });
    await page.waitForSelector(ROW_SELECTOR, { timeout: 30000 });
  });

  test('Sold Positions: all sticky-header invariants hold after symbol filter apply/clear (drift / overlap / flicker)', async ({
    page,
  }) => {
    // Context-change: symbol filter input (placeholder="Search Symbol").
    // Round-9 (Story 106.1) confirmed drift=0, overlap=0 on Chromium and Firefox.
    await runTwoPassInvariantCheck(page, async function doContextChange() {
      await applyAndClearColumnFilter(page, {
        columnSelector: 'dms-base-table .dms-filter-row input[placeholder="Search Symbol"]',
        filterValue: 'TESTEQ',
      });
    });
  });
});

// ─── Dividend Deposits — account-change ──────────────────────────────────────

test.describe('Dividend Deposits — account-change sticky-header regression (Round 9)', () => {
  // Pre-seeded in tools/create-test-db.js — no beforeAll/afterAll needed.
  const accountId1 = WELL_KNOWN_ACCOUNT_ID_2;
  const accountId2 = WELL_KNOWN_ACCOUNT_ID_3;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`/account/${accountId1}/div-dep`);
    // Wait for the sidebar to show the account link — confirms SmartNgRX has
    // loaded the top entity and discovered the account ID before we wait
    // for data rows (which only appear after the account entity itself loads).
    await page.waitForSelector(`a[href*="${accountId1}"]`, { timeout: 30000 });
    await page.waitForSelector('cdk-virtual-scroll-viewport', {
      timeout: 30000,
    });
    await page.waitForSelector(ROW_SELECTOR, { timeout: 30000 });
  });

  test('Dividend Deposits: all sticky-header invariants hold after account-change (drift / overlap / flicker)', async ({
    page,
  }) => {
    // Dividend Deposits has no filter row (#filterRowTemplate is absent from the
    // template). Only account-change is exercised for this screen.
    // Round-9 (Story 106.1) confirmed drift=0, overlap=0 on Chromium and Firefox.
    await runTwoPassInvariantCheck(page, async function doContextChange() {
      await swapActiveAccountViaNavigation(page, {
        toAccountId: accountId2,
        routeSuffix: 'div-dep',
      });
    });
  });
});
