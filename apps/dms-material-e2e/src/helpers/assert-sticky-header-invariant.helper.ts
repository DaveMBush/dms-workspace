/**
 * Story 101.3: Sticky-Header Invariant Assertion Helper
 *
 * Asserts the three geometric invariants that `position:sticky; top:0` must
 * satisfy on every CDK virtual-scroll table header during slow programmatic
 * scrolling:
 *
 *   1. No overlap with the parent (app-chrome) header:
 *        headerTop ≥ parentHeaderBottom − OVERLAP_TOLERANCE
 *      Violation = the sticky table header has slipped behind the mat-toolbar
 *      (the "header-under-header" Round 7 artifact).
 *
 *   2. No downward drift with scrolled content:
 *        headerTop ≤ viewportTop + DRIFT_TOLERANCE
 *      Violation = the sticky table header scrolled down with content rows
 *      instead of anchoring to the top of the CDK viewport
 *      (the "header-scrolls-with-content" Round 7 artifact).
 *      Note: when measuring TH cells (the default), CDK virtual scroll broken
 *      sticky manifests as header going ABOVE the viewport (Invariant 1), not
 *      downward. Invariant 2 guards against future overscroll/overshooting.
 *
 * Both invariants are derived from the CSS guarantee that
 * `position:sticky; top:0` inside a scroll container keeps the element
 * anchored to the scroll container's top edge. Epic 101 (Story 101.2)
 * removed `contain:paint` from `.virtual-scroll-viewport`, which — in
 * CSS Containment Level 2 browsers (Chrome 114+, Firefox 109+) — was
 * creating an independent formatting context that broke this guarantee.
 *
 * Additionally asserts a CSS guard that prevents silent re-introduction of
 * layout containment on the CDK viewport element:
 *
 *   3. Computed `contain` on `cdk-virtual-scroll-viewport` must NOT include
 *      `layout` or `paint` (either directly or via a shorthand). Adding
 *      either would re-introduce the Round 7 breakage in CSS Level 2 browsers.
 *
 *   4. Computed `overflow-y` on `cdk-virtual-scroll-viewport` must be `auto`
 *      or `scroll`. This confirms the element is the scroll container CDK
 *      virtual scroll expects.
 *
 * Tolerance rationale:
 *   1px on both checks — tighter than the 2px used in scrolling-regression-101
 *   to catch sub-pixel drift early. `getBoundingClientRect()` returns fractional
 *   pixels; 1px covers sub-pixel rounding without masking real drift.
 */

import { expect, type Page } from 'playwright/test';

import {
  slowScrollToBottom,
  type FrameSample,
  type SlowScrollOptions,
} from './slow-scroll.helper';

// ─── Default Selectors ────────────────────────────────────────────────────────

/** Shared CDK virtual-scroll viewport selector (all screens). */
export const DEFAULT_VIEWPORT_SELECTOR = 'cdk-virtual-scroll-viewport';

/**
 * Sticky table header CELL selector (inside base-table, all screens).
 *
 * Angular Material's `stickRows` (CDK table) applies `position: sticky` to
 * the TH CELLS (`Array.from(row.children)`) when the host is a native HTML
 * `<table>` element (`_isNativeHtmlTable === true`). The TR itself is NOT
 * sticky. `getBoundingClientRect()` on a `<tr>` returns the table-layout
 * flow position (which scrolls with content), NOT the visual sticky position
 * of its children. We must measure a TH cell to observe actual stickiness.
 */
export const DEFAULT_HEADER_ROW_SELECTOR = 'th.mat-mdc-header-cell';

/**
 * Parent (app-chrome) header selector.
 * The sticky table header must remain BELOW the bottom edge of this element.
 * `mat-toolbar` maps to the shell nav toolbar that occupies the top of every
 * screen in the application.
 */
export const DEFAULT_PARENT_HEADER_SELECTOR = 'mat-toolbar';

// ─── Tolerance ────────────────────────────────────────────────────────────────

/**
 * Maximum allowed deviation (px) between the sticky header's top edge and
 * either bound (parent header bottom or viewport top).
 * 1px catches sub-pixel rounding without masking real drift.
 */
const DRIFT_TOLERANCE = 1;

// ─── Public API ───────────────────────────────────────────────────────────────

export type StickyHeaderInvariantOptions = SlowScrollOptions;

/**
 * Drive a slow scroll-to-bottom sequence on the given CDK virtual-scroll
 * viewport and assert on every captured frame that:
 *
 *   1. The sticky table header does not overlap the parent app header
 *      (no "header-under-header" artifact).
 *   2. The sticky table header does not drift downward with content
 *      (no "header-scrolls-with-content" artifact).
 *   3. The CDK viewport element has no layout containment (`contain` CSS).
 *   4. The CDK viewport element has `overflow-y: auto|scroll`.
 *
 * Selector defaults match the application's shared base-table component
 * and shell layout. Override only if a screen uses a non-standard structure.
 *
 * @param page - Playwright Page object.
 * @param containerSelector - CDK virtual-scroll viewport selector.
 * @param headerSelector - Sticky table header row selector (first match used).
 * @param parentHeaderSelector - App-chrome header selector whose bottom edge
 *   the sticky header must stay below.
 * @param options - Optional scroll step/duration overrides.
 */
export async function assertStickyHeaderInvariant(
  page: Page,
  containerSelector = DEFAULT_VIEWPORT_SELECTOR,
  headerSelector = DEFAULT_HEADER_ROW_SELECTOR,
  parentHeaderSelector = DEFAULT_PARENT_HEADER_SELECTOR,
  options?: StickyHeaderInvariantOptions
): Promise<void> {
  // ── CSS guard: no layout containment on the viewport ────────────────────────
  //
  //   CDK's `.cdk-virtual-scrollable` class applies `contain: strict` to the
  //   viewport element — the `strict` shorthand is intentional by CDK and does
  //   not break position:sticky (verified in headless Chromium/Firefox).
  //   This guard catches only EXPLICIT additions of `layout` or `paint` keywords
  //   directly on the viewport element (e.g., someone re-adding `contain: paint`
  //   to `.virtual-scroll-viewport` in base-table.component.scss in a context
  //   where the computed value actually reflects that addition).

  const containValue = await page.locator(containerSelector).evaluate(
    function getContainStyle(el: Element): string {
      return window.getComputedStyle(el).contain;
    }
  );

  expect(
    containValue,
    'CSS guard (Story 101.3): cdk-virtual-scroll-viewport must not have ' +
      '`contain: layout` — layout containment creates an IFC that breaks ' +
      'position:sticky in CSS Containment Level 2 browsers (Chrome 114+, Firefox 109+). ' +
      'See base-table.component.scss SCROLLING REGRESSION HISTORY (Epic 101).'
  ).not.toMatch(/\blayout\b/);

  expect(
    containValue,
    'CSS guard (Story 101.3): cdk-virtual-scroll-viewport must not have ' +
      '`contain: paint` — in CSS Containment Level 2, contain:paint implies ' +
      'contain:layout. This was the root cause of the Round 7 scrolling artifacts ' +
      '(Epic 101, Story 101.2). Do not re-add contain:paint to .virtual-scroll-viewport.'
  ).not.toMatch(/\bpaint\b/);

  // ── CSS guard: viewport must be a scroll container ────────────────────────

  const overflowYValue = await page.locator(containerSelector).evaluate(
    function getOverflowY(el: Element): string {
      return window.getComputedStyle(el).overflowY;
    }
  );

  expect(
    ['auto', 'scroll'],
    'CSS guard (Story 101.3): cdk-virtual-scroll-viewport must have ' +
      'overflow-y: auto or scroll so it is the scroll container CDK targets. ' +
      `Got: "${overflowYValue}".`
  ).toContain(overflowYValue);

  // ── Slow-scroll frame capture ─────────────────────────────────────────────

  const samples = await slowScrollToBottom(
    page,
    containerSelector,
    headerSelector,
    parentHeaderSelector,
    options
  );

  expect(
    samples.length,
    'Slow-scroll frame capture returned no frames. ' +
      'Check that all selectors resolve to elements visible on the page.'
  ).toBeGreaterThan(0);

  // ── Invariant 1: no header-under-parent-header overlap ────────────────────
  //
  //   If the sticky table header slides ABOVE the bottom edge of the parent
  //   app-chrome header, it is hidden behind it — the Round 7 "header-under-
  //   header" artifact.
  //
  //   Assertion: headerTop ≥ parentBottom − DRIFT_TOLERANCE (on every frame)

  const overlapFrames = samples.filter(function isOverlappingParent(
    s: FrameSample
  ): boolean {
    return s.headerTop < s.parentBottom - DRIFT_TOLERANCE;
  });

  expect(
    overlapFrames,
    `Sticky header overlapped the parent toolbar on ${overlapFrames.length} frame(s) ` +
      `during slow scroll (DRIFT_TOLERANCE=${DRIFT_TOLERANCE}px). ` +
      'header-under-header artifact detected. ' +
      'Root cause: layout containment on cdk-virtual-scroll-viewport breaks position:sticky. ' +
      'See base-table.component.scss (Epic 101 comment) and Story 101.2.'
  ).toHaveLength(0);

  // ── Invariant 2: no downward drift with scrolled content ──────────────────
  //
  //   If the sticky header scrolls DOWNWARD with content rows (i.e. its top
  //   edge moves below the viewport top), the "header-scrolls-with-content"
  //   artifact is active.
  //
  //   Assertion: headerTop ≤ viewportTop + DRIFT_TOLERANCE (on every frame)

  const driftFrames = samples.filter(function isDriftingDown(
    s: FrameSample
  ): boolean {
    return s.headerTop > s.viewportTop + DRIFT_TOLERANCE;
  });

  expect(
    driftFrames,
    `Sticky header drifted below viewport top on ${driftFrames.length} frame(s) ` +
      `during slow scroll (DRIFT_TOLERANCE=${DRIFT_TOLERANCE}px). ` +
      'header-scrolls-with-content artifact detected. ' +
      'Root cause: layout containment on cdk-virtual-scroll-viewport breaks position:sticky. ' +
      'See base-table.component.scss (Epic 101 comment) and Story 101.2.'
  ).toHaveLength(0);
}
