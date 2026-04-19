/**
 * Regression tests for the account panel sort+scroll bug.
 *
 * Bug: When a sorted account panel table had >50 rows, the service's
 * visibleRange optimization returned placeholder rows (isLoading=true,
 * symbol='') for items outside the initial visible range.  The BaseTable
 * sort moved those empty-symbol rows to the bottom (symbol desc) or top
 * (symbol asc), so the user saw blank rows when scrolling.
 *
 * Fix: The service computeds now access ALL items unconditionally, letting
 * SmartNgRX load them in two batched API calls.  The BaseTable sort also
 * pins loading rows to the end as a safety net.
 *
 * Data strategy: seeders re-use the first 50 universe entries (by createdAt asc)
 * which are always returned in the initial /api/top page. This guarantees
 * buildUniverseMap has their IDs loaded and every trade gets a full position
 * (not a partialOpenPosition with symbol='').
 */
import { expect, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedScrollDivDepositsWithSymbolsData } from './helpers/seed-scroll-div-deposits-with-symbols-data.helper';
import { seedScrollOpenPositionsData } from './helpers/seed-scroll-open-positions-data.helper';
import { seedScrollSoldPositionsData } from './helpers/seed-scroll-sold-positions-data.helper';

const VIEWPORT_SELECTOR = 'cdk-virtual-scroll-viewport';

/** Scroll to the bottom of the CDK virtual scroll viewport. */
async function scrollToBottom(
  page: import('playwright/test').Page
): Promise<void> {
  await page.evaluate(function doScroll(): void {
    const vp = document.querySelector('cdk-virtual-scroll-viewport');
    if (vp !== null) {
      vp.scrollTop = vp.scrollHeight;
    }
  });
  // Allow virtual scroll to render the new range
  await page.waitForTimeout(600);
}

/** Wait for the virtual scroll table to be visible and rows to appear. */
async function waitForTable(
  page: import('playwright/test').Page
): Promise<void> {
  await expect(page.locator('dms-base-table')).toBeVisible({ timeout: 15000 });
  await page.waitForSelector('tr.mat-mdc-row', { timeout: 15000 });
}

/**
 * Return text content of all first-column cells currently rendered in the DOM.
 */
async function getFirstColumnTexts(
  page: import('playwright/test').Page
): Promise<string[]> {
  return page.locator('tr.mat-mdc-row td:first-child').allTextContents();
}

/**
 * Sort the table by symbol descending (click header twice) then scroll to
 * the bottom and wait (with polling) until all visible cells have real
 * symbol text.  Uses expect.poll so transient partial-position rows (whose
 * universe entity hasn't arrived yet) are retried automatically.
 */
async function assertNoEmptyCellsAfterSortScroll(
  page: import('playwright/test').Page
): Promise<void> {
  const viewport = page.locator(VIEWPORT_SELECTOR);
  await expect(viewport).toBeVisible({ timeout: 10000 });

  const symbolHeader = page.locator('th.mat-mdc-header-cell', {
    hasText: 'Symbol',
  });
  await symbolHeader.click();
  await page.waitForTimeout(300);
  await symbolHeader.click();
  // Allow data to load after sort triggers new SmartNgRX requests
  await page.waitForTimeout(1500);

  await scrollToBottom(page);

  // Poll until no empty first-column cells remain.  Partial positions
  // (universe entity not yet in buildUniverseMap) resolve once SmartNgRX
  // loads the universe ids from /api/top — typically within a few seconds.
  await expect
    .poll(
      async function checkEmptyCells(): Promise<number> {
        await scrollToBottom(page);
        const cells = await getFirstColumnTexts(page);
        return cells.filter(function isEmpty(t: string): boolean {
          return t.trim() === '';
        }).length;
      },
      { timeout: 15000, message: 'Expected all rows to have symbols' }
    )
    .toBe(0);

  // Sanity: at least some rows are visible
  const cells = await getFirstColumnTexts(page);
  expect(cells.length).toBeGreaterThan(0);
}

// ─── Open Positions: Sort + Scroll Rows All Loaded ───────────────────────────

test.describe('Open Positions: sort+scroll shows all real data', () => {
  let cleanup: () => Promise<void>;
  let accountId: string;

  test.beforeAll(async () => {
    const seeder = await seedScrollOpenPositionsData();
    cleanup = seeder.cleanup;
    accountId = seeder.accountId;
  });

  test.afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  test.beforeEach(async ({ page }) => {
    // Clear sort state so the table starts unsorted, then we apply our own sort
    await page.addInitScript(function clearSortState(): void {
      localStorage.removeItem('dms-sort-filter-state');
    });
    await login(page);
    await page.goto(`/account/${accountId}/open`);
    await waitForTable(page);
  });

  test('rows at bottom of symbol-desc sorted table are not empty', async ({
    page,
  }) => {
    await assertNoEmptyCellsAfterSortScroll(page);
  });
});

// ─── Sold Positions: Sort + Scroll Rows All Loaded ───────────────────────────

test.describe('Sold Positions: sort+scroll shows all real data', () => {
  let cleanup: () => Promise<void>;
  let accountId: string;

  test.beforeAll(async () => {
    const seeder = await seedScrollSoldPositionsData();
    cleanup = seeder.cleanup;
    accountId = seeder.accountId;
  });

  test.afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(function clearSortState(): void {
      localStorage.removeItem('dms-sort-filter-state');
    });
    await login(page);
    await page.goto(`/account/${accountId}/sold`);
    await waitForTable(page);
  });

  test('rows at bottom of symbol-desc sorted table are not empty', async ({
    page,
  }) => {
    await assertNoEmptyCellsAfterSortScroll(page);
  });

  test('symbol filter + scroll does not collapse table height', async ({
    page,
  }) => {
    const viewport = page.locator(VIEWPORT_SELECTOR);
    await expect(viewport).toBeVisible({ timeout: 10000 });

    // Wait for all rows to have real symbols before measuring height
    await expect
      .poll(
        async function countNonEmpty(): Promise<number> {
          const cells = await getFirstColumnTexts(page);
          return cells.filter(function isNonEmpty(t: string): boolean {
            return t.trim() !== '';
          }).length;
        },
        { timeout: 15000, message: 'Expected rows to load before filter test' }
      )
      .toBeGreaterThan(0);

    const initialHeight = await viewport.evaluate(
      function getHeight(el: Element): number {
        return (el as HTMLElement).scrollHeight;
      }
    );

    // Use the first visible symbol's first character as a filter that is
    // guaranteed to match at least one row regardless of the test DB state.
    const firstSymbol = await page
      .locator('tr.mat-mdc-row td:first-child')
      .first()
      .textContent();
    const filterChar = (firstSymbol ?? '').trim().charAt(0) || 'A';

    // The sold-positions filter uses placeholder="Search Symbol" (no data-testid)
    const filterInput = page.getByPlaceholder('Search Symbol');
    await filterInput.fill(filterChar);
    await page.waitForTimeout(600);

    const filteredHeight = await viewport.evaluate(
      function getHeight(el: Element): number {
        return (el as HTMLElement).scrollHeight;
      }
    );

    // At least one row matches the filter character → height > 0
    // Before the fix, loading placeholder rows (symbol='') were removed by the
    // filter, causing the array to shrink and the viewport to jump.
    expect(filteredHeight).toBeGreaterThan(0);

    // Clear filter and verify height recovers to within ~100 px of initial
    await filterInput.fill('');
    await page.waitForTimeout(600);

    const clearedHeight = await viewport.evaluate(
      function getHeight(el: Element): number {
        return (el as HTMLElement).scrollHeight;
      }
    );
    expect(clearedHeight).toBeCloseTo(initialHeight, -2);
  });
});

// ─── Dividend Deposits: Sort + Scroll Rows All Loaded ────────────────────────

test.describe('Dividend Deposits: sort+scroll shows all real data', () => {
  let cleanup: () => Promise<void>;
  let accountId: string;

  test.beforeAll(async () => {
    const seeder = await seedScrollDivDepositsWithSymbolsData();
    cleanup = seeder.cleanup;
    accountId = seeder.accountId;
  });

  test.afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(function clearSortState(): void {
      localStorage.removeItem('dms-sort-filter-state');
    });
    await login(page);
    await page.goto(`/account/${accountId}/div-dep`);
    await waitForTable(page);
  });

  test('rows at bottom of symbol-desc sorted table are not empty', async ({
    page,
  }) => {
    await assertNoEmptyCellsAfterSortScroll(page);
  });
});
