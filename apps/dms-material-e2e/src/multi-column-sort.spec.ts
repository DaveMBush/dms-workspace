import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';

/**
 * Helper: read sortColumns state from localStorage.
 */
async function getSortColumnsState(
  page: Page,
  table: string
): Promise<{ column: string; direction: string }[] | null> {
  return page.evaluate(function readSortColumnsState(t: string) {
    const raw = localStorage.getItem('dms-sort-filter-state');
    if (raw === null) {
      return null;
    }
    const state = JSON.parse(raw);
    return (
      (state[t]?.sortColumns as { column: string; direction: string }[]) ?? null
    );
  }, table);
}

/**
 * Helper: clear all sort/filter state from localStorage.
 */
async function clearSortState(page: Page): Promise<void> {
  await page.evaluate(function removeSortState(): void {
    localStorage.removeItem('dms-sort-filter-state');
  });
}

// ─── Multi-Column Sort on Universe Screen ────────────────────────────────────

test.describe('Universe Table - Multi-Column Sort', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await clearSortState(page);
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');
  });

  test('single click sets sole sort column (AC #1)', async ({ page }) => {
    const symbolHeader = page.getByRole('button', { name: 'Symbol' });
    await symbolHeader.click();
    await page.waitForTimeout(300);

    const cols = await getSortColumnsState(page, 'universes');
    expect(cols).toEqual([{ column: 'symbol', direction: 'asc' }]);
  });

  test('Shift+click appends secondary sort column (AC #2)', async ({
    page,
  }) => {
    // Primary sort: Symbol asc
    const symbolHeader = page.getByRole('button', { name: 'Symbol' });
    await symbolHeader.click();
    await page.waitForTimeout(300);

    // Secondary sort: Risk Group asc (Shift+click)
    const riskGroupHeader = page.getByRole('button', { name: 'Risk Group' });
    await riskGroupHeader.click({ modifiers: ['Shift'] });
    await page.waitForTimeout(300);

    const cols = await getSortColumnsState(page, 'universes');
    expect(cols).toEqual([
      { column: 'symbol', direction: 'asc' },
      { column: 'risk_group', direction: 'asc' },
    ]);
  });

  test('rank indicators visible for multi-column sort (AC #3)', async ({
    page,
  }) => {
    // Primary sort: Symbol
    const symbolHeader = page.getByRole('button', { name: 'Symbol' });
    await symbolHeader.click();
    await page.waitForTimeout(300);

    // Secondary sort: Risk Group
    const riskGroupHeader = page.getByRole('button', { name: 'Risk Group' });
    await riskGroupHeader.click({ modifiers: ['Shift'] });
    await page.waitForTimeout(300);

    // Check rank indicators are visible
    const rankIndicators = page.locator('[data-testid="sort-rank"]');
    await expect(rankIndicators).toHaveCount(2);
  });

  test('Shift+click toggles existing column direction (AC #4)', async ({
    page,
  }) => {
    // Primary sort: Symbol asc
    const symbolHeader = page.getByRole('button', { name: 'Symbol' });
    await symbolHeader.click();
    await page.waitForTimeout(300);

    // Secondary sort: Risk Group asc
    const riskGroupHeader = page.getByRole('button', { name: 'Risk Group' });
    await riskGroupHeader.click({ modifiers: ['Shift'] });
    await page.waitForTimeout(300);

    // Shift+click Risk Group again → toggle to desc
    await riskGroupHeader.click({ modifiers: ['Shift'] });
    await page.waitForTimeout(300);

    const cols = await getSortColumnsState(page, 'universes');
    expect(cols).toEqual([
      { column: 'symbol', direction: 'asc' },
      { column: 'risk_group', direction: 'desc' },
    ]);
  });

  test('Shift+click removes column when already desc (AC #4)', async ({
    page,
  }) => {
    // Primary sort: Symbol asc
    const symbolHeader = page.getByRole('button', { name: 'Symbol' });
    await symbolHeader.click();
    await page.waitForTimeout(300);

    // Secondary sort: Risk Group asc
    const riskGroupHeader = page.getByRole('button', { name: 'Risk Group' });
    await riskGroupHeader.click({ modifiers: ['Shift'] });
    await page.waitForTimeout(300);

    // Shift+click Risk Group → desc
    await riskGroupHeader.click({ modifiers: ['Shift'] });
    await page.waitForTimeout(300);

    // Shift+click Risk Group again → remove
    await riskGroupHeader.click({ modifiers: ['Shift'] });
    await page.waitForTimeout(300);

    const cols = await getSortColumnsState(page, 'universes');
    expect(cols).toEqual([{ column: 'symbol', direction: 'asc' }]);
  });

  test('non-shift click clears secondary sort (AC #1 regression)', async ({
    page,
  }) => {
    // Set up multi-column sort: Symbol + Risk Group
    const symbolHeader = page.getByRole('button', { name: 'Symbol' });
    await symbolHeader.click();
    await page.waitForTimeout(300);

    const riskGroupHeader = page.getByRole('button', { name: 'Risk Group' });
    await riskGroupHeader.click({ modifiers: ['Shift'] });
    await page.waitForTimeout(300);

    // Non-shift click on Symbol → should reset to single sort
    await symbolHeader.click();
    await page.waitForTimeout(300);

    // MatSort will cycle: was asc → now desc for Symbol
    const cols = await getSortColumnsState(page, 'universes');
    expect(cols).toHaveLength(1);
  });
});
