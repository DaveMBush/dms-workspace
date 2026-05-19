import { expect, type Page } from 'playwright/test';

/**
 * context-change.helper.ts — Round 8 (Epic 105)
 *
 * Reusable helpers that perform the two categories of in-place context-change
 * exercised by the Round-8 scrolling-regression-105 suite:
 *
 *   Account swap  — changes the active account without destroying CDK viewport.
 *   Filter change — applies then clears a column or global filter so the CDK
 *                   processes two consecutive data-array replacements.
 *
 * Each helper waits for the table to settle (via expect / toBeVisible) rather
 * than using page.waitForTimeout(), keeping the suite deterministic.
 */

/** Selector for any visible data row inside a mat-table. */
const ROW_SELECTOR = 'tr.mat-mdc-row';

// ─── Account-swap helpers ─────────────────────────────────────────────────────

interface UniverseSwapOptions {
  /** Selector for the account mat-select control. Default: '.account-select mat-select'. */
  accountSelectSelector?: string;
  /** Zero-based index of the mat-option to select. Default: 1 (first real account). */
  optionIndex?: number;
}

/**
 * Swaps the active account on the Universe screen via the toolbar mat-select.
 * Clicks the select, picks `optionIndex` (default 1 = first account entry,
 * index 0 = "All Accounts"), then waits for at least one data row to appear.
 *
 * Used by: Universe — account-change describe block.
 */
export async function swapUniverseAccount(
  page: Page,
  options: UniverseSwapOptions = {}
): Promise<void> {
  const {
    accountSelectSelector = '.account-select mat-select',
    optionIndex = 1,
  } = options;
  const accountSelect = page.locator(accountSelectSelector);
  await accountSelect.click();
  await page.locator('mat-option').nth(optionIndex).click();
  await expect(page.locator(ROW_SELECTOR).first()).toBeVisible({
    timeout: 10000,
  });
}

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

// ─── Filter-change helpers ────────────────────────────────────────────────────

interface ColumnFilterOptions {
  /** Playwright selector for the column filter input element. */
  columnSelector: string;
  /** Value to type into the filter input. */
  filterValue: string;
  /** Selector for rows used to confirm data has refreshed. Default: ROW_SELECTOR. */
  rowSelector?: string;
}

/**
 * Applies a column filter by filling `filterValue` into the input identified
 * by `columnSelector`, waits for the table to reflect the filtered dataset,
 * then clears the filter and waits for the full dataset to be restored.
 *
 * Both the apply and clear steps use `expect(...).toBeVisible()` instead of
 * `page.waitForTimeout()` to avoid false-positive passes on slow machines.
 *
 * Used by: Universe (symbol column), Open Positions (symbol search),
 *           Sold Positions (symbol search) — filter-change blocks.
 */
export async function applyAndClearColumnFilter(
  page: Page,
  options: ColumnFilterOptions
): Promise<void> {
  const {
    columnSelector,
    filterValue,
    rowSelector = ROW_SELECTOR,
  } = options;
  const filterInput = page.locator(columnSelector).first();
  await filterInput.click();
  await filterInput.fill(filterValue);
  // Wait for CDK to process the new filtered data array
  await expect(page.locator(rowSelector).first()).toBeVisible({
    timeout: 10000,
  });
  // Clear the filter so CDK processes the restored full array
  await filterInput.clear();
  await expect(page.locator(rowSelector).first()).toBeVisible({
    timeout: 10000,
  });
}

interface GlobalFilterOptions {
  /** Playwright selector for the mat-select filter control. */
  filterSelector: string;
  /** Text of the mat-option that applies the filter (e.g. 'Income'). */
  applyOptionText: string;
  /** Text of the mat-option that clears the filter (e.g. 'All'). */
  clearOptionText: string;
  /** Selector for rows used to confirm data has been restored. Default: ROW_SELECTOR. */
  rowSelector?: string;
}

/**
 * Applies a mat-select based global filter then clears it.
 *
 * Flow:
 *   1. Click the select → pick `applyOptionText` → wait for select to reflect value.
 *   2. Click the select again → pick `clearOptionText` → wait for rows to reappear.
 *
 * The wait in step 1 (`toContainText`) replaces the page.waitForTimeout() that
 * was in the original inline code, making the step deterministic.
 *
 * Used by: Screener — filter-change (risk group) block.
 */
export async function applyAndClearGlobalFilter(
  page: Page,
  options: GlobalFilterOptions
): Promise<void> {
  const {
    filterSelector,
    applyOptionText,
    clearOptionText,
    rowSelector = ROW_SELECTOR,
  } = options;
  const select = page.locator(filterSelector);
  // Apply the filter
  await select.click();
  await page.locator('mat-option').filter({ hasText: applyOptionText }).first().click();
  // Wait for the mat-select to reflect the chosen value before re-opening
  await expect(select).toContainText(applyOptionText, { timeout: 5000 });
  // Clear the filter (restore full dataset)
  await select.click();
  await page.locator('mat-option').filter({ hasText: clearOptionText }).first().click();
  await expect(page.locator(rowSelector).first()).toBeVisible({
    timeout: 10000,
  });
}
