import fs from 'fs';
import path from 'path';

import { _electron as electron, ElectronApplication, Page } from 'playwright';
import { expect, test } from '@playwright/test';

const ELECTRON_MAIN_PATH = path.join(
  __dirname,
  '../../../../dist/apps/electron/main.js'
);

const distExists = fs.existsSync(ELECTRON_MAIN_PATH);

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
      test.skip(
        true,
        'Electron dist not built — run: pnpm nx run-many -t build --projects=server,dms-material,electron'
      );
      return;
    }
    app = await electron.launch({
      args: [ELECTRON_MAIN_PATH],
      env: { ...process.env, ELECTRON_TEST_MODE: '1' },
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

  test('AC#1: app launches and default home route renders without console errors', async () => {
    // The default home route (login page or dashboard) must be visible
    await expect(window.locator('body')).toBeVisible();
    // Verify the window has loaded some content — login or dashboard
    const bodyText = await window.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    // Assert no console errors during initial load
    expect(consoleErrors).toHaveLength(0);
  });

  test('AC#2: only one BrowserWindow is open on load', async () => {
    expect(app.windows()).toHaveLength(1);
  });

  test('AC#3: external link triggers shell.openExternal and does not open a new BrowserWindow', async () => {
    // Trigger window.open to an external URL from the renderer —
    // setWindowOpenHandler in main.ts intercepts it and calls openExternal().
    // With ELECTRON_TEST_MODE=1 the URL is captured in externalOpenLog instead
    // of actually opening the OS browser.
    await window.evaluate(
      // eslint-disable-next-line @typescript-eslint/require-await -- Playwright evaluate() requires an async callback signature
      async function triggerExternalOpen(): Promise<void> {
        // eslint-disable-next-line sonarjs/link-with-target-blank -- Electron blocks new windows entirely; noopener is irrelevant
        window.open('https://example.com', '_blank');
      }
    );

    // Read the log from the main process via the global exposed in test mode
    const calls = await app.evaluate(function readExternalOpenLog(): string[] {
      const g = global as typeof globalThis & {
        electronTestExternalLog?: string[];
      };
      return g.electronTestExternalLog ?? [];
    });

    expect(calls).toContain('https://example.com');

    // No new BrowserWindow should have been created
    expect(app.windows()).toHaveLength(1);
  });
});
