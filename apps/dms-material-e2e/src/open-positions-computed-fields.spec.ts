import { expect, Page, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { seedOpenPositionsE2eData } from './helpers/seed-open-positions-e2e-data.helper';

/**
 * Story 97.4 — E2E: Computed Columns Present in Open Positions Table
 *
 * Regression guard: confirms that the five server-supplied computed columns
 * (Expected $, Unrlz Gain %, Unrlz Gain$, Target Gain, Target Sell) display
 * non-blank, numerically-valid values and cannot silently go blank again.
 *
 * Pattern:
 * - Request-based seeding via Prisma (no networkidle, no route.abort)
 * - Column index resolved dynamically from <th> header text
 * - expect.poll used to handle async render
 */

/** The five column headers whose cells must be non-blank and numeric. */
const TARGET_HEADERS = [
  'Expected $',
  'Unrlz Gain %',
  'Unrlz Gain$',
  'Target Gain',
  'Target Sell',
] as const;

/**
 * Wait for the open-positions table to appear and at least one data row to render.
 */
async function waitForTableRows(page: Page): Promise<void> {
  await expect(
    page.locator('[data-testid="open-positions-table"]')
  ).toBeVisible({ timeout: 15000 });
  await page.waitForSelector('tr.mat-mdc-row', { timeout: 15000 });
}

/**
 * Resolve the 1-based column index for a given header string by scanning all
 * <th> elements in the first header row.  Using dynamic lookup ensures the
 * test does not break if column order ever changes.
 */
async function getColumnIndex(page: Page, headerText: string): Promise<number> {
  const headers = page
    .locator('tr.mat-mdc-header-row:not(.filter-row)')
    .first()
    .locator('th');
  const count = await headers.count();
  for (let i = 0; i < count; i++) {
    const raw = (await headers.nth(i).textContent()) ?? '';
    // Normalise whitespace — sort-header buttons may inject extra spaces.
    const normalised = raw.replace(/\s+/g, ' ').trim();
    if (normalised.includes(headerText)) {
      return i + 1; // 1-based for :nth-child selector
    }
  }
  throw new Error(
    `Column header "${headerText}" not found in open-positions table`
  );
}

/**
 * Returns true when the string, after stripping "$", ",", and "%", parses to
 * a finite number.  An empty string or "—" will return false.
 */
function isNumericCellText(text: string): boolean {
  const stripped = text.replace(/[$,%]/g, '').trim();
  if (stripped.length === 0) {
    return false;
  }
  return Number.isFinite(parseFloat(stripped));
}

// ─── Open Positions Computed Fields E2E ──────────────────────────────────────

test.describe('Open Positions — Computed Columns Render Non-Blank Values (Story 97.4)', () => {
  let cleanup: () => Promise<void>;
  let accountId: string;

  test.beforeAll(async () => {
    const seeder = await seedOpenPositionsE2eData();
    cleanup = seeder.cleanup;
    accountId = seeder.accountId;
  });

  test.afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  test(
    'Expected $, Unrlz Gain %, Unrlz Gain$, Target Gain, and Target Sell ' +
      'each display a non-blank finite number for the seeded row',
    async ({ page }) => {
      await login(page);
      await page.goto(`/account/${accountId}/open`);
      await waitForTableRows(page);

      // Resolve column indexes from header text — do NOT hard-code ordinals.
      const columnIndexes = new Map<string, number>();
      for (const header of TARGET_HEADERS) {
        columnIndexes.set(header, await getColumnIndex(page, header));
      }

      // For each target column, poll until the first data-row cell contains
      // non-blank, numerically-valid text.  Using expect.poll handles async
      // rendering without relying on networkidle.
      for (const header of TARGET_HEADERS) {
        const colIdx = columnIndexes.get(header)!;
        const cell = page
          .locator(`tr.mat-mdc-row td:nth-child(${colIdx})`)
          .first();

        await expect
          .poll(
            async () => {
              const text = ((await cell.textContent()) ?? '').trim();
              return text;
            },
            {
              message: `Column "${header}" cell should contain non-blank text`,
              timeout: 10000,
            }
          )
          .not.toBe('');

        const cellText = ((await cell.textContent()) ?? '').trim();
        expect(
          isNumericCellText(cellText),
          `Column "${header}" value "${cellText}" should parse as a finite number`
        ).toBe(true);
      }
    }
  );
});
