import { expect, type Page } from 'playwright/test';

/** Selector for any visible data row inside a mat-table. */
const ROW_SELECTOR = '.dms-body-row[role="row"]';

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
