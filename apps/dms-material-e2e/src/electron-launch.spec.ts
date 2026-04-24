import fs from 'fs';
import path from 'path';

import {
  _electron as electron,
  ElectronApplication,
  Locator,
  Page,
} from 'playwright';
import { expect, test } from 'playwright/test';

const ELECTRON_MAIN_PATH = path.join(__dirname, '../../electron/dist/main.js');

const distExists = fs.existsSync(ELECTRON_MAIN_PATH);
const electronEnv = {
  ...process.env,
  DMS_NODE_EXEC_PATH: process.execPath,
  DMS_ENABLE_MOCK_AUTH: '1',
  ELECTRON_TEST_MODE: '1',
};

delete electronEnv.ELECTRON_RUN_AS_NODE;

function expectSingleWindow(app: ElectronApplication): void {
  expect(app.windows()).toHaveLength(1);
}

async function isVisibleWithinTimeout(
  locator: Locator,
  timeout: number
): Promise<boolean> {
  try {
    await locator.waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

async function expectPathname(
  window: Page,
  pathnamePattern: RegExp
): Promise<void> {
  await expect
    .poll(
      function readPathname(): string {
        return new URL(window.url()).pathname;
      },
      { timeout: 15000 }
    )
    .toMatch(pathnamePattern);
}

async function ensureAuthenticatedShell(window: Page): Promise<void> {
  const universeNav = window.getByTestId('global-nav-universe');

  if (await isVisibleWithinTimeout(universeNav, 2000)) {
    return;
  }

  await expect(window.locator('input[type="email"]')).toBeVisible({
    timeout: 15000,
  });
  await window.locator('input[type="email"]').fill('test@example.com');
  await window.locator('input[type="password"]').fill('password123');
  await window.locator('button[type="submit"]').click();

  await expectPathname(window, /\/dashboard$/);
  await expect(window.getByTestId('global-nav-universe')).toBeVisible({
    timeout: 15000,
  });
}

async function ensureAccountExists(window: Page): Promise<void> {
  const firstAccount = window.getByTestId('account-item').first();

  if (await isVisibleWithinTimeout(firstAccount, 2000)) {
    return;
  }

  await window.getByTestId('add-account-button').click();

  const input = window.getByTestId('node-editor-input');
  const accountName = `Electron Test Account ${Date.now()}`;

  await expect(input).toBeVisible({ timeout: 5000 });
  await input.fill(accountName);
  await input.press('Enter');

  await expect(
    window.getByTestId('account-item').filter({ hasText: accountName })
  ).toBeVisible({ timeout: 10000 });
}

test.describe('Electron App Launch', () => {
  test.describe.configure({ mode: 'serial' });

  let app: ElectronApplication;
  let window: Page;
  const consoleErrors: string[] = [];

  test.beforeAll(async () => {
    if (!distExists) {
      // Mark all tests in this block as skipped and bail out of beforeAll.
      // test.skip() called in beforeAll skips all enclosed tests and
      // immediately halts the beforeAll hook.
      // TODO(E82): blocked — electron dist not built in test environment
      test.skip(
        true,
        'Electron dist not built — run: pnpm nx run electron:build'
      );
      return;
    }
    app = await electron.launch({
      args: [ELECTRON_MAIN_PATH],
      env: electronEnv,
      timeout: 30000,
    });

    window = await app.firstWindow();

    window.on('console', function onConsoleMessage(msg): void {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await window.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  test.afterEach(() => {
    if (app) {
      expectSingleWindow(app);
    }
  });

  test('AC#1: app launches and default home route renders without console errors', async () => {
    // The default home route (login page or dashboard) must be visible
    await expect(window.locator('body')).toBeVisible();
    // Verify the window has loaded some content — login or dashboard
    const bodyText = await window.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    // Assert no console errors during initial load
    expect(consoleErrors).toHaveLength(0);
  });

  test('AC#2: only one BrowserWindow is open on load', () => {
    expect(app.windows()).toHaveLength(1);
  });

  test('AC#3: global sidebar navigation stays in the same Electron window', async () => {
    await ensureAuthenticatedShell(window);

    await window.getByTestId('global-nav-universe').click();
    await expectPathname(window, /\/global\/universe$/);
    await expect(window.getByTestId('update-universe-button')).toBeVisible();
    expectSingleWindow(app);

    await window.getByTestId('global-nav-screener').click();
    await expectPathname(window, /\/global\/screener$/);
    await expect(window.getByTestId('screener-container')).toBeVisible();
    expectSingleWindow(app);

    await window.getByTestId('global-nav-summary').click();
    await expectPathname(window, /\/global\/summary$/);
    await expect(window.getByTestId('global-summary-container')).toBeVisible();
    expectSingleWindow(app);
  });

  test('AC#4: account navigation reaches Open Positions in the same Electron window', async () => {
    await ensureAuthenticatedShell(window);
    await ensureAccountExists(window);

    const firstAccount = window.getByTestId('account-item').first();

    await expect(firstAccount).toBeVisible({ timeout: 15000 });
    await firstAccount.click();
    await expectPathname(window, /\/account\/[^/]+$/);
    expectSingleWindow(app);

    await window.getByTestId('account-tab-open').click();
    await expectPathname(window, /\/account\/[^/]+\/open$/);
    await expect(window.getByTestId('open-positions-table')).toBeVisible();
    expectSingleWindow(app);
  });

  test('AC#3: external link triggers shell.openExternal and does not open a new BrowserWindow', async () => {
    const externalUrl = 'https://example.com';

    // Trigger window.open to an external URL from the renderer —
    // setWindowOpenHandler in main.ts intercepts it and calls openExternal().
    // With ELECTRON_TEST_MODE=1 the URL is captured in externalOpenLog instead
    // of actually opening the OS browser.
    await window.evaluate(function triggerExternalOpen(url: string): void {
      window.open(url, '_blank');
    }, externalUrl);

    // Poll the main-process log to avoid a race between the renderer callback
    // returning and the IPC-based setWindowOpenHandler appending the URL.
    await expect
      .poll(
        async function pollExternalLog() {
          return app.evaluate(function readExternalOpenLog(): string[] {
            const g = global as typeof globalThis & {
              electronTestExternalLog?: string[];
            };
            return g.electronTestExternalLog ?? [];
          });
        },
        { timeout: 5000 }
      )
      .toContain(new URL(externalUrl).toString());

    // No new BrowserWindow should have been created
    expect(app.windows()).toHaveLength(1);
  });
});
