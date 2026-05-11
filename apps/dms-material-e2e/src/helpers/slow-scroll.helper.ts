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

// ─── Internal Types ────────────────────────────────────────────────────────────

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
}

interface ScrollEvalArg {
  containerSel: string;
  headerSel: string;
  parentSel: string;
  scrollMs: number;
  stepPx: number;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Scroll the CDK virtual-scroll viewport slowly toward the bottom, capturing
 * `{t, headerTop, parentBottom, viewportTop, scrollTop}` on every animation
 * frame. Returns all captured frames for offline assertion.
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
  }
): Promise<FrameSample[]> {
  const { containerSelector, headerSelector, parentHeaderSelector, options = {} } = config;
  return runSlowScroll(page, {
    containerSel: containerSelector,
    headerSel: headerSelector,
    parentSel: parentHeaderSelector,
    scrollMs: options.scrollMs ?? 4000,
    stepPx: options.stepPx ?? 8,
  });
}

// ─── Internal Implementation ──────────────────────────────────────────────────

async function runSlowScroll(
  page: Page,
  arg: ScrollEvalArg
): Promise<FrameSample[]> {
  return page.evaluate<FrameSample[], ScrollEvalArg>(
    async function captureScrollFrames({
      containerSel,
      headerSel,
      parentSel,
      scrollMs,
      stepPx,
    }): Promise<FrameSample[]> {
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
    arg
  );
}
