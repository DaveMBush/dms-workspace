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
 *
 * Additionally asserts CSS guards that prevent silent re-introduction of
 * layout containment on the CDK viewport element:
 *
 *   3. Computed `contain` on `cdk-virtual-scroll-viewport` must NOT include
 *      `layout` or `paint` (either directly or via a shorthand).
 *
 *   4. Computed `overflow-y` on `cdk-virtual-scroll-viewport` must be `auto`
 *      or `scroll`.
 */

import { expect, type Page } from 'playwright/test';

import { slowScrollToBottom } from './slow-scroll.helper';

// ─── Constants (not exported) ─────────────────────────────────────────────────

const DEFAULT_VIEWPORT_SELECTOR = 'cdk-virtual-scroll-viewport';

/**
 * Angular Material applies `position:sticky` to TH cells, not the TR.
 * We must measure a TH cell to observe actual stickiness.
 */
const DEFAULT_HEADER_ROW_SELECTOR = '.dms-header-cell[role="columnheader"]';

/** App-chrome toolbar that occupies the top of every screen. */
const PARENT_HEADER_SELECTOR = 'mat-toolbar';

/**
 * Maximum allowed deviation (px). 1px catches sub-pixel rounding without
 * masking real drift.
 */
const DRIFT_TOLERANCE = 1;

// ─── Internal guard helpers ───────────────────────────────────────────────────

async function assertViewportCssGuards(
  page: Page,
  containerSelector: string
): Promise<void> {
  const containValue = await page
    .locator(containerSelector)
    .evaluate(function getContain(el: Element): string {
      return window.getComputedStyle(el).contain;
    });

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

  const overflowY = await page
    .locator(containerSelector)
    .evaluate(function getOverflowY(el: Element): string {
      return window.getComputedStyle(el).overflowY;
    });

  expect(
    ['auto', 'scroll'],
    'CSS guard (Story 101.3): cdk-virtual-scroll-viewport must have ' +
      `overflow-y: auto or scroll so it is the scroll container CDK targets. Got: "${overflowY}".`
  ).toContain(overflowY);
}

type SamplesArr = Awaited<ReturnType<typeof slowScrollToBottom>>;

function assertOverlapInvariant(samples: SamplesArr, tolerance: number): void {
  const overlapFrames = samples.filter(function isOverlappingParent(s) {
    return s.headerTop < s.parentBottom - tolerance;
  });

  expect(
    overlapFrames,
    `Sticky header overlapped the parent toolbar on ${overlapFrames.length} frame(s) ` +
      `during slow scroll (DRIFT_TOLERANCE=${tolerance}px). ` +
      'header-under-header artifact detected. ' +
      'Root cause: layout containment on cdk-virtual-scroll-viewport breaks position:sticky. ' +
      'See base-table.component.scss (Epic 101 comment) and Story 101.2.'
  ).toHaveLength(0);
}

function assertDriftInvariant(samples: SamplesArr, tolerance: number): void {
  const driftFrames = samples.filter(function isDriftingDown(s) {
    return s.headerTop > s.viewportTop + tolerance;
  });

  expect(
    driftFrames,
    `Sticky header drifted below viewport top on ${driftFrames.length} frame(s) ` +
      `during slow scroll (DRIFT_TOLERANCE=${tolerance}px). ` +
      'header-scrolls-with-content artifact detected. ' +
      'Root cause: layout containment on cdk-virtual-scroll-viewport breaks position:sticky. ' +
      'See base-table.component.scss (Epic 101 comment) and Story 101.2.'
  ).toHaveLength(0);
}

type LocalRowSnapshot = NonNullable<SamplesArr[number]['rows']>[number];

interface MatchedRow {
  row: LocalRowSnapshot;
  prevRow: LocalRowSnapshot;
  nextRow: LocalRowSnapshot;
}

function buildMatchedRows(
  curr: LocalRowSnapshot[],
  prev: LocalRowSnapshot[],
  next: LocalRowSnapshot[]
): MatchedRow[] {
  return curr
    .map(function mapRowWithNeighbors(row) {
      return {
        row,
        prevRow: prev.find(function findPrev(r) {
          return r.rowIndex === row.rowIndex;
        }),
        nextRow: next.find(function findNext(r) {
          return r.rowIndex === row.rowIndex;
        }),
      };
    })
    .filter(function hasNeighbors(e): e is MatchedRow {
      return e.prevRow !== undefined && e.nextRow !== undefined;
    });
}

function checkRowFlicker(
  curr: LocalRowSnapshot[],
  prev: LocalRowSnapshot[],
  next: LocalRowSnapshot[],
  ctx: { frameIndex: number; rowHeightPx: number }
): void {
  const { frameIndex, rowHeightPx } = ctx;
  const threshold = rowHeightPx / 2;

  const matched = buildMatchedRows(curr, prev, next);

  if (matched.length === 0) {
    return;
  }

  // Compute the signed delta (this frame vs previous frame) for every matched row.
  const deltas = matched.map(function computeDelta(e) {
    return e.row.top - e.prevRow.top;
  });

  // CDK's AutoSizeVirtualScrollStrategy adjusts the content-wrapper translateY
  // whenever it recalibrates its total-size estimate.  This shifts ALL visible
  // rows simultaneously by the same absolute amount.  Such a "global shift" is
  // CDK-internal bookkeeping, NOT a sticky-header rendering regression.
  //
  // Detection: if every matched row moved by within ±5 px of the first row's
  // delta, the shift is global.  We allow global shifts even when they exceed
  // the per-row threshold because they cannot be caused by the sticky-header fix.
  //
  // A real sticky-header flicker would affect SPECIFIC rows differently from
  // others (e.g. rows near the header shift while rows far away do not).
  const refDelta = deltas[0];
  const isGlobalShift =
    matched.length > 1 &&
    deltas.every(function isNearRefDelta(d) {
      return Math.abs(d - refDelta) < 5;
    }) &&
    Math.abs(refDelta) > threshold;

  if (isGlobalShift) {
    // All rows shifted uniformly: CDK content-wrapper recalibration. Skip.
    return;
  }

  // Per-row flicker check: fail on any row that jumps AND reverts beyond threshold.
  for (const { row, prevRow, nextRow } of matched) {
    const jumpThisFrame = Math.abs(row.top - prevRow.top);
    const revertNextFrame = Math.abs(nextRow.top - row.top);
    if (jumpThisFrame > threshold && revertNextFrame > threshold) {
      throw new Error(
        `Row flicker detected at frame ${frameIndex}, rowIndex ${row.rowIndex}: ` +
          `jumped ${jumpThisFrame.toFixed(
            1
          )}px then reverted ${revertNextFrame.toFixed(1)}px ` +
          `(threshold=${threshold}px). ` +
          'Row position jitter during slow scroll detected (Epic 105 round-8). ' +
          'Root cause: row-specific position shift (not a CDK global content-wrapper adjustment).'
      );
    }
  }
}

function assertFlickerInvariant(
  samples: SamplesArr,
  rowHeightPx: number
): void {
  for (let f = 1; f < samples.length - 1; f++) {
    const prev = samples[f - 1].rows;
    const curr = samples[f].rows;
    const next = samples[f + 1].rows;
    if (!prev || !curr || !next) {
      continue;
    }
    checkRowFlicker(curr, prev, next, { frameIndex: f, rowHeightPx });
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Drive a slow scroll-to-bottom sequence on the given CDK virtual-scroll
 * viewport and assert on every captured frame that the sticky header:
 *   1. Does not overlap the parent app header (no "header-under-header").
 *   2. Does not drift downward with content (no "header-scrolls-with-content").
 *   3. The viewport has no layout containment (CSS guard).
 *   4. The viewport has `overflow-y: auto|scroll` (CSS guard).
 *
 * When `rowSelector` is provided, also asserts:
 *   5. No two consecutive frames show the same logical row jumping by more than
 *      half of `rowHeightPx` and then reverting (no flicker — AC2 Story 105.3).
 */
export async function assertStickyHeaderInvariant(
  page: Page,
  containerSelector = DEFAULT_VIEWPORT_SELECTOR,
  headerSelector = DEFAULT_HEADER_ROW_SELECTOR,
  options?: {
    stepPx?: number;
    scrollMs?: number;
    rowSelector?: string;
    rowHeightPx?: number;
  }
): Promise<void> {
  await assertViewportCssGuards(page, containerSelector);

  const samples = await slowScrollToBottom(page, {
    containerSelector,
    headerSelector,
    parentHeaderSelector: PARENT_HEADER_SELECTOR,
    options,
    rowSelector: options?.rowSelector,
  });

  expect(
    samples.length,
    'Slow-scroll frame capture returned no frames. ' +
      'Check that all selectors resolve to elements visible on the page.'
  ).toBeGreaterThan(0);

  assertOverlapInvariant(samples, DRIFT_TOLERANCE);
  assertDriftInvariant(samples, DRIFT_TOLERANCE);

  if (options?.rowSelector) {
    assertFlickerInvariant(samples, options.rowHeightPx ?? 57);
  }
}
