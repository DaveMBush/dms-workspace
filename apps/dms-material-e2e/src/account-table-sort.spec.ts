import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedDivDepositsE2eData } from './helpers/seed-div-deposits-e2e-data.helper';
import { seedOpenPositionsE2eData } from './helpers/seed-open-positions-e2e-data.helper';
import { seedSoldPositionsE2eData } from './helpers/seed-sold-positions-e2e-data.helper';

/**
 * Helper: clear sort-filter state from localStorage.
 */
async function clearSortFilterState(page: Page): Promise<void> {
  await page.evaluate(function removeSortFilterState(): void {
    localStorage.removeItem('dms-sort-filter-state');
  });
}

/**
 * Helper: collect trimmed text content from all visible cells in a column (1-based index).
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

/**
 * Helper: wait for dms-base-table and at least one data row.
 */
async function waitForTableRows(page: Page): Promise<void> {
  await expect(page.locator('dms-base-table')).toBeVisible({ timeout: 15000 });
  await page.waitForSelector('tr.mat-mdc-row', { timeout: 15000 });
}

// ─── Story 37.1: Account Table Sorting – Failing Tests ───────────────────────
//
// These tests verify that clicking a sortable column header on each Account
// table (Open Positions, Closed Positions, Dividend Deposits) reorders rows.
// They are INTENTIONALLY EXPECTED TO FAIL against the current buggy
// implementation (the sort icon appears but rows are not reordered).
//
// The tests will PASS once the underlying sort bug is fixed (Story 37.2+).

test.describe('Account Tables - Sorting (Story 37.1 - Failing Tests)', () => {
  // ─── Open Positions ────────────────────────────────────────────────────────
  //
  // Open Positions table key: trades-open
  // Sortable columns: buyDate (col 4), unrealizedGainPercent (col 8), unrealizedGain (col 9)
  //
  // Seeded buy dates (seedOpenPositionsE2eData):
  //   symbols[0] OPAAA-<id>  buyDate = 2025-01-15  (Jan → sorted 1st)
  //   symbols[1] OPBBB-<id>  buyDate = 2025-06-01  (Jun → sorted 3rd)
  //   symbols[2] OPCCC-<id>  buyDate = 2025-03-10  (Mar → sorted 2nd)
  //
  // Correct buy date ASC order: OPAAA → OPCCC → OPBBB
  // Buggy insertion order:      OPAAA → OPBBB → OPCCC  (OPBBB at idx 1, OPCCC at idx 2)
  //
  // Failing assertion: index(OPCCC) < index(OPBBB)  →  2 < 1  =  FALSE

  test.describe('Open Positions table sort', () => {
    let cleanupOpen: () => Promise<void>;
    let accountIdOpen: string;
    let symbolsOpen: string[];

    test.beforeAll(async () => {
      const seeder = await seedOpenPositionsE2eData();
      cleanupOpen = seeder.cleanup;
      accountIdOpen = seeder.accountId;
      symbolsOpen = seeder.symbols;
    });

    test.afterAll(async () => {
      if (cleanupOpen) {
        await cleanupOpen();
      }
    });

    test.beforeEach(async ({ page }) => {
      await login(page);
      await clearSortFilterState(page);
      await page.goto(`/account/${accountIdOpen}/open`);
      await waitForTableRows(page);
    });

    // EXPECTED TO FAIL: buggy implementation does not reorder rows
    test('clicking Buy Date header sorts Open Positions rows by buy date ascending (EXPECTED TO FAIL)', async ({
      page,
    }) => {
      test.fail(); // Intentional: documents known sort bug from Story 37.1
      // Click "Buy Date" column header to trigger ascending sort
      const header = page.getByRole('button', { name: 'Buy Date' });
      await header.click();
      await page.waitForTimeout(800);
      await page.waitForLoadState('networkidle');

      // Read Symbol column (col 1) text values after sort
      const symbolTexts = await getColumnTexts(page, 1);
      expect(symbolTexts.length).toBeGreaterThanOrEqual(3);

      // Correct ascending order by buy date: OPAAA (Jan) → OPCCC (Mar) → OPBBB (Jun)
      // OPCCC must appear BEFORE OPBBB.
      // This assertion FAILS against the buggy implementation because insertion
      // order places OPBBB at index 1 and OPCCC at index 2 (2 < 1 is false).
      const idxOPCCC = symbolTexts.indexOf(symbolsOpen[2]);
      const idxOPBBB = symbolTexts.indexOf(symbolsOpen[1]);
      expect(idxOPCCC).toBeGreaterThan(-1);
      expect(idxOPBBB).toBeGreaterThan(-1);
      expect(idxOPCCC).toBeLessThan(idxOPBBB);
    });
  });

  // ─── Closed Positions ─────────────────────────────────────────────────────
  //
  // Closed Positions table key: trades-closed
  // Sortable columns: sell_date (col 6)
  //
  // Seeded sell dates (seedSoldPositionsE2eData):
  //   symbols[0] SPAAA-<id>  sell_date = 2026-01-15  (Jan 2026 → sorted 3rd)
  //   symbols[1] SPBBB-<id>  sell_date = 2025-11-20  (Nov 2025 → sorted 2nd)
  //   symbols[2] SPCCC-<id>  sell_date = 2025-08-10  (Aug 2025 → sorted 1st)
  //
  // Correct sell date ASC order: SPCCC → SPBBB → SPAAA
  // Buggy insertion order:       SPAAA → SPBBB → SPCCC  (SPCCC at idx 2, SPBBB at idx 1)
  //
  // Failing assertion: index(SPCCC) < index(SPBBB)  →  2 < 1  =  FALSE

  test.describe('Closed Positions table sort', () => {
    let cleanupClosed: () => Promise<void>;
    let accountIdClosed: string;
    let symbolsClosed: string[];

    test.beforeAll(async () => {
      const seeder = await seedSoldPositionsE2eData();
      cleanupClosed = seeder.cleanup;
      accountIdClosed = seeder.accountId;
      symbolsClosed = seeder.symbols;
    });

    test.afterAll(async () => {
      if (cleanupClosed) {
        await cleanupClosed();
      }
    });

    test.beforeEach(async ({ page }) => {
      await login(page);
      await clearSortFilterState(page);
      await page.goto(`/account/${accountIdClosed}/sold`);
      await waitForTableRows(page);
    });

    // EXPECTED TO FAIL: buggy implementation does not reorder rows
    test('clicking Sell Date header sorts Closed Positions rows by sell date ascending (EXPECTED TO FAIL)', async ({
      page,
    }) => {
      test.fail(); // Intentional: documents known sort bug from Story 37.1
      // Click "Sell Date" column header to trigger ascending sort
      const header = page.getByRole('button', { name: 'Sell Date' });
      await header.click();
      await page.waitForTimeout(800);
      await page.waitForLoadState('networkidle');

      // Read Symbol column (col 1) text values after sort
      const symbolTexts = await getColumnTexts(page, 1);
      expect(symbolTexts.length).toBeGreaterThanOrEqual(3);

      // Correct ascending order by sell date: SPCCC (Aug 2025) → SPBBB (Nov 2025) → SPAAA (Jan 2026)
      // SPCCC must appear BEFORE SPBBB.
      // This assertion FAILS against the buggy implementation because insertion
      // order places SPCCC at index 2 and SPBBB at index 1 (2 < 1 is false).
      const idxSPCCC = symbolTexts.indexOf(symbolsClosed[2]);
      const idxSPBBB = symbolTexts.indexOf(symbolsClosed[1]);
      expect(idxSPCCC).toBeGreaterThan(-1);
      expect(idxSPBBB).toBeGreaterThan(-1);
      expect(idxSPCCC).toBeLessThan(idxSPBBB);
    });
  });

  // ─── Dividend Deposits ────────────────────────────────────────────────────
  //
  // Dividend Deposits table key: div-deposits
  // Sortable columns: symbol (col 1), date (col 2), amount (col 3)
  //
  // Seeded amounts (seedDivDepositsE2eData) in insertion order:
  //   Row 0: date=2025-01-15, amount=50   → $50.00
  //   Row 1: date=2025-06-01, amount=200  → $200.00
  //   Row 2: date=2025-03-10, amount=100  → $100.00
  //
  // Correct amount ASC order: $50.00, $100.00, $200.00  (rows 0, 2, 1)
  // Buggy insertion order:    $50.00, $200.00, $100.00  (rows 0, 1, 2)
  //   → $100.00 at idx 2, $200.00 at idx 1
  //
  // Failing assertion: index($100.00) < index($200.00)  →  2 < 1  =  FALSE

  test.describe('Dividend Deposits table sort', () => {
    let cleanupDD: () => Promise<void>;
    let accountIdDD: string;

    test.beforeAll(async () => {
      const seeder = await seedDivDepositsE2eData();
      cleanupDD = seeder.cleanup;
      accountIdDD = seeder.accountId;
    });

    test.afterAll(async () => {
      if (cleanupDD) {
        await cleanupDD();
      }
    });

    test.beforeEach(async ({ page }) => {
      await login(page);
      await clearSortFilterState(page);
      await page.goto(`/account/${accountIdDD}/div-dep`);
      await waitForTableRows(page);
    });

    // EXPECTED TO FAIL: buggy implementation does not reorder rows
    test('clicking Amount header sorts Dividend Deposits rows by amount ascending (EXPECTED TO FAIL)', async ({
      page,
    }) => {
      // Click "Amount" column header to trigger ascending sort
      const header = page.getByRole('button', { name: 'Amount' });
      await header.click();
      await page.waitForTimeout(800);
      await page.waitForLoadState('networkidle');

      // Read Amount column (col 3) text values after sort
      const amountTexts = await getColumnTexts(page, 3);
      expect(amountTexts.length).toBeGreaterThanOrEqual(3);

      // Correct ascending order: $50.00, $100.00, $200.00
      // $100.00 must appear BEFORE $200.00.
      // This assertion FAILS against the buggy implementation because insertion
      // order places $200.00 at index 1 and $100.00 at index 2 (2 < 1 is false).
      const idx100 = amountTexts.indexOf('$100.00');
      const idx200 = amountTexts.indexOf('$200.00');
      expect(idx100).toBeGreaterThan(-1);
      expect(idx200).toBeGreaterThan(-1);
      expect(idx100).toBeLessThan(idx200);
    });
  });
});
