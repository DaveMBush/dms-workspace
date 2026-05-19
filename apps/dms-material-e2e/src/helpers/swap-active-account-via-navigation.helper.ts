import { expect, type Page } from 'playwright/test';

/** Selector for any visible data row inside a mat-table. */
const ROW_SELECTOR = 'tr.mat-mdc-row';

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
  await expect(page.locator(ROW_SELECTOR).first()).toBeVisible({
    timeout: 15000,
  });
}
