/**
 * Story 101.3: Slow-Scroll Frame Capture Helper
 *
 * Drives programmatic slow scrolling inside the browser using
 * `requestAnimationFrame` so every intermediate layout frame is captured.
 * This is the key mechanism that makes the Round 7 regression suite different
 * from all prior scrolling suites (Epics 29, 31, 44, 60, 64, 87):
 *
 *   • Fast jump-to-bottom (old suites) gives the browser a full repaint cycle
 *     to recompute sticky positions — the artifact is invisible after the jump.
 *   • The 8px/RAF pattern keeps the sticky resolver perpetually behind the
 *     scroll stream, surfacing the per-frame position drift that the existing
 *     suites do not catch.
 *
 * Scroll and rect capture happen atomically inside a single `page.evaluate`
 * call (one cross-process roundtrip per scroll sequence, not per frame),
 * eliminating Playwright's IPC latency as a source of measurement noise.
 */

import type { Page } from 'playwright/test';

// ─── Internal Types (derived by callers via ReturnType) ────────────────────────

/**
 * Per-row position snapshot captured on a single animation frame.
 * `rowIndex` is the DOM order among all matched rows visible in the frame.
 */
interface RowSnapshot {
  rowIndex: number;
  top: number;
}

/** One sample captured per `requestAnimationFrame` during a slow scroll. */
interface FrameSample {
  /** Milliseconds elapsed since scroll start. */
  t: number;
  /** `getBoundingClientRect().top` of the measured sticky element. */
  headerTop: number;
  /** `getBoundingClientRect().bottom` of the parent (app-chrome) header. */
  parentBottom: number;
  /** `getBoundingClientRect().top` of the CDK virtual-scroll viewport. */
  viewportTop: number;
  /** `scrollTop` of the CDK virtual-scroll viewport at this frame. */
  scrollTop: number;
  /**
   * Per-row tops captured this frame (only present when `rowSelector` is
   * passed to `slowScrollToBottom`).
   */
  rows?: RowSnapshot[];
}

// ─── Internal Types ────────────────────────────────────────────────────────────

interface ScrollEvalArg {
  containerSel: string;
  headerSel: string;
  parentSel: string;
  scrollMs: number;
  stepPx: number;
  /** Optional selector for row elements — enables flicker-frame capture. */
  rowSel?: string;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Scroll the CDK virtual-scroll viewport slowly toward the bottom, capturing
 * `{t, headerTop, parentBottom, viewportTop, scrollTop}` on every animation
 * frame. Returns all captured frames for offline assertion.
 *
 * Pass `rowSelector` to also capture per-row tops on every frame (needed for
 * the AC2 flicker assertion in Story 105.3).
 *
 * The entire scroll+capture sequence runs inside a single `page.evaluate`
 * call using `requestAnimationFrame` so the browser layout engine is
 * exercised between every scroll step.
 */
export async function slowScrollToBottom(
  page: Page,
  config: {
    containerSelector: string;
    headerSelector: string;
    parentHeaderSelector: string;
    options?: { stepPx?: number; scrollMs?: number };
    /** Optional — when provided each `FrameSample.rows` will be populated. */
    rowSelector?: string;
  }
): Promise<FrameSample[]> {
  const {
    containerSelector,
    headerSelector,
    parentHeaderSelector,
    options = {},
    rowSelector,
  } = config;
  return runSlowScroll(page, {
    containerSel: containerSelector,
    headerSel: headerSelector,
    parentSel: parentHeaderSelector,
    scrollMs: options.scrollMs ?? 4000,
    stepPx: options.stepPx ?? 8,
    rowSel: rowSelector,
  });
}

// ─── Internal Implementation ──────────────────────────────────────────────────

/**
 * Browser-side scroll-capture function serialised by page.evaluate.
 * Defined at module scope so runSlowScroll stays under max-lines-per-function.
 * All variables referenced here must be either parameters or browser globals.
 */
async function captureScrollFrames({
  containerSel,
  headerSel,
  parentSel,
  scrollMs,
  stepPx,
  rowSel,
}: ScrollEvalArg): Promise<FrameSample[]> {
  function getRowTops(): RowSnapshot[] | undefined {
    if (!rowSel) {
      return undefined;
    }
    return Array.from(document.querySelectorAll<HTMLElement>(rowSel)).map(
      function toSnapshot(el: HTMLElement, i: number): RowSnapshot {
        return { rowIndex: i, top: el.getBoundingClientRect().top };
      }
    );
  }
  // eslint-disable-next-line no-restricted-syntax -- requestAnimationFrame requires a Promise wrapper; no RxJS equivalent in a serialised browser-side evaluate callback
  return new Promise<FrameSample[]>(function runScrollSequence(resolve) {
    const out: FrameSample[] = [];
    const container = document.querySelector<HTMLElement>(containerSel)!;
    const header = document.querySelector<HTMLElement>(headerSel)!;
    const parent = document.querySelector<HTMLElement>(parentSel)!;

    if (!container || !header || !parent) {
      resolve(out);
      return;
    }

    const start = performance.now();

    function step(now: number): void {
      out.push({
        t: now - start,
        headerTop: header.getBoundingClientRect().top,
        parentBottom: parent.getBoundingClientRect().bottom,
        viewportTop: container.getBoundingClientRect().top,
        scrollTop: container.scrollTop,
        rows: getRowTops(),
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
}

async function runSlowScroll(
  page: Page,
  arg: ScrollEvalArg
): Promise<FrameSample[]> {
  return page.evaluate<FrameSample[], ScrollEvalArg>(captureScrollFrames, arg);
}
