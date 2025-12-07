import { workspaceRoot } from '@nx/devkit';
import { nxE2EPreset } from '@nx/playwright/preset';
import { defineConfig, devices } from '@playwright/test';

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://localhost:4201';

// Use PostgreSQL in CI (server is built with PostgreSQL schema)
// Use SQLite locally
const databaseUrl = process.env.CI
  ? 'postgresql://ci_user:test_password@localhost:5432/ci_rms?schema=public'
  : 'file:./database.db';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  /* Run your local dev server before starting the tests */
  webServer: process.env.CI
    ? [
        // In CI: start backend server with PostgreSQL
        {
          command: `DATABASE_URL="${databaseUrl}" pnpm exec nx run server:serve`,
          url: 'http://localhost:3000/health',
          reuseExistingServer: false,
          cwd: workspaceRoot,
          timeout: 120000,
        },
        // Start frontend server
        {
          command: 'pnpm exec nx run rms-material:serve',
          url: 'http://localhost:4201',
          reuseExistingServer: false,
          cwd: workspaceRoot,
          timeout: 120000,
        },
      ]
    : // Locally: just frontend (assumes backend running separately if needed)
      {
        command: 'pnpm exec nx run rms-material:serve',
        url: 'http://localhost:4201',
        reuseExistingServer: true,
        cwd: workspaceRoot,
        timeout: 120000,
      },
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
