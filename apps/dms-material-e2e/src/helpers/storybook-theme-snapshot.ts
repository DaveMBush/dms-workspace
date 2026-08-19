import { expect, Page } from 'playwright/test';

const storybookBaseUrl =
  process.env['STORYBOOK_BASE_URL'] ??
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
  storyId: string,
): Promise<void> {
  const baseUrl = `${storybookBaseUrl}${storyId}`;

  // Light theme
  await page.goto(`${baseUrl}&globals=theme:Light`);
  await page.waitForLoadState('load');
  await page.locator('#storybook-root').waitFor({ state: 'attached' });
  await expect(page).toHaveScreenshot(`${storyId}-light.png`);

  // Dark theme — apply .dark-theme on #storybook-root so Angular component
  // CSS custom property overrides cascade into the rendered template.
  // withThemeByClassName only sets body.classList, but Storybook's Angular
  // components render inside #storybook-root; body-level selectors never
  // reach them.
  await page.goto(`${baseUrl}&globals=theme:Dark`);
  await page.waitForLoadState('load');
  await page.locator('#storybook-root').waitFor({ state: 'attached' });
  await page.evaluate(function applyDarkTheme() {
    document.getElementById('storybook-root')?.classList.add('dark-theme');
  });
  await expect(page).toHaveScreenshot(`${storyId}-dark.png`);
}
