/**
 * Story 101.3: Screener Scrolling Regression Prevention Suite
 *
 * Regression guard covering the Screener screen's sticky-header invariant
 * during slow programmatic scrolling. Added as part of the Story 101.3
 * regression suite (Epic 101, Round 7).
 *
 * Screener was confirmed as a CDK virtual-scroll host in Story 101.1:
 *   grep -rn "cdk-virtual-scroll-viewport" apps/dms-material/src
 * yielded `global-screener.component.html`.
 *
 * Story 101.1 reproduction matrix entry for Screener:
 *   - header-scrolls-with-content: PASS (fixed by Story 101.2)
 *   - header-under-header:         FAIL (fixed by Story 101.2, contain:paint removal)
 *   - flicker:                     TBD (live-app observation deferred)
 *
 * Root cause (Story 101.2): `contain:paint` on `.virtual-scroll-viewport` in
 * `base-table.component.scss` caused CSS Containment Level 2 browsers
 * (Chrome 114+, Firefox 109+) to infer `contain:layout`, breaking
 * `position:sticky` anchoring during fine-grained slow scroll.
 *
 * This suite task (Task 8): Story 101.1's matrix lists Screener as a
 * virtual-scrolled screen not covered by Tasks 4–7. This file provides its
 * regression spec per the story's instruction: "create a regression spec for
 * it using the same helper pattern".
 *
 * Data volume: ≥ 60 screener rows seeded via `seedScrollScreenerData`.
 */

import { expect, test } from 'playwright/test';

import { assertStickyHeaderInvariant } from './helpers/assert-sticky-header-invariant.helper';
import { login } from './helpers/login.helper';
import { seedScrollScreenerData } from './helpers/seed-scroll-screener-data.helper';

const VIEWPORT_SELECTOR = 'cdk-virtual-scroll-viewport';
// NOTE: must be a TH cell selector — Angular Material's stickRows applies
// position:sticky to TH children, not the TR. getBoundingClientRect on TR
// returns the table-layout flow position, not the visual sticky position.
const HEADER_ROW_SELECTOR = 'th.mat-mdc-header-cell';
const ROW_SELECTOR = 'tr.mat-mdc-row';

// ─── Story 101.3: Header-Invariant Regression — Screener ─────────────────────

/**
 * Regression guard added by Story 101.3 (Epic 101, Round 7).
 *
 * Asserts the sticky table header remains anchored at the top of the CDK
 * virtual-scroll viewport during fine-grained slow scrolling. Uses the shared
 * `assertStickyHeaderInvariant` helper which drives scroll via
 * `requestAnimationFrame` inside a single `page.evaluate` call.
 *
 * This test catches the Round 7 artifact (contain:paint breaking position:sticky)
 * on the Screener screen specifically — a screen confirmed by Story 101.1
 * investigation to exhibit the header-under-header failure.
 */
test.describe('Screener — Story 101.3 slow-scroll header-invariant regression', () => {
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

  test('screener — slow scroll keeps header anchored under parent header', async ({
    page,
  }) => {
    // Regression guard for Epic 101 (Round 7) — Story 101.3.
    //
    // Root cause (Story 101.2): contain:paint on .virtual-scroll-viewport in
    // base-table.component.scss caused CSS Containment Level 2 browsers
    // (Chrome 114+, Firefox 109+) to infer contain:layout, breaking the
    // position:sticky anchor during fine-grained slow scroll.
    //
    // Screener was confirmed as a failing screen in Story 101.1's reproduction
    // matrix (header-under-header: FAIL). Story 101.2's fix (removing
    // contain:paint) eliminated this artifact on all CDK virtual-scroll screens
    // including Screener.
    //
    // AC #4: Reverting the Story 101.2 fix (re-adding contain:paint to
    // base-table.component.scss) causes this test to fail — confirming the
    // suite guards the specific regression.
    //
    // If this test fails after a future code change, check:
    //   1. base-table.component.scss — no contain:paint/layout on .virtual-scroll-viewport
    //   2. Any ancestor of cdk-virtual-scroll-viewport that acquired transform/will-change/contain
    await expect(page.locator(VIEWPORT_SELECTOR)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator(HEADER_ROW_SELECTOR).first()).toBeVisible({
      timeout: 5000,
    });

    await assertStickyHeaderInvariant(
      page,
      VIEWPORT_SELECTOR,
      HEADER_ROW_SELECTOR
    );
  });
});
