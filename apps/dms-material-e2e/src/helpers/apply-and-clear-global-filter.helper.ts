import { expect, type Page } from 'playwright/test';

/** Selector for any visible data row inside a mat-table. */
const ROW_SELECTOR = 'tr.mat-mdc-row';

/** Selector for mat-option elements in the Angular Material overlay. */
const MAT_OPTION_SELECTOR = 'mat-option';

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
  await page
    .locator(MAT_OPTION_SELECTOR)
    .filter({ hasText: applyOptionText })
    .first()
    .click();
  // Wait for the mat-select to reflect the chosen value before re-opening
  await expect(select).toContainText(applyOptionText, { timeout: 5000 });
  // Clear the filter (restore full dataset)
  await select.click();
  await page
    .locator(MAT_OPTION_SELECTOR)
    .filter({ hasText: clearOptionText })
    .first()
    .click();
  await expect(page.locator(rowSelector).first()).toBeVisible({
    timeout: 10000,
  });
}
