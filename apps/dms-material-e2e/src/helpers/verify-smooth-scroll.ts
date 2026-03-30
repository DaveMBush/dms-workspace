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
    await page.waitForTimeout(50);

    const curr = await el.evaluate(function getCurrentScrollTop(
      node: Element
    ): number {
      return node.scrollTop;
    });

    if (curr < prev) {
      throw new Error(
        `Scroll position decreased: ${prev} -> ${curr} (step ${i})`
      );
    }
    prev = curr;
  }

  return prev;
}
