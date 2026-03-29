import { expect, Page } from '@playwright/test';

const STORYBOOK_BASE_URL =
  'http://localhost:6006/iframe.html?viewMode=story&id=';

/**
 * Capture Storybook screenshots of a single story in both light and dark themes.
 *
 * Uses the @storybook/addon-themes `globals` URL parameter to toggle theme,
 * which applies the correct CSS class via `withThemeByClassName` configured
 * in Storybook's preview.ts.
 */
export async function captureStoryInBothThemes(
  page: Page,
  storyId: string
): Promise<void> {
  const baseUrl = `${STORYBOOK_BASE_URL}${storyId}`;

  // Light theme
  await page.goto(`${baseUrl}&globals=theme:Light`);
  await page.waitForLoadState('load');
  await page.locator('#storybook-root').waitFor({ state: 'attached' });
  await expect(page).toHaveScreenshot(`${storyId}-light.png`);

  // Dark theme
  await page.goto(`${baseUrl}&globals=theme:Dark`);
  await page.waitForLoadState('load');
  await page.locator('#storybook-root').waitFor({ state: 'attached' });
  await expect(page).toHaveScreenshot(`${storyId}-dark.png`);
}
