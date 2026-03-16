import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedScreenerData } from './helpers/seed-screener-data.helper';

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
 * Helper: wait for screener table rows to appear.
 */
async function waitForTableRows(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="screener-table"]')).toBeVisible({
    timeout: 15000,
  });
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

// ─── Screener Screen E2E Tests ───────────────────────────────────────────────

test.describe('Screener Screen E2E', () => {
  let cleanup: () => Promise<void>;

  test.beforeAll(async () => {
    const seeder = await seedScreenerData();
    cleanup = seeder.cleanup;
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
      await page.goto('/global/screener');
      await waitForTableRows(page);
    });

    test('should filter by Risk Group', async ({ page }) => {
      const dropdown = page.locator('[data-testid="risk-group-filter"]');
      await dropdown.click();
      await page.waitForTimeout(300);

      await page.getByRole('option', { name: 'Equities' }).click();
      await page.waitForTimeout(500);

      // All visible rows should have "Equities" in the Risk Group column (column 2)
      const riskGroupCells = await getColumnTexts(page, 2);
      expect(riskGroupCells.length).toBeGreaterThan(0);
      for (const cell of riskGroupCells) {
        expect(cell).toBe('Equities');
      }
    });
  });

  // ─── Sort Tests ──────────────────────────────────────────────────────────

  test.describe('Sort Tests', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await clearSortFilterState(page);
      await page.goto('/global/screener');
      await waitForTableRows(page);
    });

    test('should sort by Symbol', async ({ page }) => {
      const header = page.getByRole('button', { name: 'Symbol' });
      await header.click();
      await page.waitForTimeout(500);

      const state = await getSortState(page, 'screens');
      expect(state).not.toBeNull();
      expect(state!.field).toBe('symbol');
      expect(state!.order).toBe('asc');
    });

    test('should sort by Risk Group', async ({ page }) => {
      const header = page.getByRole('button', { name: 'Risk Group' });
      await header.click();
      await page.waitForTimeout(500);

      const state = await getSortState(page, 'screens');
      expect(state).not.toBeNull();
      expect(state!.field).toBe('risk_group');
      expect(state!.order).toBe('asc');
    });
  });
});
