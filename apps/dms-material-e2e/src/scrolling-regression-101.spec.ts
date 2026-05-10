/**
 * Story 101.1: Round 7 Scrolling Regression — Sticky Header Layout Failures
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * PURPOSE
 * ──────────────────────────────────────────────────────────────────────────────
 * This spec documents three distinct visual layout failures ("Round 7 artifacts")
 * that occur during SLOW programmatic scrolling of CDK virtual-scroll tables.
 * Each failing test is annotated test.fail() — the test is EXPECTED to fail on
 * the current main branch, confirming the regression is captured. Story 101.2
 * fixes the root cause; at that point test.fail() annotations must be removed.
 *
 * Round 7 artifacts investigated:
 *   1. header-scrolls-with-content — The sticky <thead> (position:sticky; top:0)
 *      drifts DOWNWARD with content rows instead of staying anchored at the top
 *      of the cdk-virtual-scroll-viewport.
 *   2. header-under-header — The sticky <thead> slides UPWARD behind the parent
 *      app/toolbar header, disappearing from view as if position:sticky is
 *      ineffective.
 *   3. flicker — Content rows jitter mid-scroll; a row's Y position changes by
 *      more than one scroll-step delta then snaps back within the next frame.
 *      (Tests are skipped with test.describe.skip pending live-app observation
 *      of the exact frame pattern — Story 101.2 will finalise the assertion.)
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * TEST COVERAGE GAP vs EXISTING SUITES (AC #4)
 * ──────────────────────────────────────────────────────────────────────────────
 * universe-scrolling-regression.spec.ts      — asserts NO blank symbol cells;
 *   does NOT read header.getBoundingClientRect() at any point.
 * universe-smooth-scroll.spec.ts             — asserts monotonically non-
 *   decreasing scrollTop (no jump-back); step size is 100px, no bounding-box check.
 * open-positions-smooth-scroll.spec.ts       — same: monotonic scroll only.
 * div-deposits-smooth-scroll.spec.ts         — same: monotonic scroll only.
 * screener-smooth-scroll.spec.ts             — same: monotonic scroll only.
 * scrolling-regression-87.spec.ts            — asserts NO blank symbol cells on
 *   account-panel screens; still no header-position check.
 * open-positions-scrolling-regression.spec.ts — blank cell + multi-column data
 *   validation; no header-position bounding-box check.
 * sold-positions-scrolling-regression.spec.ts — same.
 * div-deposits-scrolling-regression.spec.ts  — same.
 *
 * The gap all existing suites share:
 *   (a) They use fast jump-to-bottom (scrollTop = scrollHeight) or ≥ 100px/step
 *       scroll, NOT the 4px/16ms fine-grained pattern that triggers Round 7 drift.
 *   (b) They never read header.getBoundingClientRect().top during the scroll
 *       sequence — they only inspect text content or scroll position.
 *   (c) They do not assert the geometric invariant that the sticky header must
 *       remain at the top of the cdk-virtual-scroll-viewport at all times.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * SCREENS UNDER TEST (full CDK virtual-scroll host enumeration, per AC #1)
 * ──────────────────────────────────────────────────────────────────────────────
 * grep -rn "cdk-virtual-scroll-viewport" apps/dms-material/src yielded these
 * component HTML files (confirmed as of Epic 101 branch):
 *   base-table.component.html       — shared host
 *   global-universe.component.html  → /global/universe
 *   global-screener.component.html  → /global/screener
 *   open-positions.component.html   → /account/:id/open
 *   sold-positions.component.html   → /account/:id/sold
 *   dividend-deposits.component.html→ /account/:id/div-dep
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * REPRODUCTION MATRIX (screen × artifact) — compiled from Task 2 investigation
 * ──────────────────────────────────────────────────────────────────────────────
 *
 *   Screen              │ Browser  │ header-scrolls-with-content │ header-under-header │ flicker
 *   ────────────────────┼──────────┼─────────────────────────────┼─────────────────────┼────────
 *   Universe            │ Chromium │ FAIL (test.fail annotated)  │ FAIL (test.fail)    │ TBD
 *   Universe            │ Firefox  │ FAIL (test.fail annotated)  │ FAIL (test.fail)    │ TBD
 *   Open Positions      │ Chromium │ FAIL (test.fail annotated)  │ FAIL (test.fail)    │ TBD
 *   Open Positions      │ Firefox  │ FAIL (test.fail annotated)  │ FAIL (test.fail)    │ TBD
 *   Sold Positions      │ Chromium │ FAIL (test.fail annotated)  │ FAIL (test.fail)    │ TBD
 *   Sold Positions      │ Firefox  │ FAIL (test.fail annotated)  │ FAIL (test.fail)    │ TBD
 *   Dividend Deposits   │ Chromium │ FAIL (test.fail annotated)  │ FAIL (test.fail)    │ TBD
 *   Dividend Deposits   │ Firefox  │ FAIL (test.fail annotated)  │ FAIL (test.fail)    │ TBD
 *   Screener            │ Chromium │ FAIL (test.fail annotated)  │ FAIL (test.fail)    │ TBD
 *   Screener            │ Firefox  │ FAIL (test.fail annotated)  │ FAIL (test.fail)    │ TBD
 *
 * "FAIL" = confirmed to fail in automated assertion; "TBD" = live-app observation
 * required to finalise the flicker assertion pattern (deferred to Story 101.2).
 *
 * NOTE: If any test.fail() test PASSES unexpectedly (i.e. the sticky header stays
 * anchored throughout slow scroll), Playwright will report it as an unexpected pass
 * and CI will fail. That is intentional: it signals that the annotation must be
 * removed because the bug no longer reproduces at 60-row data volume with 4px scroll
 * steps. In that case Story 101.2 should either (a) accept the clean result, or
 * (b) increase data volume until the artifact surfaces (the story recommends the
 * "data volume that triggered the live-app failure, not the helper's minimum").
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * PRIOR ROOT-CAUSE HISTORY (AC #3)
 * ──────────────────────────────────────────────────────────────────────────────
 * Epic 29: rowHeight mismatch between CSS and CDK viewport config.
 *   CDK calculated total scroll height from a rowHeight that did not match the
 *   rendered CSS height, producing incorrect virtualisation offsets. Fixed by
 *   aligning itemSize with the actual rendered row height (57px, now hardcoded
 *   as --mat-table-row-item-container-height in base-table.component.scss).
 *
 * Epic 31: contain:strict on the sticky header element.
 *   contain:strict on the <thead> created a new paint/layout boundary. When CDK
 *   recalculated viewport dimensions, the boundary caused the sticky header to
 *   repaint in a displaced position. Fixed by removing contain:strict from the
 *   header (base-table.component.scss still has contain:paint on .virtual-scroll-
 *   viewport — the container, NOT the header — which is safe).
 *
 * Epic 44: CSS transition animations + extra change-detection cycles.
 *   Angular material transition animations caused CDK to recalculate itemSize mid-
 *   animation, producing visible layout shifts. Fixed by disabling CDK scroll
 *   animations or suppressing change-detection during transition frames.
 *
 * Epic 60: isLoading===true rows filtered → array shrinks → CDK scroll height
 *   shrinks → viewport jumps back to a lower scrollTop.
 *   Universe used enrich-universe-with-risk-groups which returned null for loading
 *   rows, shrinking the array. Fixed by keeping placeholder rows in the array.
 *
 * Epic 64: Edge-case follow-up to Epic 60. excludeLoadingRows filter in
 *   filteredData$ re-introduced the same shrink-on-load regression. Fixed by
 *   removing the filter.
 *
 * Epic 87: Account-panel placeholder rows had symbol:'' (empty string) instead of
 *   '\u2026'. A rapid scroll triggered SmartNgRX lazy-load windows where placeholder
 *   rows with blank symbol cells were visible. Fixed by changing the placeholder
 *   symbol to '\u2026' on Open Positions, Sold Positions, and Dividend Deposits
 *   component services (Story 87.2), matching the Universe pattern.
 *
 * Round 7 (this story): Slow-scroll layout drift — sticky header position instability
 *   during fine-grained (4px/step) programmatic scrolling. All prior fixes are still
 *   in place. A NEW visual artifact category emerged: the sticky header fails to
 *   maintain position:sticky anchoring across fine-grained scroll increments.
 *   Root-cause hypotheses (for Story 101.2 to confirm):
 *     H1. transform or will-change on an ancestor of the sticky <thead> creates a
 *         new containing block, evicting position:sticky from the viewport stacking
 *         context (e.g. a mat-sidenav-container or app-level transition wrapper).
 *     H2. contain:paint on .virtual-scroll-viewport (base-table.component.scss)
 *         establishes a paint boundary that, under certain Chromium/Firefox layout
 *         versions, blocks the sticky containing-block search.
 *     H3. OnPush change detection flush timing: a signal update triggers markForCheck
 *         mid-scroll frame, causing Angular to re-render rows before the browser
 *         resolves the sticky position for the current frame.
 *     H4. CDK viewport vs. sticky-header element ordering: the sticky header lives
 *         INSIDE cdk-virtual-scroll-viewport (correct), but a CDK virtual-scroll
 *         update re-orders DOM nodes mid-frame, displacing the header momentarily.
 *     H5. trackBy identity churn from the symbol-on-server refactor: if row keys
 *         change during slow scroll (e.g. id+symbol vs id alone), CDK destroys and
 *         re-creates rows mid-scroll, triggering a layout flush that displaces the
 *         sticky header.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * EXISTING TEST GAP ANALYSIS (AC #4 — why existing suites missed Round 7)
 * ──────────────────────────────────────────────────────────────────────────────
 * Pattern 1 — Fast scroll (universe-scrolling-regression.spec.ts,
 *   scrolling-regression-87.spec.ts, *-scrolling-regression.spec.ts):
 *     scrollTop = scrollHeight  →  one large jump to bottom
 *   Why it misses Round 7: The sticky header snaps into place after the jump
 *   because the layout engine has a full repaint cycle to recompute sticky
 *   positions. The gradual position drift only occurs when each incremental
 *   scroll-step is small enough that CDK's scroll event handler fires before
 *   the browser's sticky-layout resolver can update the header position.
 *
 * Pattern 2 — 100px/step monotonic scroll (*-smooth-scroll.spec.ts):
 *     node.scrollBy(0, 100) + waitForTimeout(50)
 *   Why it misses Round 7: 100px is coarse enough that the sticky resolver
 *   catches up within the 50ms wait. The 4px/16ms pattern keeps the resolver
 *   perpetually behind the scroll position, exposing the layout drift.
 *   Additionally, these tests assert only scrollTop monotonicity — they never
 *   read the header's bounding box at all.
 *
 * Missing assertion in ALL existing suites:
 *   None of the existing scroll tests include:
 *     header.boundingBox().y  ≈  viewport.boundingBox().y
 *   This is the geometric invariant that position:sticky; top:0 must satisfy.
 *   Absence of this assertion is why the Round 7 layout drift slipped through
 *   despite the large scrolling regression suite coverage.
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
 * Exported for reference; not used in assertions but documents the
 * CDK itemSize so Story 101.2 can verify the value has not drifted.
 */
export const ROW_HEIGHT_PX = 57;

const VIEWPORT_SELECTOR = 'cdk-virtual-scroll-viewport';
const HEADER_ROW_SELECTOR = 'tr.mat-mdc-header-row';
const ROW_SELECTOR = 'tr.mat-mdc-row';

/** Pixel tolerance for floating-point bounding-box comparisons. */
const PIXEL_TOLERANCE = 2;

/**
 * Total scroll distance — enough for CDK to render multiple virtual windows
 * and expose sticky-header position instability.
 */
const SLOW_SCROLL_TOTAL_PX = 400;

/**
 * Step size that triggers the Round 7 layout drift.
 * Must be small (4px) so CDK's scroll-event handler fires before the browser's
 * sticky-layout resolver can update the header position per frame.
 */
const SLOW_SCROLL_STEP_PX = 4;

/**
 * Frame delay matching one browser animation frame (16ms ≈ 60 fps).
 * Yields control to the layout engine between each scroll step.
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
 * Increment the CDK viewport scrollTop by stepPx on each iteration, wait one
 * animation frame, then record {scrollTop, headerTop, viewportTop}. Returns all
 * captured frames for offline assertion.
 *
 * Design rationale (Round 7):
 *   Fast jump-to-bottom (existing suites) triggers a full repaint, giving the
 *   browser's sticky-layout resolver a complete cycle to anchor the header.
 *   The 4px/16ms pattern keeps the resolver perpetually behind the scroll event
 *   stream, surfacing the position drift that the existing suites do not catch.
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

// ─── Universe ─────────────────────────────────────────────────────────────────

test.describe('Universe — Round 7 slow-scroll sticky-header regression (Story 101.1)', () => {
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
    await page.waitForSelector(ROW_SELECTOR, { timeout: 15000 });
  });

  test('Universe: sticky header does not drift down with content during slow scroll (header-scrolls-with-content)', async ({
    page,
  }) => {
    // Fixed by Story 101.2: removed contain:paint from .virtual-scroll-viewport in
    // base-table.component.scss. Root cause: CSS Containment Level 2 made contain:paint
    // imply contain:layout, breaking position:sticky anchoring during slow scroll.

    const viewport = page.locator(VIEWPORT_SELECTOR);
    const header = page.locator(HEADER_ROW_SELECTOR).first();
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await expect(header).toBeVisible({ timeout: 5000 });

    const snapshots = await captureSlowScrollFrames(page, viewport, header);

    // Geometric invariant: with position:sticky; top:0, the header's screen Y
    // must equal the viewport's screen Y on every frame (within PIXEL_TOLERANCE).
    // Violation: headerTop > viewportTop + PIXEL_TOLERANCE = header drifted down.
    const driftingDown = snapshots.filter(function isDriftingDown(
      snap: FrameSnapshot
    ) {
      return snap.headerTop - snap.viewportTop > PIXEL_TOLERANCE;
    });

    expect(
      driftingDown,
      `Universe header-scrolls-with-content: ${driftingDown.length} frame(s) where header Y ` +
        `exceeded viewport Y by >${PIXEL_TOLERANCE}px during 4px/step slow scroll. ` +
        'position:sticky anchoring failed — fix in Story 101.2.'
    ).toHaveLength(0);
  });

  test('Universe: sticky header does not slide behind app bar during slow scroll (header-under-header)', async ({
    page,
  }) => {
    // Fixed by Story 101.2: same root cause as header-scrolls-with-content.

    const viewport = page.locator(VIEWPORT_SELECTOR);
    const header = page.locator(HEADER_ROW_SELECTOR).first();
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await expect(header).toBeVisible({ timeout: 5000 });

    const snapshots = await captureSlowScrollFrames(page, viewport, header);

    // Violation: viewportTop - headerTop > PIXEL_TOLERANCE
    //   = header Y is above viewport Y = header slid behind app bar.
    const hiddenBehindBar = snapshots.filter(function isAboveViewport(
      snap: FrameSnapshot
    ) {
      return snap.viewportTop - snap.headerTop > PIXEL_TOLERANCE;
    });

    expect(
      hiddenBehindBar,
      `Universe header-under-header: ${hiddenBehindBar.length} frame(s) where header Y was ` +
        `>${PIXEL_TOLERANCE}px above viewport Y (header slid behind app bar). Fix in Story 101.2.`
    ).toHaveLength(0);
  });
});

// ─── Open Positions ───────────────────────────────────────────────────────────

test.describe('Open Positions — Round 7 slow-scroll sticky-header regression (Story 101.1)', () => {
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

  test('Open Positions: sticky header does not drift down with content during slow scroll (header-scrolls-with-content)', async ({
    page,
  }) => {
    // Fixed by Story 101.2: removed contain:paint from base-table.component.scss.

    const viewport = page.locator(VIEWPORT_SELECTOR);
    const header = page.locator(HEADER_ROW_SELECTOR).first();
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await expect(header).toBeVisible({ timeout: 5000 });

    const snapshots = await captureSlowScrollFrames(page, viewport, header);
    const driftingDown = snapshots.filter(function isDriftingDown(
      snap: FrameSnapshot
    ) {
      return snap.headerTop - snap.viewportTop > PIXEL_TOLERANCE;
    });

    expect(
      driftingDown,
      `Open Positions header-scrolls-with-content: ${driftingDown.length} frames with drift >${PIXEL_TOLERANCE}px. Fix in Story 101.2.`
    ).toHaveLength(0);
  });

  test('Open Positions: sticky header does not slide behind app bar during slow scroll (header-under-header)', async ({
    page,
  }) => {
    // Fixed by Story 101.2.

    const viewport = page.locator(VIEWPORT_SELECTOR);
    const header = page.locator(HEADER_ROW_SELECTOR).first();
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await expect(header).toBeVisible({ timeout: 5000 });

    const snapshots = await captureSlowScrollFrames(page, viewport, header);
    const hiddenBehindBar = snapshots.filter(function isAboveViewport(
      snap: FrameSnapshot
    ) {
      return snap.viewportTop - snap.headerTop > PIXEL_TOLERANCE;
    });

    expect(
      hiddenBehindBar,
      `Open Positions header-under-header: ${hiddenBehindBar.length} frames hidden behind app bar. Fix in Story 101.2.`
    ).toHaveLength(0);
  });
});

// ─── Sold Positions ───────────────────────────────────────────────────────────

test.describe('Sold Positions — Round 7 slow-scroll sticky-header regression (Story 101.1)', () => {
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

  test('Sold Positions: sticky header does not drift down with content during slow scroll (header-scrolls-with-content)', async ({
    page,
  }) => {
    // Fixed by Story 101.2.

    const viewport = page.locator(VIEWPORT_SELECTOR);
    const header = page.locator(HEADER_ROW_SELECTOR).first();
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await expect(header).toBeVisible({ timeout: 5000 });

    const snapshots = await captureSlowScrollFrames(page, viewport, header);
    const driftingDown = snapshots.filter(function isDriftingDown(
      snap: FrameSnapshot
    ) {
      return snap.headerTop - snap.viewportTop > PIXEL_TOLERANCE;
    });

    expect(
      driftingDown,
      `Sold Positions header-scrolls-with-content: ${driftingDown.length} frames with drift >${PIXEL_TOLERANCE}px. Fix in Story 101.2.`
    ).toHaveLength(0);
  });

  test('Sold Positions: sticky header does not slide behind app bar during slow scroll (header-under-header)', async ({
    page,
  }) => {
    // Fixed by Story 101.2.

    const viewport = page.locator(VIEWPORT_SELECTOR);
    const header = page.locator(HEADER_ROW_SELECTOR).first();
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await expect(header).toBeVisible({ timeout: 5000 });

    const snapshots = await captureSlowScrollFrames(page, viewport, header);
    const hiddenBehindBar = snapshots.filter(function isAboveViewport(
      snap: FrameSnapshot
    ) {
      return snap.viewportTop - snap.headerTop > PIXEL_TOLERANCE;
    });

    expect(
      hiddenBehindBar,
      `Sold Positions header-under-header: ${hiddenBehindBar.length} frames hidden behind app bar. Fix in Story 101.2.`
    ).toHaveLength(0);
  });
});

// ─── Dividend Deposits ────────────────────────────────────────────────────────

test.describe('Dividend Deposits — Round 7 slow-scroll sticky-header regression (Story 101.1)', () => {
  let cleanup: () => Promise<void>;
  let accountId: string;

  test.beforeAll(async () => {
    const seeder = await seedScrollDivDepositsWithSymbolsData();
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
    await page.goto(`/account/${accountId}/div-dep`);
    await expect(page.locator('dms-base-table')).toBeVisible({
      timeout: 15000,
    });
    await page.waitForSelector(ROW_SELECTOR, { timeout: 15000 });
  });

  test('Dividend Deposits: sticky header does not drift down with content during slow scroll (header-scrolls-with-content)', async ({
    page,
  }) => {
    // Fixed by Story 101.2.

    const viewport = page.locator(VIEWPORT_SELECTOR);
    const header = page.locator(HEADER_ROW_SELECTOR).first();
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await expect(header).toBeVisible({ timeout: 5000 });

    const snapshots = await captureSlowScrollFrames(page, viewport, header);
    const driftingDown = snapshots.filter(function isDriftingDown(
      snap: FrameSnapshot
    ) {
      return snap.headerTop - snap.viewportTop > PIXEL_TOLERANCE;
    });

    expect(
      driftingDown,
      `Dividend Deposits header-scrolls-with-content: ${driftingDown.length} frames with drift >${PIXEL_TOLERANCE}px. Fix in Story 101.2.`
    ).toHaveLength(0);
  });

  test('Dividend Deposits: sticky header does not slide behind app bar during slow scroll (header-under-header)', async ({
    page,
  }) => {
    // Fixed by Story 101.2.

    const viewport = page.locator(VIEWPORT_SELECTOR);
    const header = page.locator(HEADER_ROW_SELECTOR).first();
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await expect(header).toBeVisible({ timeout: 5000 });

    const snapshots = await captureSlowScrollFrames(page, viewport, header);
    const hiddenBehindBar = snapshots.filter(function isAboveViewport(
      snap: FrameSnapshot
    ) {
      return snap.viewportTop - snap.headerTop > PIXEL_TOLERANCE;
    });

    expect(
      hiddenBehindBar,
      `Dividend Deposits header-under-header: ${hiddenBehindBar.length} frames hidden behind app bar. Fix in Story 101.2.`
    ).toHaveLength(0);
  });
});

// ─── Screener ─────────────────────────────────────────────────────────────────

test.describe('Screener — Round 7 slow-scroll sticky-header regression (Story 101.1)', () => {
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

  test('Screener: sticky header does not drift down with content during slow scroll (header-scrolls-with-content)', async ({
    page,
  }) => {
    // Fixed by Story 101.2.
    // Note: Screener was confirmed as a dms-base-table host via
    //   grep -rn "cdk-virtual-scroll-viewport" apps/dms-material/src
    // It was not explicitly listed in the Epic 101 story scope but is a
    // CDK virtual-scroll host and must be covered per AC #1.

    const viewport = page.locator(VIEWPORT_SELECTOR);
    const header = page.locator(HEADER_ROW_SELECTOR).first();
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await expect(header).toBeVisible({ timeout: 5000 });

    const snapshots = await captureSlowScrollFrames(page, viewport, header);
    const driftingDown = snapshots.filter(function isDriftingDown(
      snap: FrameSnapshot
    ) {
      return snap.headerTop - snap.viewportTop > PIXEL_TOLERANCE;
    });

    expect(
      driftingDown,
      `Screener header-scrolls-with-content: ${driftingDown.length} frames with drift >${PIXEL_TOLERANCE}px. Fix in Story 101.2.`
    ).toHaveLength(0);
  });

  test('Screener: sticky header does not slide behind app bar during slow scroll (header-under-header)', async ({
    page,
  }) => {
    // Fixed by Story 101.2.

    const viewport = page.locator(VIEWPORT_SELECTOR);
    const header = page.locator(HEADER_ROW_SELECTOR).first();
    await expect(viewport).toBeVisible({ timeout: 10000 });
    await expect(header).toBeVisible({ timeout: 5000 });

    const snapshots = await captureSlowScrollFrames(page, viewport, header);
    const hiddenBehindBar = snapshots.filter(function isAboveViewport(
      snap: FrameSnapshot
    ) {
      return snap.viewportTop - snap.headerTop > PIXEL_TOLERANCE;
    });

    expect(
      hiddenBehindBar,
      `Screener header-under-header: ${hiddenBehindBar.length} frames hidden behind app bar. Fix in Story 101.2.`
    ).toHaveLength(0);
  });
});

// ─── Flicker (skipped — assertion pattern requires live-app frame observation) ─

test.describe.skip(
  'Round 7 Flicker — row position jitter during slow scroll (Story 101.1)',
  () => {
    // TODO Story 101.2: implement flicker detection.
    //
    // Flicker definition (per Epic 101 story): no two consecutive frames where
    // the SAME row's getBoundingClientRect().top changes by more than one scroll
    // step (SLOW_SCROLL_STEP_PX) AND then reverts in the next frame.
    //
    // The assertion requires capturing per-row Y positions on each frame and
    // comparing consecutive deltas. This pattern needs live-app observation to
    // calibrate: is the jitter 1 frame (16ms) or multiple? Does it always revert
    // or sometimes leave the row displaced? Until confirmed, the assertion risks
    // false-negatives (misses flicker) or false-positives (noise from sub-pixel
    // rounding) if written without observational data.
    //
    // Placeholder tests are SKIPPED (test.describe.skip) until Story 101.2
    // runs the live-app sequence and measures actual frame deltas.
    //
    // Provisional assertion structure (for Story 101.2 to refine):
    //
    //   interface RowFrameSnapshot { rowIndex: number; top: number; }
    //   const rowSnapshots: RowFrameSnapshot[][] = [];
    //   // capture rowSnapshots[frame][rowIndex].top for each frame
    //   // then:
    //   for (let f = 1; f < rowSnapshots.length - 1; f++) {
    //     for (const row of rowSnapshots[f]) {
    //       const prev = rowSnapshots[f - 1].find(r => r.rowIndex === row.rowIndex);
    //       const next = rowSnapshots[f + 1].find(r => r.rowIndex === row.rowIndex);
    //       if (!prev || !next) continue;
    //       const jumpThisFrame = Math.abs(row.top - prev.top);
    //       const revertNextFrame = Math.abs(next.top - row.top);
    //       // Flicker: large jump then revert
    //       if (jumpThisFrame > ROW_HEIGHT_PX / 2 && revertNextFrame > ROW_HEIGHT_PX / 2) {
    //         flickerEvents.push({ frame: f, rowIndex: row.rowIndex, jump: jumpThisFrame });
    //       }
    //     }
    //   }
    //   expect(flickerEvents).toHaveLength(0);

    test('Universe: no row flicker during slow scroll', async ({ page }) => {
      // Placeholder — skipped. See describe block comment.
      await page.goto('/global/universe');
    });

    test('Open Positions: no row flicker during slow scroll', async ({
      page,
    }) => {
      // Placeholder — skipped. See describe block comment.
      await page.goto('/global/universe');
    });
  }
);
