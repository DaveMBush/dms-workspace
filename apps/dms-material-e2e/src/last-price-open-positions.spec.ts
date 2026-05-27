import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedLastPriceE2eData } from './helpers/seed-last-price-e2e-data.helper';

/**
 * Story 99.3 — E2E: `Last $` Populated on Open Positions Tab
 *
 * Regression guard: confirms that the `Last $` column on the Open Positions
 * tab renders the correct formatted price for a position with a known
 * Universe.last_price, and follows the existing `$0.00` convention for a
 * position whose last_price is 0.
 *
 * Pattern:
 * - Request-based seeding via Prisma (no networkidle, no route.abort)
 * - API pre-check against POST /api/trades to confirm Story 99.2 server
 *   wiring is intact; failure pinpoints whether server or UI is broken
 * - Column index resolved dynamically from <th> header text
 * - expect.poll used to handle async render
 *
 * Architecture note: `Last $` value MUST come from Trade.last_price returned
 * by the server (wired in Story 99.2 / mapTradeToResponse).  Any reintroduction
 * of a client-side universe.map lookup would be a regression of Epic 96.
 */

/** The known non-null last price seeded for Symbol A. */
const SYMBOL_A_LAST_PRICE = 123.45;

/**
 * Expected formatted cell text for Symbol A.
 * Angular `currency` pipe default (en-US): `123.45 | currency` → `$123.45`.
 */
const EXPECTED_FORMATTED_A = '$123.45';

/**
 * Expected formatted cell text for Symbol B (last_price = 0).
 * Angular `currency` pipe: `0 | currency` → `$0.00`.
 * This is the existing project convention for missing/zero currency values on
 * the Open Positions screen (matches Expected $, Unrlz Gain$, Target Sell for
 * zero inputs) — confirmed in Story 99.1 conclusion.
 */
const EXPECTED_FORMATTED_B = '$0.00';

/**
 * Wait for the open-positions table to appear and at least one data row to
 * render.  Uses visibility + waitFor rather than networkidle (project
 * convention documented in Story 92.2 retrospective and Story 97.4 Dev Notes).
 */
async function waitForTableRows(page: Page): Promise<void> {
  const table = page.locator('[data-testid="open-positions-table"]');
  await expect(table).toBeVisible({ timeout: 15000 });
  await table.locator('.dms-body-row[role="row"]').first().waitFor({ timeout: 15000 });
}

/**
 * Resolve the 1-based column index for a given header string by scanning all
 * <th> elements in the first non-filter header row.  Dynamic lookup ensures
 * the test does not break if column order ever changes.
 *
 * Mirrors the pattern from Story 97.4 (`open-positions-computed-fields.spec.ts`).
 */
async function getColumnIndex(page: Page, headerText: string): Promise<number> {
  const headers = page
    .locator('.dms-column-header-row[role="row"]')
    .first()
    .locator('th');
  const count = await headers.count();
  for (let i = 0; i < count; i++) {
    const raw = (await headers.nth(i).textContent()) ?? '';
    // Normalise whitespace — Angular Material sort-header buttons may inject
    // extra spaces or invisible characters around the label.
    const normalised = raw.replace(/\s+/g, ' ').trim();
    if (normalised.includes(headerText)) {
      return i + 1; // 1-based for CSS :nth-child selector
    }
  }
  throw new Error(
    `Column header "${headerText}" not found in open-positions table`
  );
}

// ─── Last $ Column E2E ───────────────────────────────────────────────────────

test.describe('Open Positions — Last $ Column Renders Correctly (Story 99.3)', () => {
  let cleanup: (() => Promise<void>) | undefined;
  let accountId: string;
  let symbolA: string;
  let symbolB: string;
  let tradeIdA: string;
  let tradeIdB: string;

  test.beforeAll(async () => {
    const seeder = await seedLastPriceE2eData();
    cleanup = seeder.cleanup;
    accountId = seeder.accountId;
    symbolA = seeder.symbolA;
    symbolB = seeder.symbolB;
    tradeIdA = seeder.tradeIdA;
    tradeIdB = seeder.tradeIdB;
  });

  test.afterAll(async () => {
    if (cleanup !== undefined) {
      await cleanup();
    }
  });

  test('API pre-check: server returns last_price 123.45 for Symbol A and 0 for Symbol B', async ({
    request,
  }) => {
    // AC #1, AC #2, AC #3 — confirm server wiring (Story 99.2) is intact.
    // If this assertion fails, the bug is in mapTradeToResponse (server
    // side), not in the Angular column binding (client side).
    const response = await request.post('/api/trades', {
      data: [tradeIdA, tradeIdB],
    });
    expect(
      response.ok(),
      `POST /api/trades failed with status ${response.status()} — server may be down or route broken`
    ).toBe(true);

    const trades = (await response.json()) as Array<{
      id: string;
      // eslint-disable-next-line @typescript-eslint/naming-convention -- Server API returns snake_case property names matching DB column names
      last_price: number;
    }>;

    const tradeA = trades.find((t) => t.id === tradeIdA);
    const tradeB = trades.find((t) => t.id === tradeIdB);

    expect(
      tradeA,
      `Server did not return a Trade row for symbolA (${symbolA}) ` +
        `— mapTradeToResponse or POST /api/trades route is broken`
    ).toBeDefined();
    expect(
      tradeB,
      `Server did not return a Trade row for symbolB (${symbolB}) ` +
        `— mapTradeToResponse or POST /api/trades route is broken`
    ).toBeDefined();

    expect(
      tradeA!.last_price,
      `Server last_price for ${symbolA} was ${tradeA!.last_price}, ` +
        `expected ${SYMBOL_A_LAST_PRICE} — mapTradeToResponse did not ` +
        `forward Universe.last_price (Story 99.2 server wiring broken)`
    ).toBe(SYMBOL_A_LAST_PRICE);

    expect(
      tradeB!.last_price,
      `Server last_price for ${symbolB} was ${tradeB!.last_price}, ` +
        `expected 0 — mapTradeToResponse did not handle zero ` +
        `Universe.last_price (Story 99.2 server wiring broken)`
    ).toBe(0);
  });

  test('UI: Last $ cell shows $123.45 for Symbol A and $0.00 for Symbol B', async ({
    page,
  }) => {
    await login(page);
    await page.goto(`/account/${accountId}/open`);
    await waitForTableRows(page);

    // Resolve column index dynamically — do NOT hard-code numeric positions
    // (column order may change; pattern from Story 97.4).
    const lastPriceColIdx = await getColumnIndex(page, 'Last $');

    // ── Symbol A: assert the known price renders as "$123.45" ────────────
    const rowA = page
      .locator(`.dms-body-row[role="row"]:has(td:has-text("${symbolA}"))`)
      .first();
    const cellA = rowA.locator(`td:nth-child(${lastPriceColIdx})`);

    await expect
      .poll(async () => ((await cellA.textContent()) ?? '').trim(), {
        message:
          `Last $ cell for ${symbolA} should display ` +
          `${EXPECTED_FORMATTED_A} — if empty or wrong, check ` +
          `transformTradeToPosition (client binding) or server wiring`,
        timeout: 10000,
      })
      .toBe(EXPECTED_FORMATTED_A);

    // ── Symbol B: zero price → "$0.00"; must not expose null/NaN ────────
    const rowB = page
      .locator(`.dms-body-row[role="row"]:has(td:has-text("${symbolB}"))`)
      .first();

    await expect
      .poll(async () => rowB.isVisible(), {
        message: `Row for ${symbolB} should be visible on the Open Positions tab`,
        timeout: 10000,
      })
      .toBeTruthy();

    const cellB = rowB.locator(`td:nth-child(${lastPriceColIdx})`);

    await expect
      .poll(async () => ((await cellB.textContent()) ?? '').trim(), {
        message:
          `Last $ cell for ${symbolB} should display ` +
          `${EXPECTED_FORMATTED_B} (zero/missing price convention)`,
        timeout: 10000,
      })
      .toBe(EXPECTED_FORMATTED_B);

    const textB = ((await cellB.textContent()) ?? '').trim();
    expect(
      textB,
      `Last $ cell for ${symbolB} must not expose a literal ` +
        `null / undefined / NaN string — check the currency pipe path`
    ).not.toMatch(/null|undefined|NaN/i);
  });
});
