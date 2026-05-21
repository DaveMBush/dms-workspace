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
 * Browser-side helper serialized into page.evaluate().
 * Polls for `text` among mat-option elements and clicks it when found.
 * Uses a polling loop because Angular Material may destroy/recreate options
 * during BaseTableComponent re-render; Playwright's locator.click() cannot
 * handle the detach-and-recreate cycle within its retry window.
 */
async function pollClearOption({
  text,
  timeout,
}: {
  text: string;
  timeout: number;
}): Promise<boolean> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const opt = Array.from(document.querySelectorAll('mat-option')).find(
      function findMatchingOption(el: Element): boolean {
        return (el as HTMLElement).textContent?.trim() === text;
      }
    ) as HTMLElement | undefined;
    if (opt?.isConnected) {
      opt.click();
      return true;
    }
    // eslint-disable-next-line no-restricted-syntax -- browser-side event-loop yield; RxJS unavailable in page.evaluate context
    await new Promise<void>(function scheduleResolve(r): void {
      setTimeout(r, 10);
    });
  }
  return false;
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
  // Angular Material's CDK overlay may destroy and recreate mat-options while the
  // BaseTableComponent re-renders after the data-context change (0 rows → CDK resets).
  // Playwright's locator.click() retries on "element detached", exhausting the action
  // timeout.  Instead, poll for the option and click it in a single synchronous
  // browser-side JS call — no Playwright retry, no window between find and click.
  const cleared = await page.evaluate(pollClearOption, {
    text: clearOptionText,
    timeout: 5000,
  });
  if (!cleared) {
    throw new Error(
      `mat-option '${clearOptionText}' not found or not connected within 5 s`
    );
  }
  await expect(page.locator(rowSelector).first()).toBeVisible({
    timeout: 10000,
  });
}
