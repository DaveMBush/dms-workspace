import { expect, Page, Request, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedScrollDivDepositsData } from './helpers/seed-scroll-div-deposits-data.helper';

/** Maximum rows the server should return in a single indexes request */
const MAX_PAGE_SIZE = 50;

/** Number of dividend deposit rows seeded for this test suite */
const SEEDED_ROW_COUNT = 60;

interface PartialArray {
  startIndex: number;
  indexes: string[];
  length: number;
}

interface CapturedIndexesRequest {
  request: Request;
  body: { startIndex: number; length: number; childField: string };
  response: PartialArray;
}

/**
 * Capture POST requests to /api/accounts/indexes and their responses.
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
 * Wait for the dividend deposits table to render rows.
 */
async function waitForDivDepositsTable(page: Page): Promise<void> {
  await expect(page.locator('dms-base-table')).toBeVisible({ timeout: 15000 });
  await page.waitForSelector('tr.mat-mdc-row', { timeout: 15000 });
}

// ─── Lazy Loading Network Traffic: Dividend Deposits ────────────────────────

test.describe('Lazy Loading Network Traffic - Dividend Deposits', () => {
  let cleanup: () => Promise<void>;
  let accountId: string;

  test.beforeAll(async () => {
    const seeder = await seedScrollDivDepositsData();
    cleanup = seeder.cleanup;
    accountId = seeder.accountId;
  });

  test.afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  test('initial load should fetch ≤ page-size rows, not all rows', async ({
    page,
  }) => {
    const indexesRequests = captureIndexesRequests(
      page,
      '/api/accounts/indexes'
    );

    await login(page);
    await page.goto(`/account/${accountId}/div-dep`);
    await waitForDivDepositsTable(page);

    // Wait for indexes requests to complete
    await page.waitForTimeout(2000);

    // Filter to divDeposits requests only
    const divDepositRequests = indexesRequests.filter(
      function filterDivDeposits(entry: CapturedIndexesRequest): boolean {
        return entry.body.childField === 'divDeposits';
      }
    );
    expect(divDepositRequests.length).toBeGreaterThanOrEqual(1);

    const firstEntry = divDepositRequests[0];

    // The response should report the total seeded count
    expect(firstEntry.response.length).toBeGreaterThanOrEqual(SEEDED_ROW_COUNT);

    // The indexes returned for a single request must be ≤ MAX_PAGE_SIZE
    expect(firstEntry.response.indexes.length).toBeLessThanOrEqual(
      MAX_PAGE_SIZE
    );
    expect(firstEntry.response.indexes.length).toBeGreaterThan(0);

    // No single request should load all rows at once
    expect(firstEntry.response.indexes.length).toBeLessThan(
      firstEntry.response.length
    );
  });

  test('scrolling should trigger incremental requests, not a bulk fetch', async ({
    page,
  }) => {
    const indexesRequests = captureIndexesRequests(
      page,
      '/api/accounts/indexes'
    );

    await login(page);
    await page.goto(`/account/${accountId}/div-dep`);
    await waitForDivDepositsTable(page);
    await page.waitForTimeout(1500);

    // Scroll the virtual viewport incrementally to trigger range changes
    for (let i = 0; i < 5; i++) {
      await page.evaluate(function scrollDown(step: number): void {
        const viewport = document.querySelector('cdk-virtual-scroll-viewport');
        if (viewport !== null) {
          (viewport as HTMLElement).scrollTop = (step + 1) * 1000;
        }
      }, i);
      await page.waitForTimeout(500);
    }

    // Wait for all requests to settle
    await page.waitForTimeout(3000);

    const divDepositRequests = indexesRequests.filter(
      function filterDivDeposits(entry: CapturedIndexesRequest): boolean {
        return entry.body.childField === 'divDeposits';
      }
    );
    expect(divDepositRequests.length).toBeGreaterThanOrEqual(1);

    // Verify every individual response returns at most MAX_PAGE_SIZE indexes
    for (const entry of divDepositRequests) {
      expect(entry.response.indexes.length).toBeLessThanOrEqual(MAX_PAGE_SIZE);
    }

    // Find scroll-triggered requests (startIndex > 0)
    const scrollRequests = divDepositRequests.filter(
      function filterScrollRequests(entry: CapturedIndexesRequest): boolean {
        return entry.body.startIndex > 0;
      }
    );
    // After scrolling past the first page, at least one offset request appears
    expect(scrollRequests.length).toBeGreaterThanOrEqual(1);

    // The response startIndex must match what was requested (no offset mismatch)
    for (const entry of scrollRequests) {
      expect(entry.response.startIndex).toBe(entry.body.startIndex);
    }
  });
});
