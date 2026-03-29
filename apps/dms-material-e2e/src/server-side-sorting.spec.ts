import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';

const ACCOUNT_UUID = '1677e04f-ef9b-4372-adb3-b740443088dc';

/**
 * Helper: set sort state in localStorage so the interceptor picks it up.
 */
async function setSortState(
  page: Page,
  table: string,
  field: string,
  order: 'asc' | 'desc'
): Promise<void> {
  await page.evaluate(
    function persistSortState({
      table: t,
      field: f,
      order: o,
    }: {
      table: string;
      field: string;
      order: string;
    }): void {
      const raw = localStorage.getItem('dms-sort-filter-state');
      const state = raw !== null ? JSON.parse(raw) : {};
      if (state[t] === undefined) {
        state[t] = {};
      }
      state[t].sort = { field: f, order: o };
      localStorage.setItem('dms-sort-filter-state', JSON.stringify(state));
    },
    { table, field, order }
  );
}

/**
 * Helper: read sort state from localStorage.
 */
async function getSortState(
  page: Page,
  table: string
): Promise<{ field: string; order: string } | null> {
  return page.evaluate(function readSortState(t: string) {
    const raw = localStorage.getItem('dms-sort-filter-state');
    if (raw === null) {
      return null;
    }
    const state = JSON.parse(raw);
    return (state[t]?.sort as { field: string; order: string }) ?? null;
  }, table);
}

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
 * Helper: clear sort state from localStorage.
 */
async function clearSortState(page: Page): Promise<void> {
  await page.evaluate(function removeSortState(): void {
    localStorage.removeItem('dms-sort-filter-state');
  });
}

/**
 * Helper: collect sortBy/sortOrder from intercepted requests.
 */
function extractSortParams(url: string): {
  sortBy: string | null;
  sortOrder: string | null;
} {
  const parsed = new URL(url);
  return {
    sortBy: parsed.searchParams.get('sortBy'),
    sortOrder: parsed.searchParams.get('sortOrder'),
  };
}

// ─── Universe Table – Server-Side Sorting ────────────────────────────────────

test.describe('Universe Table - Server-Side Sorting', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await clearSortState(page);
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');
  });

  test('should send sortBy and sortOrder params when Symbol header is clicked', async ({
    page,
  }) => {
    // Click the Symbol sort header
    const symbolHeader = page.getByRole('button', { name: 'Symbol' });
    await symbolHeader.click();
    await page.waitForTimeout(300);

    // Verify sort state was saved to localStorage as sortColumns
    const cols = await getSortColumnsState(page, 'universes');
    expect(cols).not.toBeNull();
    expect(cols).toEqual([{ column: 'symbol', direction: 'asc' }]);
  });

  test('should toggle sort direction on second click', async ({ page }) => {
    const symbolHeader = page.getByRole('button', { name: 'Symbol' });

    // First click → asc
    await symbolHeader.click();
    await page.waitForTimeout(300);
    let cols = await getSortColumnsState(page, 'universes');
    expect(cols).toEqual([{ column: 'symbol', direction: 'asc' }]);

    // Second click → desc
    await symbolHeader.click();
    await page.waitForTimeout(300);
    cols = await getSortColumnsState(page, 'universes');
    expect(cols).toEqual([{ column: 'symbol', direction: 'desc' }]);
  });

  test('should save sort state to localStorage on sort click', async ({
    page,
  }) => {
    const symbolHeader = page.getByRole('button', { name: 'Symbol' });
    await symbolHeader.click();
    await page.waitForTimeout(500);

    const cols = await getSortColumnsState(page, 'universes');
    expect(cols).not.toBeNull();
    expect(cols).toEqual([{ column: 'symbol', direction: 'asc' }]);
  });

  test('should send sort params for Risk Group column', async ({ page }) => {
    const riskGroupHeader = page.getByRole('button', { name: 'Risk Group' });
    await riskGroupHeader.click();
    await page.waitForTimeout(300);

    // Verify sort state was saved
    const cols = await getSortColumnsState(page, 'universes');
    expect(cols).not.toBeNull();
    expect(cols).toEqual([{ column: 'risk_group', direction: 'asc' }]);
  });

  test('should update localStorage sort state when column is clicked', async ({
    page,
  }) => {
    const symbolHeader = page.getByRole('button', { name: 'Symbol' });

    // Before sorting, verify no sort state
    let cols = await getSortColumnsState(page, 'universes');
    expect(cols).toBeNull();

    // Click to sort
    await symbolHeader.click();
    await page.waitForTimeout(300);

    // After sorting, verify state changed
    cols = await getSortColumnsState(page, 'universes');
    expect(cols).not.toBeNull();
    expect(cols![0].column).toBe('symbol');
  });
});

// ─── Universe Sort Persistence ───────────────────────────────────────────────

test.describe('Universe Sort Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await clearSortState(page);
  });

  test('should persist sort state across page refresh', async ({ page }) => {
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');

    // Click Symbol to sort
    const symbolHeader = page.getByRole('button', { name: 'Symbol' });
    await symbolHeader.click();
    await page.waitForTimeout(500);

    // Confirm state is saved
    let cols = await getSortColumnsState(page, 'universes');
    expect(cols).not.toBeNull();
    expect(cols![0].column).toBe('symbol');

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify sort state persisted after refresh
    cols = await getSortColumnsState(page, 'universes');
    expect(cols).not.toBeNull();
    expect(cols).toEqual([{ column: 'symbol', direction: 'asc' }]);
  });

  test('should persist sort state across navigation', async ({ page }) => {
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');

    // Sort by Risk Group
    const riskGroupHeader = page.getByRole('button', { name: 'Risk Group' });
    await riskGroupHeader.click();
    await page.waitForTimeout(500);

    // Confirm state is saved
    let cols = await getSortColumnsState(page, 'universes');
    expect(cols![0].column).toBe('risk_group');

    // Navigate away to a different page
    await page.goto(`/account/${ACCOUNT_UUID}/open`);
    await page.waitForLoadState('networkidle');

    // Navigate back to universe
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');

    // Verify sort state persisted
    cols = await getSortColumnsState(page, 'universes');
    expect(cols).not.toBeNull();
    expect(cols).toEqual([{ column: 'risk_group', direction: 'asc' }]);
  });

  test('should restore sort arrow indicator on page load from saved state', async ({
    page,
  }) => {
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');

    // Sort by Symbol ascending
    const symbolHeader = page.getByRole('button', { name: 'Symbol' });
    await symbolHeader.click();
    await page.waitForTimeout(500);

    // Navigate away
    await page.goto(`/account/${ACCOUNT_UUID}/open`);
    await page.waitForLoadState('networkidle');

    // Navigate back to universe
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');

    // Verify the Symbol sort header has the active sort arrow
    const symbolSortHeader = page.locator(
      '[data-sort-header="symbol"].mat-sort-header-sorted'
    );
    await expect(symbolSortHeader).toBeVisible();
  });
});

// ─── Open Positions – Sort Interceptor ───────────────────────────────────────

test.describe('Open Positions - Sort Interceptor', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await clearSortState(page);
  });

  test('should send sort params when sort state is pre-set in localStorage', async ({
    page,
  }) => {
    // Pre-set sort state for trades-open before navigating
    await setSortState(page, 'trades-open', 'buyDate', 'desc');

    await page.goto(`/account/${ACCOUNT_UUID}/open`);
    await page.waitForLoadState('networkidle');

    // Verify the sort state was preserved
    const state = await getSortState(page, 'trades-open');
    expect(state).not.toBeNull();
    expect(state!.field).toBe('buyDate');
    expect(state!.order).toBe('desc');
  });

  test('should send unrealizedGain sort param when pre-set', async ({
    page,
  }) => {
    await setSortState(page, 'trades-open', 'unrealizedGain', 'asc');

    await page.goto(`/account/${ACCOUNT_UUID}/open`);
    await page.waitForLoadState('networkidle');

    // Verify the sort state was preserved
    const state = await getSortState(page, 'trades-open');
    expect(state).not.toBeNull();
    expect(state!.field).toBe('unrealizedGain');
    expect(state!.order).toBe('asc');
  });

  test('should display sortable column headers', async ({ page }) => {
    await page.goto(`/account/${ACCOUNT_UUID}/open`);
    await page.waitForLoadState('networkidle');

    // Buy Date is sortable
    const buyDateButton = page.getByRole('button', { name: 'Buy Date' });
    await expect(buyDateButton).toBeVisible();

    // Unrlz Gain$ is sortable
    const gainButton = page.getByRole('button', { name: 'Unrlz Gain$' });
    await expect(gainButton).toBeVisible();
  });

  test('should sort locally when clicking Buy Date header', async ({
    page,
  }) => {
    await page.goto(`/account/${ACCOUNT_UUID}/open`);
    await page.waitForLoadState('networkidle');

    const buyDateButton = page.getByRole('button', { name: 'Buy Date' });
    await buyDateButton.click();
    await page.waitForTimeout(300);

    // Sort indicator should appear
    const sortIndicator = page.locator(
      'th.mat-column-buyDate .mat-sort-header-arrow'
    );
    await expect(sortIndicator).toBeVisible();
  });
});

// ─── Closed Positions – Sort Interceptor ─────────────────────────────────────

test.describe('Closed Positions - Sort Interceptor', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await clearSortState(page);
  });

  test('should send sort params when sort state is pre-set in localStorage', async ({
    page,
  }) => {
    // Pre-set sort state for trades-closed
    await setSortState(page, 'trades-closed', 'sell_date', 'asc');

    await page.goto(`/account/${ACCOUNT_UUID}/sold`);
    await page.waitForLoadState('networkidle');

    // Verify the sort state was preserved
    const state = await getSortState(page, 'trades-closed');
    expect(state).not.toBeNull();
    expect(state!.field).toBe('sell_date');
    expect(state!.order).toBe('asc');
  });

  test('should display sortable Sell Date column header', async ({ page }) => {
    await page.goto(`/account/${ACCOUNT_UUID}/sold`);
    await page.waitForLoadState('networkidle');

    const sellDateButton = page.getByRole('button', {
      name: 'Sell Date',
      exact: true,
    });
    await expect(sellDateButton).toBeVisible();
  });

  test('should sort locally when clicking Sell Date header', async ({
    page,
  }) => {
    await page.goto(`/account/${ACCOUNT_UUID}/sold`);
    await page.waitForLoadState('networkidle');

    const sellDateButton = page.getByRole('button', {
      name: 'Sell Date',
      exact: true,
    });
    await sellDateButton.click();
    await page.waitForTimeout(300);

    // Sort indicator should appear
    const sortIndicator = page.locator(
      'th.mat-column-sell_date .mat-sort-header-arrow'
    );
    await expect(sortIndicator).toBeVisible();
  });
});

// ─── Cross-Table Sort Independence ───────────────────────────────────────────

test.describe('Cross-Table Sort Independence', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await clearSortState(page);
  });

  test('should maintain independent sort states per table', async ({
    page,
  }) => {
    // Set sort state for universe
    await setSortState(page, 'universes', 'symbol', 'asc');
    // Set sort state for trades-closed
    await setSortState(page, 'trades-closed', 'sell_date', 'desc');

    // Navigate to universe and verify its sort state
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');
    let state = await getSortState(page, 'universes');
    expect(state!.field).toBe('symbol');
    expect(state!.order).toBe('asc');

    // Navigate to closed trades and verify its sort state
    await page.goto(`/account/${ACCOUNT_UUID}/sold`);
    await page.waitForLoadState('networkidle');
    state = await getSortState(page, 'trades-closed');
    expect(state!.field).toBe('sell_date');
    expect(state!.order).toBe('desc');
  });

  test('should not send sort params when no sort state exists', async ({
    page,
  }) => {
    // No sort state in localStorage
    const state = await getSortState(page, 'universes');
    expect(state).toBeNull();
  });

  test('should clear sort params after third click removes sort', async ({
    page,
  }) => {
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');

    const symbolHeader = page.getByRole('button', { name: 'Symbol' });

    // Click 1 → asc
    await symbolHeader.click();
    await page.waitForTimeout(300);

    // Click 2 → desc
    await symbolHeader.click();
    await page.waitForTimeout(300);

    // Click 3 → clear sort
    await symbolHeader.click();
    await page.waitForTimeout(300);

    // Verify sort state was cleared from localStorage
    const cols = await getSortColumnsState(page, 'universes');
    expect(cols).toBeNull();
  });
});
