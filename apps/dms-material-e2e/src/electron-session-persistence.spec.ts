import fs from 'fs';
import os from 'os';
import path from 'path';
import { _electron as electron, ElectronApplication } from 'playwright';
import { expect, test } from 'playwright/test';

// Story 11.3 — E2E: cookie + localStorage persistence across an app relaunch.
//
// Proves the user-visible outcome of Epic 11: with the fixed default origin
// introduced in Story 11.2 (no DMS_SMOKE_PORT), a real quit + relaunch of the
// dev Electron app keeps the same origin, so localStorage and cookies survive.
//
// Harness mirrors electron-launch.spec.ts (_electron.launch against the built
// main.js). Both launches share ONE explicit --user-data-dir so the Chromium
// profile (localStorage LevelDB + cookie store) is identical across relaunch;
// persistence then depends purely on origin stability, which is what we assert.

const electronMainPath = path.join(__dirname, '../../electron/dist/main.js');
const distExists = fs.existsSync(electronMainPath);

// Env mirrors electron-launch.spec.ts. DMS_SMOKE_PORT is explicitly removed so
// the app uses the fixed default origin (Story 11.2) rather than a smoke port —
// that origin stability across relaunch is exactly what this spec asserts.
const electronEnv: Record<string, string> = {
  ...process.env,
  DMS_NODE_EXEC_PATH: process.execPath,
  DMS_ENABLE_MOCK_AUTH: '1',
  ELECTRON_TEST_MODE: '1',
};

delete electronEnv['ELECTRON_RUN_AS_NODE'];
delete electronEnv['DMS_SMOKE_PORT'];

// Sentinel key/value written to localStorage in launch #1 and read back in #2.
const PROBE_KEY = 'dms_persist_probe';
const PROBE_VALUE = `story-11.3-${Date.now()}`;

// Non-secure session cookie for the app origin (see story "Cookie note": over a
// plain http://localhost origin, secure cookies are not stored — the point here
// is origin stability across relaunch, not the secure flag).
const COOKIE_NAME = 'dms_session_probe';
const COOKIE_VALUE = `session-${Date.now()}`;

let userDataDir = '';
let app: ElectronApplication | null = null;

async function launchApp(): Promise<ElectronApplication> {
  const launched = await electron.launch({
    args: [electronMainPath, `--user-data-dir=${userDataDir}`],
    env: electronEnv,
    timeout: 30000,
  });
  await (await launched.firstWindow()).waitForLoadState('domcontentloaded');
  return launched;
}

test.describe('Electron session persistence across relaunch', () => {
  test.skip(
    !distExists,
    `missing ${electronMainPath} — run "pnpm nx run electron:build" first`,
  );

  test.beforeAll(() => {
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-persist-udata-'));
  });

  test.afterEach(async () => {
    if (app) {
      await app.close().catch(() => undefined);
      app = null;
    }
  });

  test.afterAll(() => {
    if (userDataDir.length > 0) {
      fs.rmSync(userDataDir, { recursive: true, force: true });
      userDataDir = '';
    }
  });

  test('localStorage + cookie survive quit and relaunch on the same origin', async () => {
    // Launch #1 — write a localStorage sentinel and set a session cookie.
    const first = await launchApp();
    app = first;
    const win1 = await first.firstWindow();
    const ctx1 = win1.context();
    const origin1 = new URL(win1.url()).origin;

    await win1.evaluate(
      ([key, value]: readonly [string, string]) => {
        window.localStorage.setItem(key, value);
      },
      [PROBE_KEY, PROBE_VALUE] as const,
    );
    await ctx1.addCookies([
      { name: COOKIE_NAME, value: COOKIE_VALUE, url: origin1 },
    ]);

    // Quit #1 — the before-quit handler SIGTERMs the forked server, freeing the port.
    await first.close();

    // Launch #2 with the SAME user-data-dir → same Chromium profile.
    const second = await launchApp();
    app = second;
    const win2 = await second.firstWindow();
    const ctx2 = win2.context();
    const origin2 = new URL(win2.url()).origin;

    // AC#1 — origin is identical across launches.
    expect(origin2, 'origin must be stable across relaunch').toBe(origin1);

    // AC#1 — the localStorage sentinel written before quit is still present.
    const persistedValue = await win2.evaluate(
      (key: string) => window.localStorage.getItem(key),
      PROBE_KEY,
    );
    expect(persistedValue).toBe(PROBE_VALUE);

    // AC#2 — the session cookie set before quit is still present on the same origin.
    const cookies = await ctx2.cookies(origin2);
    const probeCookie = cookies.find((cookie) => cookie.name === COOKIE_NAME);
    expect(probeCookie, 'session cookie must persist across relaunch').toBeDefined();
    expect(probeCookie?.value).toBe(COOKIE_VALUE);
  });
});
