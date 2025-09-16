import { expect, Page } from '@playwright/test';

/**
 * Verify that data tables load with authentication
 */
export async function verifyDataTableLoads(
  page: Page,
  tableTestId: string
): Promise<void> {
  await expect(page.locator(`[data-testid="${tableTestId}"]`)).toBeVisible();

  // Wait for data to load (table should have rows)
  await expect(
    page.locator(`[data-testid="${tableTestId}"] tbody tr`)
  ).toHaveCount({ min: 1 });
}
