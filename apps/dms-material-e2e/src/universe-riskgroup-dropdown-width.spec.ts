import { expect, test } from 'playwright/test';

import { login } from './helpers/login.helper';
import { initializePrismaClient } from './helpers/shared-prisma-client.helper';
import { createRiskGroups } from './helpers/shared-risk-groups.helper';

/**
 * Universe Screen Risk Group Filter Dropdown Width E2E Tests (Story 49.2)
 *
 * Verifies that the Risk Group filter dropdown panel on the Universe screen
 * displays options without text wrapping after the Story 49.1 fix
 * (panelWidth="" applied to mat-select, allowing natural content width).
 *
 * Risk groups seeded: "Equities", "Income", "Tax Free Income"
 * "Tax Free Income" is the longest name and exercises the overflow scenario.
 */

test.describe('Universe Risk Group Filter Dropdown Width', () => {
  test.beforeAll(async () => {
    const prisma = await initializePrismaClient();
    try {
      await createRiskGroups(prisma);
    } finally {
      await prisma.$disconnect();
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('dms-base-table')).toBeVisible({
      timeout: 15000,
    });
  });

  test('Risk Group filter dropdown options do not overflow horizontally', async ({
    page,
  }) => {
    // Risk Group filter mat-select uses panelWidth="" (content width)
    const riskGroupSelect = page.locator(
      'tr.filter-row mat-select[panelwidth=""]'
    );
    await expect(riskGroupSelect).toHaveCount(1);
    await expect(riskGroupSelect).toBeVisible({ timeout: 10000 });

    // Open the dropdown panel
    await riskGroupSelect.click();

    // Wait for the panel to appear
    const panel = page.locator('.mat-mdc-select-panel');
    await expect(panel).toBeVisible({ timeout: 10000 });

    // Assert no mat-option element has horizontal text overflow
    const hasOverflow = await page.evaluate(() => {
      const options = document.querySelectorAll(
        '.mat-mdc-select-panel mat-option'
      );
      return Array.from(options).some(
        (el) =>
          (el as HTMLElement).scrollWidth > (el as HTMLElement).clientWidth
      );
    });
    expect(hasOverflow).toBe(false);

    // Close the panel
    await page.keyboard.press('Escape');
  });

  test('Risk Group filter dropdown panel is at least as wide as its widest option label', async ({
    page,
  }) => {
    // Risk Group filter mat-select uses panelWidth="" (content width)
    const riskGroupSelect = page.locator(
      'tr.filter-row mat-select[panelwidth=""]'
    );
    await expect(riskGroupSelect).toHaveCount(1);
    await expect(riskGroupSelect).toBeVisible({ timeout: 10000 });

    // Open the dropdown panel
    await riskGroupSelect.click();

    // Wait for the panel to appear
    const panel = page.locator('.mat-mdc-select-panel');
    await expect(panel).toBeVisible({ timeout: 10000 });

    // Measure panel width
    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();

    // Measure the widest option label's rendered width
    const widestOptionLabelWidth = await page.evaluate(() => {
      const options = document.querySelectorAll(
        '.mat-mdc-select-panel mat-option'
      );
      let maxWidth = 0;
      options.forEach((el) => {
        const w = (el as HTMLElement).scrollWidth;
        if (w > maxWidth) {
          maxWidth = w;
        }
      });
      return maxWidth;
    });

    // Panel must be at least as wide as the widest option label
    expect(panelBox!.width).toBeGreaterThanOrEqual(widestOptionLabelWidth - 1);

    // Close the panel
    await page.keyboard.press('Escape');
  });
});
