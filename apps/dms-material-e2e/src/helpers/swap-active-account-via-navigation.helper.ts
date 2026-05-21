import { type Page } from 'playwright/test';

interface RouteNavigationOptions {
  /** Account ID to navigate to. */
  toAccountId: string;
  /** Route suffix after the account ID (e.g. 'open', 'sold', 'div-dep'). */
  routeSuffix: string;
}

/**
 * Navigates to `/account/{toAccountId}/{routeSuffix}` to swap the active
 * account on account-panel screens (Open Positions, Sold Positions,
 * Dividend Deposits).
 *
 * AccountPanelComponent is reused by the router (same routeConfig reference),
 * so the CDK viewport stays in the DOM and receives the new account's data
 * as an in-place array replacement.
 *
 * Used by: Open Positions, Sold Positions, Dividend Deposits — account-change blocks.
 */
export async function swapActiveAccountViaNavigation(
  page: Page,
  options: RouteNavigationOptions
): Promise<void> {
  const { toAccountId, routeSuffix } = options;
  await page.goto(`/account/${toAccountId}/${routeSuffix}`);
  // Step 1: Wait for CDK virtual scroll viewport to appear.
  // Step 2: Allow 2 s for CDK to measure the viewport height and render initial rows
  //         (Firefox needs this pause — CDK measures height asynchronously via
  //         ResizeObserver / requestAnimationFrame after the element enters the DOM).
  //         4 s is the observed upper bound for CDK height-recalculation to complete
  //         after a data-context change (Universe account-change detected row flicker
  //         at ~3.4 s after CDK viewport first appeared with a 2 s settle time).
  //         Increasing to 4 s ensures CDK has fully settled before Pass 2 scroll begins.
  await page.waitForSelector('cdk-virtual-scroll-viewport', { timeout: 30000 });
  await page.waitForTimeout(4000);
}
