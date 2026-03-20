import { defineConfig, devices } from '@playwright/test';

const storybookURL = process.env['STORYBOOK_URL'] ?? 'http://localhost:6006';

// eslint-disable-next-line import/no-default-export -- Playwright requires default export
export default defineConfig({
  testDir: './src',
  testMatch: 'storybook-visual.spec.ts',
  timeout: 30000,
  retries: 0,
  fullyParallel: true,
  workers: process.env['CI'] !== undefined ? 1 : undefined,
  reporter:
    process.env['CI'] !== undefined
      ? [['github'], ['html', { open: 'never' }]]
      : [['list']],
  snapshotPathTemplate:
    '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}',
  use: {
    baseURL: storybookURL,
    trace: 'off',
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.001,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm exec http-server dist/storybook -p 6006 --silent',
    url: storybookURL,
    reuseExistingServer: true,
    timeout: 30000,
  },
});
