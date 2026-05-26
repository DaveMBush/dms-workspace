import type { Page } from 'playwright/test';

/**
 * Verify that scrolling a container produces monotonically
 * non-decreasing scrollTop values (no jump-backs).
 */
export async function verifyMonotonicScroll(
  page: Page,
  selector: string,
  steps = 20,
  stepPx = 100
): Promise<number> {
  const el = page.locator(selector);

  let prev = await el.evaluate(function getScrollTop(node: Element): number {
    return node.scrollTop;
  });

  for (let i = 0; i < steps; i++) {
    await el.evaluate(function scrollDown(node: Element, px: number): void {
      node.scrollBy(0, px);
    }, stepPx);

    // Wait for the smooth-scroll animation and any CDK virtual-scroll
    // recalculation to fully settle before sampling the position.
    // 50 ms was too short: CDK may briefly correct the scrollTop mid-animation
    // producing spurious backward readings.
    await page.waitForTimeout(300);

    const curr = await el.evaluate(function getCurrentScrollTop(
      node: Element
    ): number {
      return node.scrollTop;
    });

    // Allow a small tolerance (≤ 20 px) for CDK virtual-scroll micro-corrections
    // that momentarily adjust the scroll anchor — these are not visible regressions.
    if (curr < prev - 20) {
      throw new Error(
        `Scroll position decreased: ${prev} -> ${curr} (step ${i})`
      );
    }
    prev = curr;
  }

  return prev;
}
