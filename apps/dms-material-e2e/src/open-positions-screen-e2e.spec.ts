import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedOpenPositionsE2eData } from './helpers/seed-open-positions-e2e-data.helper';

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
 * Helper: wait for open positions table rows to appear.
 */
async function waitForTableRows(page: Page): Promise<void> {
  await expect(
    page.locator('[data-testid="open-positions-table"]')
  ).toBeVisible({ timeout: 15000 });
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

// ─── Open Positions Screen E2E Tests ─────────────────────────────────────────

test.describe('Open Positions Screen E2E', () => {
  let cleanup: () => Promise<void>;
  let accountId: string;
  let symbols: string[];

  test.beforeAll(async () => {
    const seeder = await seedOpenPositionsE2eData();
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
      await page.goto(`/account/${accountId}/open`);
      await waitForTableRows(page);
    });

    test('should filter by Symbol', async ({ page }) => {
      const symbolInput = page.locator('[data-testid="symbol-search-input"]');
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
      await page.goto(`/account/${accountId}/open`);
      await waitForTableRows(page);
    });

    test('should sort by Buy Date', async ({ page }) => {
      const header = page.getByRole('button', { name: 'Buy Date' });
      await header.click();
      await page.waitForTimeout(500);

      const state = await getSortState(page, 'trades-open');
      expect(state).not.toBeNull();
      expect(state!.field).toBe('buyDate');
      expect(state!.order).toBe('asc');
    });

    test('should sort by Unrlz Gain %', async ({ page }) => {
      const header = page.getByRole('button', { name: 'Unrlz Gain %' });
      await header.click();
      await page.waitForTimeout(500);

      const state = await getSortState(page, 'trades-open');
      expect(state).not.toBeNull();
      expect(state!.field).toBe('unrealizedGainPercent');
      expect(state!.order).toBe('asc');
    });

    test('should sort by Unrlz Gain$', async ({ page }) => {
      const header = page.getByRole('button', { name: 'Unrlz Gain$' });
      await header.click();
      await page.waitForTimeout(500);

      const state = await getSortState(page, 'trades-open');
      expect(state).not.toBeNull();
      expect(state!.field).toBe('unrealizedGain');
      expect(state!.order).toBe('asc');
    });
  });
});
