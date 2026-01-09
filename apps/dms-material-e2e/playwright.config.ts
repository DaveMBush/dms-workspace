import { workspaceRoot } from '@nx/devkit';
import { nxE2EPreset } from '@nx/playwright/preset';
import { defineConfig, devices } from '@playwright/test';

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://localhost:4301';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
// Unset DISPLAY in WSL to prevent headless browser issues
if (process.env.WSL_DISTRO_NAME && !process.env.CI) {
  delete process.env.DISPLAY;
}

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  timeout: process.env.CI ? 90000 : 60000,
  /* Retry failed tests to handle flaky tests */
  retries: process.env.CI ? 2 : 1,
  use: {
    baseURL,
    /* Increase navigation timeout for slower backend responses */
    navigationTimeout: 60000,
    /* Increase action timeout */
    actionTimeout: 20000,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'pnpm nx run server:e2e-server',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: true,
      cwd: workspaceRoot,
      timeout: 120000,
      env: {
        ...process.env,
        NODE_ENV: process.env.CI ? 'local' : 'development',
        AWS_ENDPOINT_URL: 'http://localhost:4566',
        SKIP_AWS_AUTH: 'true',
      },
    },
    {
      command: 'pnpm nx run dms-material:serve:test',
      url: 'http://localhost:4301',
      reuseExistingServer: true,
      cwd: workspaceRoot,
      timeout: 120000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Uncomment for mobile browsers support
    /* {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    }, */

    // Uncomment for branded browsers
    /* {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    } */
  ],
});
