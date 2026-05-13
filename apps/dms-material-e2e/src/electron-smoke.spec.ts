/**
 * E2E Smoke Test: Packaged Electron App Launches Cleanly
 *
 * Story 102.3 — Release-gate test that installs the packaged .deb artifact,
 * validates chrome-sandbox ownership/mode (Story 102.1), asserts no tslib error
 * (Story 102.2), and confirms the Angular app renders without console errors
 * (Story 77.5 pattern).
 *
 * REQUIRES ROOT: dpkg -i sets the chrome-sandbox SUID bit (4755 root:root).
 * Run via:  sudo pnpm e2e:electron:smoke
 *
 * This test is NOT part of the default `pnpm all` pipeline.
 * It is a required release-gate check that must pass before tagging an
 * Electron release.  See docs/deployment-guide.md § Release Gate Tests.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { _electron as electron, ElectronApplication, Page } from 'playwright';
import { expect, test } from 'playwright/test';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Installed binary path (electron-builder deb, productName: DMS → /opt/DMS/) */
const INSTALLED_BINARY = '/opt/DMS/dms';
/** chrome-sandbox path set by afterInstall.sh in Story 102.1 */
const CHROME_SANDBOX_PATH = '/opt/DMS/chrome-sandbox';
/** dpkg package name used for removal in cleanup */
const DPKG_PACKAGE_NAME = 'dms';

/** Workspace root: apps/dms-material-e2e/src → workspace root (3 levels up) */
const WORKSPACE_ROOT = path.resolve(__dirname, '../../../');
/** Directory where electron-builder writes the Linux .deb artifact */
const DEB_DIST_DIR = path.join(WORKSPACE_ROOT, 'dist', 'electron-dist');

/** Error string that must be ABSENT from process output (Story 102.1 regression) */
const SANDBOX_FATAL =
  'The SUID sandbox helper binary was found, but is not configured correctly';
/** Error string that must be ABSENT from process output (Story 102.2 regression) */
const TSLIB_MISSING = "Cannot find module 'tslib'";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find the newest .deb artifact under dist/electron-dist/.
 * Returns null if the directory does not exist or contains no .deb files.
 */
function findDebArtifact(): string | null {
  if (!fs.existsSync(DEB_DIST_DIR)) {
    return null;
  }
  const debs = fs
    .readdirSync(DEB_DIST_DIR)
    .filter((f) => f.endsWith('.deb'))
    .map((f) => ({
      file: f,
      mtime: fs.statSync(path.join(DEB_DIST_DIR, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  return debs.length > 0 ? path.join(DEB_DIST_DIR, debs[0].file) : null;
}

// Evaluate preconditions at module load time so skip messages are immediate.
const debPath = findDebArtifact();
const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe('Packaged Electron Smoke Test', () => {
  test.describe.configure({ mode: 'serial' });

  let app: ElectronApplication | null = null;
  let window: Page | null = null;
  const consoleErrors: string[] = [];

  /** Aggregated stdout+stderr captured from the Electron process */
  let processOutput = '';

  // -------------------------------------------------------------------------
  // beforeAll — install the .deb
  // -------------------------------------------------------------------------
  test.beforeAll(async () => {
    if (!isRoot) {
      test.skip(
        true,
        [
          'Packaged Electron smoke test requires root privileges (dpkg -i must',
          'set the chrome-sandbox SUID bit).',
          'Run: sudo pnpm e2e:electron:smoke',
        ].join(' ')
      );
      return;
    }

    if (!debPath) {
      test.skip(
        true,
        [
          `No .deb artifact found in ${DEB_DIST_DIR}.`,
          'Build the package first: pnpm nx run electron:build:linux',
        ].join(' ')
      );
      return;
    }

    try {
      const installLog = execSync(`dpkg -i "${debPath}" 2>&1`, {
        encoding: 'utf8',
      });
      processOutput += installLog;
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; message: string };
      throw new Error(
        [
          `dpkg install failed — cannot proceed with smoke test.`,
          `  artifact: ${debPath}`,
          `  error: ${e.message}`,
          `  stdout: ${e.stdout ?? '(none)'}`,
          `  stderr: ${e.stderr ?? '(none)'}`,
        ].join('\n')
      );
    }
  });

  // -------------------------------------------------------------------------
  // afterAll — close app, uninstall package
  // -------------------------------------------------------------------------
  test.afterAll(async () => {
    if (app) {
      await app.close().catch(() => undefined);
      app = null;
    }

    if (isRoot) {
      try {
        execSync(`dpkg -r ${DPKG_PACKAGE_NAME} 2>&1`, { encoding: 'utf8' });
      } catch {
        // Best-effort cleanup — dpkg -r may fail if the package was never
        // fully installed; do not fail the suite.
      }
    }
  });

  // -------------------------------------------------------------------------
  // AC#1: chrome-sandbox permissions
  // -------------------------------------------------------------------------
  test('AC#1: chrome-sandbox has owner root:root and mode 4755 after dpkg install', () => {
    expect(
      fs.existsSync(CHROME_SANDBOX_PATH),
      `chrome-sandbox not found at ${CHROME_SANDBOX_PATH}. ` +
        `The afterInstall hook from Story 102.1 may not have run.`
    ).toBe(true);

    const statOutput = execSync(`stat -c '%U:%G %a' "${CHROME_SANDBOX_PATH}"`, {
      encoding: 'utf8',
    }).trim();

    expect(
      statOutput,
      `Expected "root:root 4755" — got "${statOutput}". ` +
        `Story 102.1 afterInstall hook (chown/chmod) may have regressed.`
    ).toBe('root:root 4755');
  });

  // -------------------------------------------------------------------------
  // AC#2 + AC#3: launch installed binary, assert no fatal errors, assert
  //              home route renders without console errors
  // -------------------------------------------------------------------------
  test(
    'AC#2 + AC#3: app launches without sandbox FATAL or tslib error; ' +
      'home route renders without console errors',
    async () => {
      // Build environment — mirror Story 77.5 (electron-launch.spec.ts)
      const launchEnv: Record<string, string> = {
        ...(process.env as Record<string, string>),
        DMS_ENABLE_MOCK_AUTH: '1',
        ELECTRON_TEST_MODE: '1',
      };
      // Unset ELECTRON_RUN_AS_NODE to avoid interfering with the packaged binary
      delete launchEnv['ELECTRON_RUN_AS_NODE'];

      // Launch the INSTALLED binary — this exercises the full packaged artifact,
      // including the asar bundle (tslib resolution) and sandbox setup.
      app = await electron.launch({
        executablePath: INSTALLED_BINARY,
        env: launchEnv,
        timeout: 45000,
      });

      // Tee process stdout+stderr into processOutput for AC#2 assertions.
      app.process().stdout?.on('data', (chunk: Buffer) => {
        processOutput += chunk.toString();
      });
      app.process().stderr?.on('data', (chunk: Buffer) => {
        processOutput += chunk.toString();
      });

      window = await app.firstWindow();

      // Collect renderer console errors for AC#3.
      window.on('console', function onConsoleMessage(msg): void {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await window.waitForLoadState('domcontentloaded', { timeout: 30000 });

      // Brief settle so synchronous startup errors appear in processOutput
      // before we assert (sandbox FATAL prints at Electron startup).
      await new Promise<void>((resolve) => setTimeout(resolve, 1500));

      // --- AC#2 assertions ---

      expect(
        processOutput,
        `Sandbox FATAL detected — Story 102.1 chrome-sandbox fix may have regressed.\n` +
          `Captured output:\n${processOutput}`
      ).not.toContain(SANDBOX_FATAL);

      expect(
        processOutput,
        `tslib module-not-found error detected — Story 102.2 importHelpers inlining ` +
          `may have regressed.\nCaptured output:\n${processOutput}`
      ).not.toContain(TSLIB_MISSING);

      // --- AC#3 assertions ---

      await expect(window.locator('body')).toBeVisible({ timeout: 15000 });

      const bodyText = await window.locator('body').textContent();
      expect(
        bodyText,
        'body element has no text content — home route did not render'
      ).toBeTruthy();

      expect(
        consoleErrors,
        `Renderer console errors on initial load:\n${consoleErrors.join('\n')}`
      ).toHaveLength(0);
    }
  );
});
