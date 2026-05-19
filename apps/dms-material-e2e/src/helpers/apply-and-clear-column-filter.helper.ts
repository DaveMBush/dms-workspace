import { expect, type Page } from 'playwright/test';

/** Selector for any visible data row inside a mat-table. */
const ROW_SELECTOR = 'tr.mat-mdc-row';

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
  const { columnSelector, filterValue, rowSelector = ROW_SELECTOR } = options;
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
