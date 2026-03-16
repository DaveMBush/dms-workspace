import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedSoldPositionsE2eData } from './helpers/seed-sold-positions-e2e-data.helper';

/**
 * Helper: read sort state from the sort-filter localStorage key.
 */
async function getSortState(
  page: Page,
  table: string
): Promise<{ field: string; order: string } | null> {
  return page.evaluate(function readSortFilterState(t: string) {
    const raw = localStorage.getItem('dms-sort-filter-state');
    if (raw === null) {
      return null;
    }
    const state = JSON.parse(raw);
    const entry = state[t];
    if (entry === undefined || entry === null) {
      return null;
    }
    return (entry.sort as { field: string; order: string }) ?? null;
  }, table);
}

/**
 * Helper: clear sort-filter state from localStorage.
 */
async function clearSortFilterState(page: Page): Promise<void> {
  await page.evaluate(function removeSortFilterState(): void {
    localStorage.removeItem('dms-sort-filter-state');
  });
}

/**
 * Helper: wait for sold positions table rows to appear.
 */
async function waitForTableRows(page: Page): Promise<void> {
  await expect(page.locator('dms-base-table')).toBeVisible({ timeout: 15000 });
  await page.waitForSelector('tr.mat-mdc-row', { timeout: 15000 });
}

/**
 * Helper: collect text content from all visible cells in a given column index (1-based).
 */
async function getColumnTexts(page: Page, colIndex: number): Promise<string[]> {
  const cells = page.locator(`tr.mat-mdc-row td:nth-child(${colIndex})`);
  const count = await cells.count();
  const texts: string[] = [];
  for (let i = 0; i < count; i++) {
    const text = await cells.nth(i).textContent();
    texts.push((text ?? '').trim());
  }
  return texts;
}

// ─── Sold Positions Screen E2E Tests ─────────────────────────────────────────

test.describe('Sold Positions Screen E2E', () => {
  let cleanup: () => Promise<void>;
  let accountId: string;
  let symbols: string[];

  test.beforeAll(async () => {
    const seeder = await seedSoldPositionsE2eData();
    cleanup = seeder.cleanup;
    accountId = seeder.accountId;
    symbols = seeder.symbols;
  });

  test.afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  // ─── Filter Tests ────────────────────────────────────────────────────────

  test.describe('Filter Tests', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await clearSortFilterState(page);
      await page.goto(`/account/${accountId}/sold`);
      await waitForTableRows(page);
    });

    test('should filter by Symbol', async ({ page }) => {
      const symbolInput = page.locator('input[placeholder="Search Symbol"]');
      await symbolInput.fill(symbols[0]);
      await page.waitForTimeout(500);

      // The table should show only the matching symbol (column 1)
      const symbolCells = await getColumnTexts(page, 1);
      expect(symbolCells.length).toBeGreaterThan(0);
      for (const cell of symbolCells) {
        expect(cell).toContain(symbols[0]);
      }
    });
  });

  // ─── Sort Tests ──────────────────────────────────────────────────────────

  test.describe('Sort Tests', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await clearSortFilterState(page);
      await page.goto(`/account/${accountId}/sold`);
      await waitForTableRows(page);
    });

    test('should sort by Sell Date', async ({ page }) => {
      const header = page.getByRole('button', { name: 'Sell Date' });
      await header.click();
      await page.waitForTimeout(500);

      const state = await getSortState(page, 'trades-closed');
      expect(state).not.toBeNull();
      expect(state!.field).toBe('sell_date');
      expect(state!.order).toBe('asc');
    });
  });
});
