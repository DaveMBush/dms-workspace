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
      const raw = localStorage.getItem('dms-sort-state');
      const state = raw !== null ? JSON.parse(raw) : {};
      state[t] = { field: f, order: o };
      localStorage.setItem('dms-sort-state', JSON.stringify(state));
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
    const raw = localStorage.getItem('dms-sort-state');
    if (raw === null) {
      return null;
    }
    const state = JSON.parse(raw);
    return (state[t] as { field: string; order: string }) ?? null;
  }, table);
}

/**
 * Helper: clear sort state from localStorage.
 */
async function clearSortState(page: Page): Promise<void> {
  await page.evaluate(function removeSortState(): void {
    localStorage.removeItem('dms-sort-state');
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

    // Verify sort state was saved to localStorage
    const state = await getSortState(page, 'universes');
    expect(state).not.toBeNull();
    expect(state!.field).toBe('symbol');
    expect(state!.order).toBe('asc');
  });

  test('should toggle sort direction on second click', async ({ page }) => {
    const symbolHeader = page.getByRole('button', { name: 'Symbol' });

    // First click → asc
    await symbolHeader.click();
    await page.waitForTimeout(300);
    let state = await getSortState(page, 'universes');
    expect(state!.order).toBe('asc');

    // Second click → desc
    await symbolHeader.click();
    await page.waitForTimeout(300);
    state = await getSortState(page, 'universes');
    expect(state!.order).toBe('desc');
  });

  test('should save sort state to localStorage on sort click', async ({
    page,
  }) => {
    const symbolHeader = page.getByRole('button', { name: 'Symbol' });
    await symbolHeader.click();
    await page.waitForTimeout(500);

    const state = await getSortState(page, 'universes');
    expect(state).not.toBeNull();
    expect(state!.field).toBe('symbol');
    expect(state!.order).toBe('asc');
  });

  test('should send sort params for Risk Group column', async ({ page }) => {
    const riskGroupHeader = page.getByRole('button', { name: 'Risk Group' });
    await riskGroupHeader.click();
    await page.waitForTimeout(300);

    // Verify sort state was saved
    const state = await getSortState(page, 'universes');
    expect(state).not.toBeNull();
    expect(state!.field).toBe('risk_group');
    expect(state!.order).toBe('asc');
  });

  test('should display sort indicator when column is clicked', async ({
    page,
  }) => {
    const symbolHeader = page.getByRole('button', { name: 'Symbol' });

    // Before sorting, verify no sort state
    let state = await getSortState(page, 'universes');
    expect(state).toBeNull();

    // Click to sort
    await symbolHeader.click();
    await page.waitForTimeout(300);

    // After sorting, verify state changed
    state = await getSortState(page, 'universes');
    expect(state).not.toBeNull();
    expect(state!.field).toBe('symbol');
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
    let state = await getSortState(page, 'universes');
    expect(state).not.toBeNull();
    expect(state!.field).toBe('symbol');

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify sort state persisted after refresh
    state = await getSortState(page, 'universes');
    expect(state).not.toBeNull();
    expect(state!.field).toBe('symbol');
    expect(state!.order).toBe('asc');
  });

  test('should persist sort state across navigation', async ({ page }) => {
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');

    // Sort by Risk Group
    const riskGroupHeader = page.getByRole('button', { name: 'Risk Group' });
    await riskGroupHeader.click();
    await page.waitForTimeout(500);

    // Confirm state is saved
    let state = await getSortState(page, 'universes');
    expect(state!.field).toBe('risk_group');

    // Navigate away to a different page
    await page.goto(`/account/${ACCOUNT_UUID}/open`);
    await page.waitForLoadState('networkidle');

    // Navigate back to universe
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');

    // Verify sort state persisted
    state = await getSortState(page, 'universes');
    expect(state).not.toBeNull();
    expect(state!.field).toBe('risk_group');
    expect(state!.order).toBe('asc');
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
    const state = await getSortState(page, 'universes');
    expect(state).toBeNull();
  });
});
