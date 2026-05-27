import { expect, Page } from 'playwright/test';

const ROW_SELECTOR = '.dms-body-row[role="row"]';

/** Serialise cell text content for use inside `evaluateAll` (runs in browser context). */
function readCellTexts(cellElements: Element[]): string[] {
  return cellElements.map(function readText(cell) {
    return (cell.textContent ?? '').trim();
  });
}

/**
 * Assert that all currently visible cells matching `cellSelector` have non-empty
 * text content.
 * Uses expect.poll to retry the assertion until all cells are populated or the
 * timeout expires — no fixed sleeps required.
 *
 * Regression guard for CDK virtual scroll blank rows (Epics 29/31/44/60/64/87).
 *
 * @param page           - The Playwright Page object.
 * @param cellSelector   - CSS selector for the cells to check
 *                         (e.g. `'.dms-body-row[role="row"] .dms-body-cell[data-column="symbol"]'`).
 * @param failureMessage - Message to display when the assertion fails.
 * @param timeout        - Maximum polling time in milliseconds. Default: 10000.
 */
export async function assertVisibleRowsNonEmpty(
  page: Page,
  cellSelector: string,
  failureMessage: string,
  timeout = 10000
): Promise<void> {
  // Wait for at least one row to be visible first
  await expect(page.locator(ROW_SELECTOR).first()).toBeVisible({ timeout });

  // Poll until no empty cells remain (auto-retries until timeout)
  await expect
    .poll(
      async function countEmptyCells() {
        const cells = page.locator(cellSelector);
        // Read the currently rendered cells in one DOM snapshot so CDK
        // row recycling cannot race a count()+nth() loop mid-poll.
        const texts = await cells.evaluateAll(readCellTexts);
        if (texts.length === 0) {
          return -1; // no rows yet — keep polling
        }
        return texts.filter(function isEmpty(text) {
          return text === '';
        }).length;
      },
      { message: failureMessage, timeout }
    )
    .toBe(0);
}
