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
 * Round-8 tests were validated against the live app in Story 105.2. This file is the
 * persistent regression suite maintained by Epic 105. All tests must remain green in CI.
 *
 * WHY ROUND 8 EXISTS (Epic 101 did not cover context-change):
 *   Epic 101 (Story 101.2) removed contain:paint from .virtual-scroll-viewport
 *   in base-table.component.scss. That fix eliminated position:sticky breaking
 *   on freshly-loaded screens. It did NOT exercise an in-place data swap after
 *   page load — none of the Round-7 tests change the active account or apply a
 *   filter between scroll passes. The 4px/16ms slow-scroll pattern applied in
 *   Round 8 exposes whether CDK's internal state is coherent after the swap.
 *
 * ASSERTION STRATEGY (AC2):
 *   Both Pass 1 and Pass 2 call assertStickyHeaderInvariant from the Round-7
 *   helper (Story 101.3). Pass 2 additionally passes rowSelector so every
 *   captured FrameSample.rows is populated; this enables the third AC2 check:
 *     - drift: header.top <= viewport.top + 1px
 *     - overlap: header.top >= parentToolbar.bottom - 1px
 *     - flicker: no consecutive frames where same row top changes by > rowHeight/2
 *                AND reverts in the next frame
 */

import { type Page, test } from 'playwright/test';

import { applyAndClearColumnFilter } from './helpers/apply-and-clear-column-filter.helper';
import { applyAndClearGlobalFilter } from './helpers/apply-and-clear-global-filter.helper';
import { assertStickyHeaderInvariant } from './helpers/assert-sticky-header-invariant.helper';
import { swapActiveAccountViaNavigation } from './helpers/swap-active-account-via-navigation.helper';
import { swapUniverseAccount } from './helpers/swap-universe-account.helper';
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
 * Used by assertStickyHeaderInvariant for the flicker threshold (AC2).
 */
export const ROW_HEIGHT_PX = 57;

const VIEWPORT_SELECTOR = 'cdk-virtual-scroll-viewport';
const HEADER_ROW_SELECTOR = 'th.mat-mdc-header-cell';
const ROW_SELECTOR = 'tr.mat-mdc-row';

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
 *   Pass 1 — baseline (confirms Round-7 Epic 101 fix is intact).
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

test.describe('Universe — account-change sticky-header regression', () => {
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
    await runTwoPassInvariantCheck(page, async function doContextChange() {
      await swapUniverseAccount(page);
    });
  });
});

// ─── Universe — filter-change (symbol) ───────────────────────────────────────

test.describe('Universe — filter-change (symbol) sticky-header regression', () => {
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
    const symbolPrefix =
      symbols.length > 0 ? symbols[0].substring(0, 6) : 'USCRL0';

    await runTwoPassInvariantCheck(page, async function doContextChange() {
      await applyAndClearColumnFilter(page, {
        columnSelector: `${VIEWPORT_SELECTOR} thead input[placeholder]`,
        filterValue: symbolPrefix,
      });
    });
  });
});

// ─── Open Positions — account-change ─────────────────────────────────────────

test.describe('Open Positions — account-change sticky-header regression', () => {
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
    await page.waitForSelector('cdk-virtual-scroll-viewport', { timeout: 30000 });
    await page.waitForTimeout(2000);
  });

  test('Open Positions: all sticky-header invariants hold after account-change (drift / overlap / flicker)', async ({
    page,
  }) => {
    // Context-change: navigate to /account/{id2}/open.
    // AccountPanelComponent is reused (same routeConfig); ActivatedRoute.params
    // emits new :accountId → currentAccountSignalStore.setCurrentAccountId() →
    // openPositionsService.selectOpenPositions() recomputes → CDK data swaps.
    await runTwoPassInvariantCheck(page, async function doContextChange() {
      await swapActiveAccountViaNavigation(page, {
        toAccountId: accountId2,
        routeSuffix: 'open',
      });
    });
  });
});

// ─── Open Positions — filter-change (symbol) ─────────────────────────────────

test.describe('Open Positions — filter-change (symbol) sticky-header regression', () => {
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
    await page.waitForSelector('cdk-virtual-scroll-viewport', { timeout: 30000 });
    await page.waitForTimeout(2000);
  });

  test('Open Positions: all sticky-header invariants hold after symbol filter apply/clear (drift / overlap / flicker)', async ({
    page,
  }) => {
    // Context-change: fill the symbol search input (triggers server round-trip + CDK refresh)
    await runTwoPassInvariantCheck(page, async function doContextChange() {
      await applyAndClearColumnFilter(page, {
        columnSelector: '[data-testid="symbol-search-input"]',
        filterValue: 'E2E-OP',
      });
    });
  });
});

// ─── Sold Positions — account-change ─────────────────────────────────────────

test.describe('Sold Positions — account-change sticky-header regression', () => {
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
    await page.waitForSelector('cdk-virtual-scroll-viewport', { timeout: 30000 });
    await page.waitForTimeout(2000);
  });

  test('Sold Positions: all sticky-header invariants hold after account-change (drift / overlap / flicker)', async ({
    page,
  }) => {
    await runTwoPassInvariantCheck(page, async function doContextChange() {
      await swapActiveAccountViaNavigation(page, {
        toAccountId: accountId2,
        routeSuffix: 'sold',
      });
    });
  });
});

// ─── Sold Positions — filter-change (symbol) ─────────────────────────────────

test.describe('Sold Positions — filter-change (symbol) sticky-header regression', () => {
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
    await page.waitForSelector('cdk-virtual-scroll-viewport', { timeout: 30000 });
    await page.waitForTimeout(2000);
  });

  test('Sold Positions: all sticky-header invariants hold after symbol filter apply/clear (drift / overlap / flicker)', async ({
    page,
  }) => {
    // Context-change: symbol filter input (placeholder="Search Symbol")
    await runTwoPassInvariantCheck(page, async function doContextChange() {
      await applyAndClearColumnFilter(page, {
        columnSelector: `${VIEWPORT_SELECTOR} thead input[placeholder="Search Symbol"]`,
        filterValue: 'E2E-SD',
      });
    });
  });
});

// ─── Dividend Deposits — account-change ──────────────────────────────────────

test.describe('Dividend Deposits — account-change sticky-header regression', () => {
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
    await page.waitForSelector('cdk-virtual-scroll-viewport', { timeout: 30000 });
    await page.waitForTimeout(2000);
  });

  test('Dividend Deposits: all sticky-header invariants hold after account-change (drift / overlap / flicker)', async ({
    page,
  }) => {
    // Dividend Deposits has no filter row (#filterRowTemplate is absent from the
    // template). Only account-change is exercised for this screen.
    await runTwoPassInvariantCheck(page, async function doContextChange() {
      await swapActiveAccountViaNavigation(page, {
        toAccountId: accountId2,
        routeSuffix: 'div-dep',
      });
    });
  });
});

// ─── Screener — filter-change (risk group) ───────────────────────────────────

test.describe('Screener — filter-change (risk group) sticky-header regression', () => {
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
    await page
      .locator('dms-base-table')
      .waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForSelector(ROW_SELECTOR, { timeout: 15000 });
  });

  test('Screener: all sticky-header invariants hold after risk-group filter apply/clear (drift / overlap / flicker)', async ({
    page,
  }) => {
    // Screener has no account-change trigger. Filter-change is via the
    // [data-testid="risk-group-filter"] mat-select in the filter row.
    // Seed creates 60 rows in the "Equities" risk group. Selecting "Income"
    // collapses data to 0; selecting "All" restores 60 rows. The CDK viewport
    // may have stale measurements from the collapsed state when data restores.
    await runTwoPassInvariantCheck(page, async function doContextChange() {
      await applyAndClearGlobalFilter(page, {
        filterSelector: '[data-testid="risk-group-filter"]',
        applyOptionText: 'Income',
        clearOptionText: 'All',
      });
    });
  });
});
