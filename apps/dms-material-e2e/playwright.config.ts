import { nxE2EPreset } from '@nx/playwright/preset';
import { defineConfig, devices } from '@playwright/test';
import { execSync } from 'child_process';
import * as path from 'path';

const localWorkspaceRoot = path.resolve(__dirname, '../..');

function computeWorktreePortOffset(workspaceRoot: string): number {
  let hash = 0;
  for (const character of workspaceRoot) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return 100 + (hash % 200);
}

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

let isGitWorktree = false;

const workspaceRoot = (function resolveWorkspaceRoot(): string {
  try {
    const commonGitDir = execSync('git rev-parse --git-common-dir', {
      cwd: localWorkspaceRoot,
      encoding: 'utf8',
    }).trim();
    isGitWorktree = path.isAbsolute(commonGitDir);
  } catch {
    isGitWorktree = false;
  }

  const configuredWorkspaceRoot =
    process.env['NX_WORKSPACE_ROOT_PATH'] ?? process.env['NX_WORKSPACE_ROOT'];
  if (configuredWorkspaceRoot) {
    const resolvedWorkspaceRoot = path.resolve(configuredWorkspaceRoot);
    process.env['NX_WORKSPACE_ROOT_PATH'] = resolvedWorkspaceRoot;
    return resolvedWorkspaceRoot;
  }

  process.env['NX_WORKSPACE_ROOT_PATH'] = localWorkspaceRoot;
  return localWorkspaceRoot;
})();

const portOffset = isGitWorktree
  ? computeWorktreePortOffset(localWorkspaceRoot)
  : 0;
const serverPort = Number(process.env['E2E_SERVER_PORT'] ?? 3001 + portOffset);
const appPort = Number(process.env['E2E_APP_PORT'] ?? 4301 + portOffset);
const storybookPort = Number(
  process.env['E2E_STORYBOOK_PORT'] ?? 6006 + portOffset
);
const baseURL =
  process.env['BASE_URL'] ?? `http://localhost:${String(appPort)}`;
const firefoxBaseURL = `http://127.0.0.1:${String(appPort)}`;
const storybookBaseUrl =
  process.env['STORYBOOK_BASE_URL'] ??
  `http://localhost:${String(storybookPort)}/iframe.html?viewMode=story&id=`;
const apiBaseUrl =
  process.env['E2E_API_BASE_URL'] ??
  `http://localhost:${String(serverPort)}/api`;
const reuseExistingServer = !isGitWorktree;
const hasExplicitTestPath = process.argv.some(
  (argument) => argument.endsWith('.spec.ts') || argument.includes('/src/')
);
const requiresStorybook =
  process.argv.some((argument) => argument.includes('storybook')) ||
  !hasExplicitTestPath;

process.env['BASE_URL'] = baseURL;
process.env['STORYBOOK_BASE_URL'] = storybookBaseUrl;
process.env['E2E_API_BASE_URL'] = apiBaseUrl;

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  timeout: process.env.CI ? 90000 : 60000,
  reporter: process.env.CI ? [['github']] : [['list']],
  /* Retry failed tests to handle flaky tests */
  retries: process.env.CI ? 3 : 2,
  /* Run tests serially to avoid database conflicts with shared SQLite test database */
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL,
    /* Increase navigation timeout for slower backend responses */
    navigationTimeout: 60000,
    /* Increase action timeout */
    actionTimeout: 20000,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Fix timezone to UTC so date rendering is deterministic regardless of host system timezone */
    timezoneId: 'UTC',
  },
  /* Configure test execution to run one project at a time */
  // Note: With workers: 1, tests will run serially, but by default they interleave between projects.
  // To avoid database conflicts, run browsers separately:
  // pnpm playwright test --project=chromium && pnpm playwright test --project=firefox
  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command:
        'pnpm nx run server:prepare-e2e-db && pnpm nx run server:build && node dist/apps/server/main.js',
      url: `http://localhost:${String(serverPort)}/api/health`,
      reuseExistingServer,
      cwd: workspaceRoot,
      timeout: 180000,
      env: {
        ...process.env,
        DATABASE_URL: 'file:./test-database.db',
        NODE_ENV: process.env.CI ? 'local' : 'development',
        PORT: String(serverPort),
        AWS_ENDPOINT_URL: 'http://localhost:4566',
        SKIP_AWS_AUTH: 'true',
      },
    },
    {
      command:
        `pnpm nx run dms-material:serve-e2e --port=${String(appPort)} ` +
        '--proxyConfig=apps/dms-material/proxy.playwright.conf.js',
      url: baseURL,
      reuseExistingServer,
      cwd: workspaceRoot,
      timeout: 180000,
      env: {
        ...process.env,
        E2E_API_PROXY_TARGET: `http://localhost:${String(serverPort)}`,
        NODE_OPTIONS: '--max-old-space-size=4096',
      },
    },
    ...(requiresStorybook
      ? [
          {
            command: `pnpm nx run dms-material:storybook --port ${String(
              storybookPort
            )}`,
            url: `http://localhost:${String(storybookPort)}`,
            reuseExistingServer,
            cwd: workspaceRoot,
            timeout: 300000,
          },
        ]
      : []),
  ],
  projects: [
    {
      name: 'chromium',
      testIgnore: [
        '**/system-integration.spec.ts',
        '**/volatility-visibility.spec.ts',
        '**/electron-*.spec.ts',
      ],
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      testIgnore: [
        '**/system-integration.spec.ts',
        '**/volatility-visibility.spec.ts',
        '**/electron-*.spec.ts',
      ],
      use: {
        ...devices['Desktop Firefox'],
        // Firefox on Linux resolves 'localhost' to ::1 (IPv6), but the dev server
        // only listens on IPv4. Override baseURL to use 127.0.0.1 explicitly.
        baseURL: firefoxBaseURL,
      },
    },

    {
      name: 'integration',
      testMatch: [
        '**/system-integration.spec.ts',
        '**/volatility-visibility.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4201',
        navigationTimeout: 120_000,
        actionTimeout: 60_000,
      },
    },

    // Temporarily disabled due to missing libicui18n.so.74 dependency
    // See: https://github.com/microsoft/playwright/issues/30368
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    {
      name: 'electron',
      testMatch: ['**/electron-*.spec.ts'],
      testIgnore: ['**/electron-smoke.spec.ts'],
      // No baseURL — the test launches Electron directly
      use: {},
    },

    {
      name: 'electron-smoke',
      testMatch: ['**/electron-smoke.spec.ts'],
      // Release-gate test: installs the packaged .deb; requires root (sudo).
      // Run via: sudo pnpm e2e:electron:smoke
      // NOT included in the default pnpm all pipeline.
      use: {},
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
