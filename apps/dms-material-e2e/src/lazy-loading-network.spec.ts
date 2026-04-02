import { expect, Page, Request, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedLazyLoadingE2eData } from './helpers/seed-lazy-loading-e2e-data.helper';

/** Maximum rows the server should return in a single indexes request */
const MAX_PAGE_SIZE = 50;

interface PartialArray {
  startIndex: number;
  indexes: string[];
  length: number;
}

interface TopResponse {
  id: string;
  accounts: string[];
  universes: PartialArray;
  riskGroups: string[];
}

interface CapturedIndexesRequest {
  request: Request;
  body: { startIndex: number; length: number; childField: string };
  response: PartialArray;
}

/**
 * Capture POST /api/top responses and extract the universes partial array.
 */
function captureTopResponses(page: Page): PartialArray[] {
  const captured: PartialArray[] = [];

  page.on('response', function onResponse(response) {
    if (response.request().method() !== 'POST') {
      return;
    }
    if (!response.url().includes('/api/top')) {
      return;
    }
    // Skip /api/top/indexes — we capture those separately
    if (response.url().includes('/indexes')) {
      return;
    }
    response
      .json()
      .then(function handleJson(json: TopResponse[]) {
        if (Array.isArray(json) && json.length > 0 && json[0].universes) {
          captured.push(json[0].universes);
        }
      })
      .catch(function noop() {
        /* ignore */
      });
  });

  return captured;
}

/**
 * Capture POST requests to an /indexes endpoint.
 */
function captureIndexesRequests(
  page: Page,
  urlPattern: string
): CapturedIndexesRequest[] {
  const captured: CapturedIndexesRequest[] = [];

  page.on('request', function onRequest(request) {
    if (request.method() !== 'POST') {
      return;
    }
    if (!request.url().includes(urlPattern)) {
      return;
    }
    const postData = request.postData();
    if (postData === null) {
      return;
    }
    try {
      const body = JSON.parse(postData) as CapturedIndexesRequest['body'];
      if (typeof body.startIndex === 'number') {
        captured.push({
          request,
          body,
          response: { startIndex: 0, indexes: [], length: 0 },
        });
      }
    } catch {
      // Ignore non-JSON requests
    }
  });

  page.on('response', function onResponse(response) {
    if (response.request().method() !== 'POST') {
      return;
    }
    if (!response.url().includes(urlPattern)) {
      return;
    }
    const entry = captured.find(function matchRequest(
      e: CapturedIndexesRequest
    ): boolean {
      return e.request === response.request();
    });
    if (entry === undefined) {
      return;
    }
    response
      .json()
      .then(function handleJson(json: PartialArray) {
        entry.response = json;
      })
      .catch(function noop() {
        /* ignore */
      });
  });

  return captured;
}

/**
 * Wait for table rows to appear on the page.
 */
async function waitForTableRows(page: Page): Promise<void> {
  await expect(page.locator('dms-base-table')).toBeVisible({ timeout: 15000 });
  await page.waitForSelector('tr.mat-mdc-row', { timeout: 15000 });
}

// ─── Lazy Loading Network Traffic E2E Tests ──────────────────────────────────

test.describe('Lazy Loading Network Traffic', () => {
  let cleanup: () => Promise<void>;
  let accountId: string;

  test.beforeAll(async () => {
    const seeder = await seedLazyLoadingE2eData();
    cleanup = seeder.cleanup;
    accountId = seeder.accountId;
  });

  test.afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  // ─── Universe Table Tests ──────────────────────────────────────────────

  test.describe('Universe Table', () => {
    test('initial load should fetch ≤ page-size rows, not all rows', async ({
      page,
    }) => {
      const topResponses = captureTopResponses(page);

      await login(page);
      await page.goto('/global/universe');
      await waitForTableRows(page);

      // Wait for API responses to settle
      await page.waitForTimeout(1500);

      expect(topResponses.length).toBeGreaterThanOrEqual(1);

      const universes = topResponses[0];

      // The total count should be ≥ 100 (our seed count)
      expect(universes.length).toBeGreaterThanOrEqual(100);

      // The initial page should return ≤ MAX_PAGE_SIZE indexes
      expect(universes.indexes.length).toBeLessThanOrEqual(MAX_PAGE_SIZE);
      expect(universes.indexes.length).toBeGreaterThan(0);

      // startIndex should be 0 for initial load
      expect(universes.startIndex).toBe(0);
    });

    test('scrolling should trigger subsequent requests with higher offsets', async ({
      page,
    }) => {
      const indexesRequests = captureIndexesRequests(page, '/api/top/indexes');

      await login(page);
      await page.goto('/global/universe');
      await waitForTableRows(page);
      await page.waitForTimeout(1500);

      // Scroll the virtual viewport incrementally to trigger range changes
      for (let i = 0; i < 5; i++) {
        await page.evaluate(function scrollDown(step: number): void {
          const viewport = document.querySelector(
            'cdk-virtual-scroll-viewport'
          );
          if (viewport !== null) {
            (viewport as HTMLElement).scrollTop = (step + 1) * 1500;
          }
        }, i);
        await page.waitForTimeout(500);
      }

      // Wait for requests
      await page.waitForTimeout(3000);

      // We should have at least one indexes request after scrolling
      expect(indexesRequests.length).toBeGreaterThan(0);

      // Find requests with startIndex > 0 (proving scroll-triggered load)
      const scrollRequests = indexesRequests.filter(
        function filterScrollRequests(entry: CapturedIndexesRequest): boolean {
          return entry.body.startIndex > 0;
        }
      );
      expect(scrollRequests.length).toBeGreaterThanOrEqual(1);

      // The response startIndex must match what was requested
      for (const entry of scrollRequests) {
        expect(entry.response.startIndex).toBe(entry.body.startIndex);
      }
    });
  });

  // ─── Open Positions Table Tests ────────────────────────────────────────

  test.describe('Open Positions Table', () => {
    test('initial load should fetch ≤ page-size rows, not all rows', async ({
      page,
    }) => {
      const indexesRequests = captureIndexesRequests(
        page,
        '/api/accounts/indexes'
      );

      await login(page);
      await page.goto(`/account/${accountId}/open`);
      await expect(
        page.locator('[data-testid="open-positions-table"]')
      ).toBeVisible({ timeout: 15000 });
      await page.waitForSelector('tr.mat-mdc-row', { timeout: 15000 });

      // Wait for indexes requests to complete
      await page.waitForTimeout(2000);

      // Filter to openTrades requests only
      const openTradeRequests = indexesRequests.filter(
        function filterOpenTrades(entry: CapturedIndexesRequest): boolean {
          return entry.body.childField === 'openTrades';
        }
      );
      expect(openTradeRequests.length).toBeGreaterThanOrEqual(1);

      // The first request should be for the beginning of the list
      const firstEntry = openTradeRequests[0];

      // The response should report the total count (we seeded 80)
      expect(firstEntry.response.length).toBeGreaterThanOrEqual(50);

      // The indexes returned should be ≤ page size
      expect(firstEntry.response.indexes.length).toBeLessThanOrEqual(
        MAX_PAGE_SIZE
      );
    });
  });
});
