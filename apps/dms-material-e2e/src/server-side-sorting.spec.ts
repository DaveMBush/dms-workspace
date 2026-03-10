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
    // Set up a promise that resolves when the next /api/universe GET fires
    const requestPromise = page.waitForRequest(function isUniverseGet(req) {
      return req.url().includes('/api/universe') && req.method() === 'GET';
    });

    // Click the Symbol sort header
    const symbolHeader = page.getByRole('button', { name: 'Symbol' });
    await symbolHeader.click();

    // Wait for the triggered API request
    const request = await requestPromise;
    const { sortBy, sortOrder } = extractSortParams(request.url());

    expect(sortBy).toBe('symbol');
    expect(sortOrder).toBe('asc');
  });

  test('should toggle sort direction on second click', async ({ page }) => {
    const symbolHeader = page.getByRole('button', { name: 'Symbol' });

    // First click → asc
    const firstReq = page.waitForRequest(function isUniverseGet(req) {
      return req.url().includes('/api/universe') && req.method() === 'GET';
    });
    await symbolHeader.click();
    const req1 = await firstReq;
    expect(extractSortParams(req1.url()).sortOrder).toBe('asc');

    // Second click → desc
    const secondReq = page.waitForRequest(function isUniverseGet(req) {
      return req.url().includes('/api/universe') && req.method() === 'GET';
    });
    await symbolHeader.click();
    const req2 = await secondReq;
    expect(extractSortParams(req2.url()).sortOrder).toBe('desc');
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
    const requestPromise = page.waitForRequest(function isUniverseGet(req) {
      return req.url().includes('/api/universe') && req.method() === 'GET';
    });

    const riskGroupHeader = page.getByRole('button', { name: 'Risk Group' });
    await riskGroupHeader.click();

    const request = await requestPromise;
    const { sortBy, sortOrder } = extractSortParams(request.url());

    // risk_group maps to 'name' on the server
    expect(sortBy).toBe('name');
    expect(sortOrder).toBe('asc');
  });

  test('should display sort indicator arrow on active column', async ({
    page,
  }) => {
    const symbolHeader = page.getByRole('button', { name: 'Symbol' });
    await symbolHeader.click();
    await page.waitForTimeout(300);

    // Mat Sort shows an arrow indicator on the sorted column
    const sortIndicator = page.locator(
      'th.mat-column-symbol .mat-sort-header-arrow'
    );
    await expect(sortIndicator).toBeVisible();
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
    const stateBeforeRefresh = await getSortState(page, 'universes');
    expect(stateBeforeRefresh).not.toBeNull();

    // Set up request listener BEFORE refreshing
    const requestPromise = page.waitForRequest(function isUniverseGet(req) {
      return req.url().includes('/api/universe') && req.method() === 'GET';
    });

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // The interceptor should send sort params on the reloaded request
    const request = await requestPromise;
    const { sortBy, sortOrder } = extractSortParams(request.url());
    expect(sortBy).toBe('symbol');
    expect(sortOrder).toBe('asc');
  });

  test('should persist sort state across navigation', async ({ page }) => {
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');

    // Sort by Risk Group
    const riskGroupHeader = page.getByRole('button', { name: 'Risk Group' });
    await riskGroupHeader.click();
    await page.waitForTimeout(500);

    // Navigate away to a different page
    await page.goto(`/account/${ACCOUNT_UUID}/open`);
    await page.waitForLoadState('networkidle');

    // Navigate back to universe – intercept the API request
    const requestPromise = page.waitForRequest(function isUniverseGet(req) {
      return req.url().includes('/api/universe') && req.method() === 'GET';
    });
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');

    const request = await requestPromise;
    const { sortBy, sortOrder } = extractSortParams(request.url());
    // risk_group maps to 'name'
    expect(sortBy).toBe('name');
    expect(sortOrder).toBe('asc');
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

    const requestPromise = page.waitForRequest(function isOpenTradesGet(req) {
      return req.url().includes('/api/trades/open') && req.method() === 'GET';
    });

    await page.goto(`/account/${ACCOUNT_UUID}/open`);
    await page.waitForLoadState('networkidle');

    const request = await requestPromise;
    const { sortBy, sortOrder } = extractSortParams(request.url());

    // buyDate maps to 'openDate' on the server
    expect(sortBy).toBe('openDate');
    expect(sortOrder).toBe('desc');
  });

  test('should send unrealizedGain sort param when pre-set', async ({
    page,
  }) => {
    await setSortState(page, 'trades-open', 'unrealizedGain', 'asc');

    const requestPromise = page.waitForRequest(function isOpenTradesGet(req) {
      return req.url().includes('/api/trades/open') && req.method() === 'GET';
    });

    await page.goto(`/account/${ACCOUNT_UUID}/open`);
    await page.waitForLoadState('networkidle');

    const request = await requestPromise;
    const { sortBy, sortOrder } = extractSortParams(request.url());
    expect(sortBy).toBe('unrealizedGain');
    expect(sortOrder).toBe('asc');
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

    const requestPromise = page.waitForRequest(function isClosedTradesGet(req) {
      return req.url().includes('/api/trades/closed') && req.method() === 'GET';
    });

    await page.goto(`/account/${ACCOUNT_UUID}/sold`);
    await page.waitForLoadState('networkidle');

    const request = await requestPromise;
    const { sortBy, sortOrder } = extractSortParams(request.url());

    // sell_date maps to 'closeDate' on the server
    expect(sortBy).toBe('closeDate');
    expect(sortOrder).toBe('asc');
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

    // Navigate to universe and verify its sort params
    const universeReqPromise = page.waitForRequest(function isUniverseGet(req) {
      return req.url().includes('/api/universe') && req.method() === 'GET';
    });
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');
    const universeReq = await universeReqPromise;
    const universeParams = extractSortParams(universeReq.url());
    expect(universeParams.sortBy).toBe('symbol');
    expect(universeParams.sortOrder).toBe('asc');

    // Navigate to closed trades and verify its sort params
    const closedReqPromise = page.waitForRequest(function isClosedTradesGet(
      req
    ) {
      return req.url().includes('/api/trades/closed') && req.method() === 'GET';
    });
    await page.goto(`/account/${ACCOUNT_UUID}/sold`);
    await page.waitForLoadState('networkidle');
    const closedReq = await closedReqPromise;
    const closedParams = extractSortParams(closedReq.url());
    expect(closedParams.sortBy).toBe('closeDate');
    expect(closedParams.sortOrder).toBe('desc');
  });

  test('should not send sort params when no sort state exists', async ({
    page,
  }) => {
    // No sort state in localStorage — interceptor should not add params
    const requestPromise = page.waitForRequest(function isUniverseGet(req) {
      return req.url().includes('/api/universe') && req.method() === 'GET';
    });

    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');

    const request = await requestPromise;
    const { sortBy, sortOrder } = extractSortParams(request.url());
    expect(sortBy).toBeNull();
    expect(sortOrder).toBeNull();
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
