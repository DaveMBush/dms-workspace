/**
 * scrolling-regression-106-investigation.spec.ts — Round 9 (Epic 106) Investigation
 * ─────────────────────────────────────────────────────────────────────────────────
 *
 * PURPOSE: Live sweep to capture the Round-9 reproduction matrix.
 * This file performs Tasks 2–6 of Story 106.1 live-browser investigation.
 *
 * CONSTRAINTS:
 *  - test.fixme() wraps all tests so pnpm all stays green (per AC5/AC6)
 *  - The sweep records findings to console; Dev Agent post-processes into story file
 *  - Uses the same helpers as Round-8 (scrolling-regression-105.spec.ts)
 *  - Seeds data on beforeAll; cleans up on afterAll
 *
 * ROUTES:
 *  - Universe:          /global/universe
 *  - Open Positions:    /account/{id}/open
 *  - Sold Positions:    /account/{id}/sold
 *  - Dividend Deposits: /account/{id}/div-dep
 *  - Screener:          /global/screener
 *
 * RUN: pnpm playwright test apps/dms-material-e2e/src/scrolling-regression-106-investigation.spec.ts
 *       --config=apps/dms-material-e2e/playwright.config.ts --project=chromium --reporter=list
 */

/* eslint-disable no-console */
import { expect, type Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedScrollUniverseData } from './helpers/seed-scroll-universe-data.helper';
import { seedScrollOpenPositionsData } from './helpers/seed-scroll-open-positions-data.helper';
import { seedScrollSoldPositionsData } from './helpers/seed-scroll-sold-positions-data.helper';
import { seedScrollDivDepositsWithSymbolsData } from './helpers/seed-scroll-div-deposits-with-symbols-data.helper';
import { seedScrollScreenerData } from './helpers/seed-scroll-screener-data.helper';
import { swapActiveAccountViaNavigation } from './helpers/swap-active-account-via-navigation.helper';
import { swapUniverseAccount } from './helpers/swap-universe-account.helper';
import { applyAndClearColumnFilter } from './helpers/apply-and-clear-column-filter.helper';
import { applyAndClearGlobalFilter } from './helpers/apply-and-clear-global-filter.helper';

// ─── Constants ─────────────────────────────────────────────────────────────────

const ROW_HEIGHT_PX = 57;
const HEADER_SELECTOR = 'th.mat-mdc-header-cell';
const VIEWPORT_SELECTOR = 'cdk-virtual-scroll-viewport';
const TOOLBAR_SELECTOR = 'mat-toolbar';

// ─── Type helpers ──────────────────────────────────────────────────────────────

interface ScrollInvariantResult {
  pass: boolean;
  driftViolations: number;
  overlapViolations: number;
  frames: number;
}

/**
 * Perform a slow-scroll pass and capture invariant data without throwing.
 * Returns pass/fail + violation counts.
 */
async function softScrollPass(
  page: Page,
  label: string
): Promise<ScrollInvariantResult> {
  const frames: Array<{
    t: number;
    headerTop: number;
    parentBottom: number;
    viewportTop: number;
  }> = await page.evaluate(
    function captureFrames(arg: {
      containerSel: string;
      headerSel: string;
      parentSel: string;
    }) {
      const { containerSel, headerSel, parentSel } = arg;
      return new Promise<
        Array<{
          t: number;
          headerTop: number;
          parentBottom: number;
          viewportTop: number;
        }>
      >(function resolver(resolve) {
        const out: Array<{
          t: number;
          headerTop: number;
          parentBottom: number;
          viewportTop: number;
        }> = [];
        const container = document.querySelector<HTMLElement>(containerSel)!;
        const header = document.querySelector<HTMLElement>(headerSel)!;
        const parent = document.querySelector<HTMLElement>(parentSel)!;

        if (!container || !header || !parent) {
          resolve(out);
          return;
        }

        const start = performance.now();
        const scrollMs = 4000;
        const stepPx = 8;

        function step(now: number): void {
          out.push({
            t: now - start,
            headerTop: header.getBoundingClientRect().top,
            parentBottom: parent.getBoundingClientRect().bottom,
            viewportTop: container.getBoundingClientRect().top,
          });
          if (now - start < scrollMs) {
            container.scrollTop += stepPx;
            requestAnimationFrame(step);
          } else {
            resolve(out);
          }
        }
        requestAnimationFrame(step);
      });
    },
    {
      containerSel: VIEWPORT_SELECTOR,
      headerSel: HEADER_SELECTOR,
      parentSel: TOOLBAR_SELECTOR,
    }
  );

  let driftViolations = 0;
  let overlapViolations = 0;
  for (const f of frames) {
    if (f.headerTop > f.viewportTop + 1) driftViolations++;
    if (f.headerTop < f.parentBottom - 1) overlapViolations++;
  }

  const pass = driftViolations === 0 && overlapViolations === 0;
  console.log(
    `  [${label}] frames=${
      frames.length
    } drift=${driftViolations} overlap=${overlapViolations} → ${
      pass ? 'PASS' : 'FAIL'
    }`
  );
  return { pass, driftViolations, overlapViolations, frames: frames.length };
}

/** Navigate to a URL and wait for CDK viewport to appear. */
async function navigateAndWaitForTable(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(VIEWPORT_SELECTOR, { timeout: 30000 });
  // Let Angular settle (signals, data load)
  await page.waitForTimeout(2000);
}

/** Scroll viewport back to top and wait for stable layout */
async function resetScrollToTop(page: Page): Promise<void> {
  await page.evaluate(function scrollTop(sel: string) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) el.scrollTop = 0;
  }, VIEWPORT_SELECTOR);
  await page.waitForTimeout(500);
}

/** Capture live-DOM evidence for contextId mechanism */
async function captureDomEvidence(
  page: Page
): Promise<{
  containValue: string;
  overflowY: string;
  headerTop: number;
  viewportTop: number;
}> {
  return page.evaluate(
    function getEvidence(arg: { vpSel: string; hSel: string }) {
      const vp = document.querySelector<HTMLElement>(arg.vpSel);
      const h = document.querySelector<HTMLElement>(arg.hSel);
      if (!vp || !h) {
        return {
          containValue: 'NOT_FOUND',
          overflowY: 'NOT_FOUND',
          headerTop: -999,
          viewportTop: -999,
        };
      }
      const cs = getComputedStyle(vp);
      return {
        containValue: cs.contain,
        overflowY: cs.overflowY,
        headerTop: h.getBoundingClientRect().top,
        viewportTop: vp.getBoundingClientRect().top,
      };
    },
    { vpSel: VIEWPORT_SELECTOR, hSel: HEADER_SELECTOR }
  );
}

// ─── Test Suite ────────────────────────────────────────────────────────────────

// TODO(106.2): Remove skip wrapper when root-cause investigation begins.
// All tests are skipped here per AC5/AC6 so pnpm all stays green.
test.describe.skip(
  'Round-9 Investigation: Context-change scrolling reproduction',
  () => {
    // Seed data handles
    let universeCleanup: () => Promise<void>;
    let openPositionsCleanup1: () => Promise<void>;
    let openPositionsCleanup2: () => Promise<void>;
    let soldPositionsCleanup1: () => Promise<void>;
    let soldPositionsCleanup2: () => Promise<void>;
    let divDepositsCleanup1: () => Promise<void>;
    let divDepositsCleanup2: () => Promise<void>;
    let screenerCleanup: () => Promise<void>;
    let openAccountId1 = '';
    let openAccountId2 = '';
    let soldAccountId1 = '';
    let soldAccountId2 = '';
    let divDepositsAccountId1 = '';
    let divDepositsAccountId2 = '';

    test.beforeAll(async () => {
      // Seed universe data (needed for universe screen + screener)
      const universeSeeder = await seedScrollUniverseData();
      universeCleanup = universeSeeder.cleanup;

      // Seed TWO open positions accounts for account-swap test
      const op1 = await seedScrollOpenPositionsData();
      openAccountId1 = op1.accountId;
      openPositionsCleanup1 = op1.cleanup;

      const op2 = await seedScrollOpenPositionsData();
      openAccountId2 = op2.accountId;
      openPositionsCleanup2 = op2.cleanup;

      // Seed TWO sold positions accounts for account-swap test
      const sold1 = await seedScrollSoldPositionsData();
      soldAccountId1 = sold1.accountId;
      soldPositionsCleanup1 = sold1.cleanup;

      const sold2 = await seedScrollSoldPositionsData();
      soldAccountId2 = sold2.accountId;
      soldPositionsCleanup2 = sold2.cleanup;

      // Seed TWO div deposit accounts for account-swap test
      const div1 = await seedScrollDivDepositsWithSymbolsData();
      divDepositsAccountId1 = div1.accountId;
      divDepositsCleanup1 = div1.cleanup;

      const div2 = await seedScrollDivDepositsWithSymbolsData();
      divDepositsAccountId2 = div2.accountId;
      divDepositsCleanup2 = div2.cleanup;

      // Seed screener (no accountId needed for screener screen)
      const sc = await seedScrollScreenerData();
      screenerCleanup = sc.cleanup;

      console.log('Seeded data:');
      console.log('  openAccountId1:', openAccountId1);
      console.log('  openAccountId2:', openAccountId2);
      console.log('  soldAccountId1:', soldAccountId1);
      console.log('  soldAccountId2:', soldAccountId2);
      console.log('  divDepositsAccountId1:', divDepositsAccountId1);
      console.log('  divDepositsAccountId2:', divDepositsAccountId2);
    });

    test.afterAll(async () => {
      const cleanups = [
        universeCleanup,
        openPositionsCleanup1,
        openPositionsCleanup2,
        soldPositionsCleanup1,
        soldPositionsCleanup2,
        divDepositsCleanup1,
        divDepositsCleanup2,
        screenerCleanup,
      ];
      for (const cleanup of cleanups) {
        if (cleanup) {
          await cleanup().catch(console.error);
        }
      }
    });

    // ─── Task 2 + Task 3: Universe — baseline + account-change ─────────────────

    test('UNIVERSE: baseline clean + account-change reproduction', async ({
      page,
    }) => {
      await login(page);

      // ── Pass 1: Baseline (fresh load) ──
      console.log('\n=== UNIVERSE: Pass 1 (baseline) ===');
      await navigateAndWaitForTable(page, '/global/universe');
      const evidence1 = await captureDomEvidence(page);
      console.log('  CSS guards:', evidence1.containValue, evidence1.overflowY);

      // Assert CSS guards (contain must NOT include layout/paint)
      expect(
        evidence1.containValue,
        'contain must not include layout or paint on baseline'
      ).not.toMatch(/layout|paint/);

      const pass1 = await softScrollPass(page, 'Universe-Pass1-baseline');
      console.log('Pass1 result:', JSON.stringify(pass1));

      // ── Account swap via universe account-selector ──
      console.log('\n=== UNIVERSE: Account change ===');
      await resetScrollToTop(page);
      await swapUniverseAccount(page);
      await page.waitForTimeout(1000); // let contextId signal fire

      const evidenceAfterSwap = await captureDomEvidence(page);
      console.log(
        '  CSS guards after swap:',
        evidenceAfterSwap.containValue,
        evidenceAfterSwap.overflowY
      );
      console.log(
        '  headerTop after swap:',
        evidenceAfterSwap.headerTop,
        'viewportTop:',
        evidenceAfterSwap.viewportTop
      );

      // ── Pass 2: Post-account-change ──
      console.log('\n=== UNIVERSE: Pass 2 (post-account-change) ===');
      const pass2 = await softScrollPass(page, 'Universe-Pass2-post-acct');
      console.log('Pass2 result:', JSON.stringify(pass2));

      // Record to console (will be scraped by dev agent)
      console.log(
        'MATRIX_CELL: Universe|Chromium|account-change|' +
          (pass2.pass ? 'PASS' : 'FAIL') +
          '|drift=' +
          pass2.driftViolations +
          ',overlap=' +
          pass2.overlapViolations
      );
    });

    // ─── Task 4: Universe — filter-change reproduction ─────────────────────────

    test('UNIVERSE: filter-change reproduction', async ({ page }) => {
      await login(page);

      console.log('\n=== UNIVERSE: Pass 1 (baseline before filter) ===');
      await navigateAndWaitForTable(page, '/global/universe');
      const pass1 = await softScrollPass(page, 'Universe-Pass1-pre-filter');
      console.log('Pass1 result:', JSON.stringify(pass1));

      // Apply column filter and then clear it
      await resetScrollToTop(page);
      console.log('\n=== UNIVERSE: Apply + clear column filter ===');
      await applyAndClearColumnFilter(page, {
        columnSelector: `${VIEWPORT_SELECTOR} thead input[placeholder]`,
        filterValue: 'USCRL0',
      });
      await page.waitForTimeout(1000);

      console.log('\n=== UNIVERSE: Pass 2 (post-filter-clear) ===');
      const pass2 = await softScrollPass(page, 'Universe-Pass2-post-filter');
      console.log('Pass2 result:', JSON.stringify(pass2));

      console.log(
        'MATRIX_CELL: Universe|Chromium|filter-change|' +
          (pass2.pass ? 'PASS' : 'FAIL') +
          '|drift=' +
          pass2.driftViolations +
          ',overlap=' +
          pass2.overlapViolations
      );
    });

    // ─── Task 3: Open Positions — account-change reproduction ──────────────────

    test('OPEN POSITIONS: baseline clean + account-change reproduction', async ({
      page,
    }) => {
      await login(page);

      console.log('\n=== OPEN POSITIONS: Pass 1 (baseline) ===');
      await navigateAndWaitForTable(page, `/account/${openAccountId1}/open`);
      const pass1 = await softScrollPass(page, 'OpenPos-Pass1-baseline');
      console.log('Pass1 result:', JSON.stringify(pass1));

      // Swap to openAccountId2
      await resetScrollToTop(page);
      console.log('\n=== OPEN POSITIONS: Account change ===');
      await swapActiveAccountViaNavigation(page, {
        toAccountId: openAccountId2,
        routeSuffix: 'open',
      });
      await page.waitForTimeout(1000);

      console.log('\n=== OPEN POSITIONS: Pass 2 (post-account-change) ===');
      const pass2 = await softScrollPass(page, 'OpenPos-Pass2-post-acct');
      console.log('Pass2 result:', JSON.stringify(pass2));

      console.log(
        'MATRIX_CELL: OpenPositions|Chromium|account-change|' +
          (pass2.pass ? 'PASS' : 'FAIL') +
          '|drift=' +
          pass2.driftViolations +
          ',overlap=' +
          pass2.overlapViolations
      );
    });

    // ─── Task 4: Open Positions — filter-change reproduction ───────────────────

    test('OPEN POSITIONS: filter-change reproduction', async ({ page }) => {
      await login(page);

      console.log('\n=== OPEN POSITIONS: Pass 1 (baseline before filter) ===');
      await navigateAndWaitForTable(page, `/account/${openAccountId1}/open`);
      const pass1 = await softScrollPass(page, 'OpenPos-Pass1-pre-filter');
      console.log('Pass1 result:', JSON.stringify(pass1));

      await resetScrollToTop(page);
      console.log('\n=== OPEN POSITIONS: Apply + clear column filter ===');
      await applyAndClearColumnFilter(page, {
        columnSelector: '[data-testid="symbol-search-input"]',
        filterValue: 'E2E-OP',
      });
      await page.waitForTimeout(1000);

      console.log('\n=== OPEN POSITIONS: Pass 2 (post-filter-clear) ===');
      const pass2 = await softScrollPass(page, 'OpenPos-Pass2-post-filter');
      console.log('Pass2 result:', JSON.stringify(pass2));

      console.log(
        'MATRIX_CELL: OpenPositions|Chromium|filter-change|' +
          (pass2.pass ? 'PASS' : 'FAIL') +
          '|drift=' +
          pass2.driftViolations +
          ',overlap=' +
          pass2.overlapViolations
      );
    });

    // ─── Task 3: Sold Positions — account-change reproduction ──────────────────

    test('SOLD POSITIONS: baseline clean + account-change reproduction', async ({
      page,
    }) => {
      await login(page);

      console.log('\n=== SOLD POSITIONS: Pass 1 (baseline) ===');
      await navigateAndWaitForTable(page, `/account/${soldAccountId1}/sold`);
      const pass1 = await softScrollPass(page, 'SoldPos-Pass1-baseline');
      console.log('Pass1 result:', JSON.stringify(pass1));

      await resetScrollToTop(page);
      console.log('\n=== SOLD POSITIONS: Account change ===');
      await swapActiveAccountViaNavigation(page, {
        toAccountId: soldAccountId2,
        routeSuffix: 'sold',
      });
      await page.waitForTimeout(1000);

      console.log('\n=== SOLD POSITIONS: Pass 2 (post-account-change) ===');
      const pass2 = await softScrollPass(page, 'SoldPos-Pass2-post-acct');
      console.log('Pass2 result:', JSON.stringify(pass2));

      console.log(
        'MATRIX_CELL: SoldPositions|Chromium|account-change|' +
          (pass2.pass ? 'PASS' : 'FAIL') +
          '|drift=' +
          pass2.driftViolations +
          ',overlap=' +
          pass2.overlapViolations
      );
    });

    // ─── Task 4: Sold Positions — filter-change reproduction ───────────────────

    test('SOLD POSITIONS: filter-change reproduction', async ({ page }) => {
      await login(page);

      console.log('\n=== SOLD POSITIONS: Pass 1 (baseline before filter) ===');
      await navigateAndWaitForTable(page, `/account/${soldAccountId1}/sold`);
      const pass1 = await softScrollPass(page, 'SoldPos-Pass1-pre-filter');
      console.log('Pass1 result:', JSON.stringify(pass1));

      await resetScrollToTop(page);
      console.log(
        '\n=== SOLD POSITIONS: Apply + clear column filter (inline) ==='
      );
      // Use inline approach: applyAndClearColumnFilter waits for tr.mat-mdc-row but
      // sold positions filter may not trigger row visibility change reliably in all envs.
      const soldFilterInput = page
        .locator(`${VIEWPORT_SELECTOR} thead input[placeholder]`)
        .first();
      await soldFilterInput.click();
      await soldFilterInput.type('USCRL', { delay: 30 });
      await page.waitForTimeout(1500);
      await soldFilterInput.clear();
      await page.waitForTimeout(1500);

      console.log('\n=== SOLD POSITIONS: Pass 2 (post-filter-clear) ===');
      const pass2 = await softScrollPass(page, 'SoldPos-Pass2-post-filter');
      console.log('Pass2 result:', JSON.stringify(pass2));

      console.log(
        'MATRIX_CELL: SoldPositions|Chromium|filter-change|' +
          (pass2.pass ? 'PASS' : 'FAIL') +
          '|drift=' +
          pass2.driftViolations +
          ',overlap=' +
          pass2.overlapViolations
      );
    });

    // ─── Task 3: Dividend Deposits — account-change reproduction ───────────────

    test('DIVIDEND DEPOSITS: baseline clean + account-change reproduction', async ({
      page,
    }) => {
      await login(page);

      console.log('\n=== DIV DEPOSITS: Pass 1 (baseline) ===');
      await navigateAndWaitForTable(
        page,
        `/account/${divDepositsAccountId1}/div-dep`
      );
      const pass1 = await softScrollPass(page, 'DivDep-Pass1-baseline');
      console.log('Pass1 result:', JSON.stringify(pass1));

      await resetScrollToTop(page);
      console.log('\n=== DIV DEPOSITS: Account change ===');
      await swapActiveAccountViaNavigation(page, {
        toAccountId: divDepositsAccountId2,
        routeSuffix: 'div-dep',
      });
      await page.waitForTimeout(1000);

      console.log('\n=== DIV DEPOSITS: Pass 2 (post-account-change) ===');
      const pass2 = await softScrollPass(page, 'DivDep-Pass2-post-acct');
      console.log('Pass2 result:', JSON.stringify(pass2));

      console.log(
        'MATRIX_CELL: DivDeposits|Chromium|account-change|' +
          (pass2.pass ? 'PASS' : 'FAIL') +
          '|drift=' +
          pass2.driftViolations +
          ',overlap=' +
          pass2.overlapViolations
      );
    });

    // ─── Task 3: Screener — account-change reproduction ────────────────────────
    // NOTE: Screener uses universe account selector, not route-based account swap.
    // After seeding universe data, there should be accounts in the selector.

    test('SCREENER: baseline clean + account-change reproduction', async ({
      page,
    }) => {
      await login(page);

      console.log('\n=== SCREENER: Pass 1 (baseline) ===');
      await navigateAndWaitForTable(page, '/global/screener');
      const pass1 = await softScrollPass(page, 'Screener-Pass1-baseline');
      console.log('Pass1 result:', JSON.stringify(pass1));

      await resetScrollToTop(page);
      console.log(
        '\n=== SCREENER: Account change (via navigation away + back) ==='
      );
      // Screener has no account selector; navigate away and back to trigger contextId change.
      await page.goto('/global/universe');
      await page.waitForSelector(VIEWPORT_SELECTOR, { timeout: 10000 });
      await page.waitForTimeout(500);
      await navigateAndWaitForTable(page, '/global/screener');
      await page.waitForTimeout(1000);

      console.log('\n=== SCREENER: Pass 2 (post-account-change) ===');
      const pass2 = await softScrollPass(page, 'Screener-Pass2-post-acct');
      console.log('Pass2 result:', JSON.stringify(pass2));

      console.log(
        'MATRIX_CELL: Screener|Chromium|account-change|' +
          (pass2.pass ? 'PASS' : 'FAIL') +
          '|drift=' +
          pass2.driftViolations +
          ',overlap=' +
          pass2.overlapViolations
      );
    });

    // ─── Task 4: Screener — filter-change reproduction ─────────────────────────

    test('SCREENER: filter-change reproduction', async ({ page }) => {
      await login(page);

      console.log('\n=== SCREENER: Pass 1 (baseline before filter) ===');
      await navigateAndWaitForTable(page, '/global/screener');
      const pass1 = await softScrollPass(page, 'Screener-Pass1-pre-filter');
      console.log('Pass1 result:', JSON.stringify(pass1));

      await resetScrollToTop(page);
      console.log('\n=== SCREENER: Apply + clear risk-group filter ===');
      // Screener uses a risk-group mat-select filter, not a column text filter.
      await applyAndClearGlobalFilter(page, {
        filterSelector: '[data-testid="risk-group-filter"]',
        applyOptionText: 'Income',
        clearOptionText: 'All',
      });
      await page.waitForTimeout(1000);

      console.log('\n=== SCREENER: Pass 2 (post-filter-clear) ===');
      const pass2 = await softScrollPass(page, 'Screener-Pass2-post-filter');
      console.log('Pass2 result:', JSON.stringify(pass2));

      console.log(
        'MATRIX_CELL: Screener|Chromium|filter-change|' +
          (pass2.pass ? 'PASS' : 'FAIL') +
          '|drift=' +
          pass2.driftViolations +
          ',overlap=' +
          pass2.overlapViolations
      );
    });

    // ─── Task 6: Live-DOM Evidence capture for ALL screens ─────────────────────
    // Captures CSS contain/overflow-y values and header bounding rect to document
    // whether Round-9 candidates are observable in the live DOM.

    test('LIVE-DOM EVIDENCE: CSS guards and header position on all screens', async ({
      page,
    }) => {
      await login(page);

      const screens: Array<{ name: string; url: string }> = [
        { name: 'Universe', url: '/global/universe' },
        { name: 'OpenPositions', url: `/account/${openAccountId1}/open` },
        { name: 'SoldPositions', url: `/account/${soldAccountId1}/sold` },
        {
          name: 'DivDeposits',
          url: `/account/${divDepositsAccountId1}/div-dep`,
        },
        { name: 'Screener', url: '/global/screener' },
      ];

      for (const screen of screens) {
        console.log(`\n=== DOM Evidence: ${screen.name} ===`);
        await navigateAndWaitForTable(page, screen.url);

        const evidence = await captureDomEvidence(page);
        console.log(`  contain: "${evidence.containValue}"`);
        console.log(`  overflow-y: "${evidence.overflowY}"`);
        console.log(
          `  headerTop: ${evidence.headerTop}, viewportTop: ${evidence.viewportTop}`
        );
        console.log(
          `  drift on load: ${Math.max(
            0,
            evidence.headerTop - evidence.viewportTop - 1
          ).toFixed(1)}px`
        );

        // Check if contain includes layout/paint (Candidate 4)
        const containHasLayoutOrPaint = /layout|paint/.test(
          evidence.containValue
        );
        console.log(
          `  CANDIDATE_4 (contain includes layout/paint): ${containHasLayoutOrPaint}`
        );

        // Check overflow-y (Candidate 5)
        const overflowOk =
          evidence.overflowY === 'auto' || evidence.overflowY === 'scroll';
        console.log(`  CANDIDATE_5 (overflow-y is auto/scroll): ${overflowOk}`);

        console.log(
          `DOM_EVIDENCE: ${screen.name}|contain=${
            evidence.containValue
          }|overflow-y=${
            evidence.overflowY
          }|headerTop=${evidence.headerTop.toFixed(
            1
          )}|viewportTop=${evidence.viewportTop.toFixed(1)}`
        );
      }
    });
  }
);
