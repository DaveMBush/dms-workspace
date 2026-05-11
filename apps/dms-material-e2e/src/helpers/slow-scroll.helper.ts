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

// ─── Public Types ─────────────────────────────────────────────────────────────

/**
 * Per-frame snapshot captured during a slow-scroll sequence.
 * All coordinates are in CSS pixels relative to the viewport (screen Y).
 */
export interface FrameSample {
  /** Milliseconds elapsed since scroll start. */
  t: number;
  /**
   * `getBoundingClientRect().top` of the measured sticky element.
   * By default this is the first `th.mat-mdc-header-cell` — the actual element
   * that Angular Material makes sticky (not the `<tr>` parent, whose
   * getBoundingClientRect returns the table-layout flow position).
   */
  headerTop: number;
  /** `getBoundingClientRect().bottom` of the parent (app-chrome) header (`mat-toolbar`). */
  parentBottom: number;
  /** `getBoundingClientRect().top` of the CDK virtual-scroll viewport container. */
  viewportTop: number;
  /** `scrollTop` of the CDK virtual-scroll viewport container at this frame. */
  scrollTop: number;
}

export interface SlowScrollOptions {
  /**
   * Pixels to advance `scrollTop` on each animation frame.
   * Default: 8px — fine-grained enough to expose the Round 7 sticky drift
   * without becoming too slow to run in CI.
   */
  stepPx?: number;
  /**
   * Total duration (ms) of the scroll sequence driven by `requestAnimationFrame`.
   * Default: 4000ms (≈250 frames at 60fps × 8px = 2000px scroll distance).
   */
  scrollMs?: number;
}

// ─── Internal evaluate-arg type ───────────────────────────────────────────────

interface ScrollEvalArg {
  containerSel: string;
  headerSel: string;
  parentSel: string;
  scrollMs: number;
  stepPx: number;
  direction: 'down' | 'up';
}

// ─── Slow Scroll Drivers ──────────────────────────────────────────────────────

/**
 * Scroll the CDK virtual-scroll viewport slowly toward the bottom,
 * capturing `{t, headerTop, parentBottom, viewportTop, scrollTop}` on every
 * animation frame. Returns all captured frames for offline assertion.
 *
 * The entire scroll+capture sequence runs inside a single `page.evaluate` call
 * (one Playwright IPC roundtrip) using `requestAnimationFrame` so the browser
 * layout engine is exercised between every scroll step.
 */
export async function slowScrollToBottom(
  page: Page,
  containerSelector: string,
  headerSelector: string,
  parentHeaderSelector: string,
  options: SlowScrollOptions = {}
): Promise<FrameSample[]> {
  return runSlowScroll(page, {
    containerSel: containerSelector,
    headerSel: headerSelector,
    parentSel: parentHeaderSelector,
    scrollMs: options.scrollMs ?? 4000,
    stepPx: options.stepPx ?? 8,
    direction: 'down',
  });
}

/**
 * Scroll the CDK virtual-scroll viewport slowly toward the top,
 * capturing frames as `slowScrollToBottom` does.
 */
export async function slowScrollToTop(
  page: Page,
  containerSelector: string,
  headerSelector: string,
  parentHeaderSelector: string,
  options: SlowScrollOptions = {}
): Promise<FrameSample[]> {
  return runSlowScroll(page, {
    containerSel: containerSelector,
    headerSel: headerSelector,
    parentSel: parentHeaderSelector,
    scrollMs: options.scrollMs ?? 4000,
    stepPx: options.stepPx ?? 8,
    direction: 'up',
  });
}

// ─── Internal Implementation ──────────────────────────────────────────────────

async function runSlowScroll(
  page: Page,
  arg: ScrollEvalArg
): Promise<FrameSample[]> {
  return page.evaluate<FrameSample[], ScrollEvalArg>(
    function captureScrollFrames({
      containerSel,
      headerSel,
      parentSel,
      scrollMs,
      stepPx,
      direction,
    }): Promise<FrameSample[]> {
      return new Promise<FrameSample[]>(function runScrollSequence(resolve) {
        const out: FrameSample[] = [];
        const container = document.querySelector(containerSel) as HTMLElement;
        const header = document.querySelector(headerSel) as HTMLElement;
        const parent = document.querySelector(parentSel) as HTMLElement;

        if (!container || !header || !parent) {
          resolve(out);
          return;
        }

        const start = performance.now();
        const delta = direction === 'down' ? stepPx : -stepPx;

        function step(now: number): void {
          const headerRect = header.getBoundingClientRect();
          const parentRect = parent.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();

          out.push({
            t: now - start,
            headerTop: headerRect.top,
            parentBottom: parentRect.bottom,
            viewportTop: containerRect.top,
            scrollTop: container.scrollTop,
          });

          if (now - start < scrollMs) {
            container.scrollTop += delta;
            requestAnimationFrame(step);
          } else {
            resolve(out);
          }
        }

        requestAnimationFrame(step);
      });
    },
    arg
  );
}
