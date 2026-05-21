import { type Page } from 'playwright/test';

interface ColumnFilterOptions {
  /** Playwright selector for the column filter input element. */
  columnSelector: string;
  /** Value to type into the filter input. */
  filterValue: string;
}

/**
 * Applies a column filter by filling `filterValue` into the input identified
 * by `columnSelector`, waits for the table to reflect the filtered dataset,
 * then clears the filter and waits for the full dataset to be restored.
 *
 * Both the apply and clear steps use a fixed `waitForTimeout` to give CDK
 * virtual scroll time to process the data array in both Chromium and Firefox.
 *
 * Used by: Universe (symbol column), Open Positions (symbol search),
 *           Sold Positions (symbol search) — filter-change blocks.
 */
export async function applyAndClearColumnFilter(
  page: Page,
  options: ColumnFilterOptions
): Promise<void> {
  const { columnSelector, filterValue } = options;
  const filterInput = page.locator(columnSelector).first();
  await filterInput.click();
  await filterInput.fill(filterValue);
  // Wait for CDK to process the new filtered data array.
  // Fixed timeout is used instead of tr.mat-mdc-row visibility check because
  // Firefox CDK virtual scroll may not render rows in the viewport within the
  // shorter timeout window (consistent with navigateAndWaitForTable pattern).
  await page.waitForTimeout(2000);
  // Clear the filter so CDK processes the restored full array
  await filterInput.clear();
  await page.waitForTimeout(2000);
}
