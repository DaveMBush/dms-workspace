import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';

const ACCOUNT_UUID = '1677e04f-ef9b-4372-adb3-b740443088dc';

/**
 * Helper: read filter state from localStorage.
 */
async function getFilterState(
  page: Page,
  table: string
): Promise<Record<string, unknown> | null> {
  return page.evaluate(function readFilterState(t: string) {
    const raw = localStorage.getItem('dms-sort-filter-state');
    if (raw === null) {
      return null;
    }
    const state = JSON.parse(raw);
    return (state[t]?.filters as Record<string, unknown>) ?? null;
  }, table);
}

/**
 * Helper: clear all sort/filter state from localStorage.
 */
async function clearState(page: Page): Promise<void> {
  await page.evaluate(function removeState(): void {
    localStorage.removeItem('dms-sort-filter-state');
  });
}

test.describe('Universe Filter Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await clearState(page);
  });

  test('should restore symbol filter input on page load from saved state', async ({
    page,
  }) => {
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');

    // Type in the Symbol filter input
    const symbolInput = page.getByPlaceholder('Search Symbol');
    await symbolInput.fill('XYZ');
    // Wait for debounced save (300ms) plus a buffer
    await page.waitForTimeout(600);

    // Verify filter was saved to localStorage
    const filters = await getFilterState(page, 'universes');
    expect(filters).not.toBeNull();
    expect(filters!['symbol']).toBe('XYZ');

    // Navigate away
    await page.goto(`/account/${ACCOUNT_UUID}/open`);
    await page.waitForLoadState('networkidle');

    // Navigate back to universe
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');

    // Verify filter input is restored
    const restoredInput = page.getByPlaceholder('Search Symbol');
    await expect(restoredInput).toHaveValue('XYZ');
  });
});
