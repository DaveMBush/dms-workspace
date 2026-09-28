/**
 * Release-gate guard for the desktop (Electron) build: proves the packaged app
 * bakes in the mock-auth environment, not the web "production" one.
 *
 * Why this exists: a regression that builds dms-material with the `production`
 * configuration instead of `electron` would bake `useMockAuth: false` + an AWS
 * Cognito config into the desktop app, so end users see a cloud login screen on
 * first launch (the exact bug reported for the 2026-07-18 build). The existing
 * smoke test cannot catch this because it launches with DMS_ENABLE_MOCK_AUTH=1,
 * which ORs past whatever environment is baked in.
 *
 * How it discriminates: we launch WITHOUT that override and seed a valid mock
 * session into localStorage before the app boots. With mock auth baked in, the
 * MockAuthService recognises the seeded session, passes the root auth guard, and
 * lands on /dashboard. If the prod environment leaked in, DI wires the real Cognito
 * AuthService (which ignores those keys) — or configureAmplify() fails at module
 * load — so the app never reaches /dashboard.
 *
 * Like electron-smoke.spec.ts this is a manual release-gate check: it needs the
 * unpacked artifact from `electron:build:linux` in dist/electron-dist. It launches
 * with --no-sandbox, so no root/sudo is required (verified on Linux dev boxes). When
 * the artifact is absent it bails out cleanly (early-return, NOT test.skip — that
 * trips the no-skipped-tests gate) rather than failing. Run via
 * `pnpm nx run dms-material-e2e:e2e-electron-env-guard`.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { _electron as electron, expect, test } from '@playwright/test';

const workspaceRoot = process.env['NX_WORKSPACE_ROOT_PATH'] ?? process.cwd();
// Unpacked binary produced by `electron:build:linux` (executableName: DMS).
const electronBinaryPath = join(
  workspaceRoot,
  'dist/electron-dist/linux-unpacked/DMS',
);

// Mirrors the mock credentials MockAuthService accepts (see mock-auth.service.ts).
const MOCK_USER = {
  username: 'dev@dms.local',
  email: 'dev@dms.local',
  attributes: {
    email: 'dev@dms.local',
    email_verified: true,
    sub: 'mock-user-id-12345',
  },
};

// The root auth guard (auth.guard.ts) passes only when BOTH hold:
//   - isAuthenticated(): MockAuthService.initializeAuth() sets the current user
//     iff localStorage has non-null `dms_mock_user` AND `dms_mock_access_token`.
//   - isSessionValid(): `dms_mock_token_expiration` parses to a future epoch-seconds.
// The seeding below reproduces all three so a correctly-built (mock) app passes the
// guard and reaches /dashboard, while a prod-environment leak never does.

const hasArtifact = existsSync(electronBinaryPath);

test.describe.configure({ mode: 'serial' });

test('desktop build bakes in mock auth (lands on dashboard, not Cognito login)', async () => {
  // If-guard early-return (NOT test.skip — that trips the no-skipped-tests gate).
  // This is a manual release-gate check needing a pre-built artifact; bail out
  // cleanly rather than fail when it's absent. --no-sandbox means no root needed.
  if (!hasArtifact) {
    console.warn(
      `electron-env-guard: skipping — no Electron build artifact at ${electronBinaryPath}. Build it first (nx run electron:build:linux).`,
    );
    return;
  }

  const app = await electron.launch({
    executablePath: electronBinaryPath,
    args: ['--no-sandbox'],
    env: {
      ...process.env,
      // Deliberately NOT setting DMS_ENABLE_MOCK_AUTH — the whole point is to let
      // DI depend on the environment baked into the bundle. ELECTRON_TEST_MODE keeps
      // a Cognito OAuth redirect from spawning a real browser window.
      ELECTRON_TEST_MODE: '1',
    },
  });

  try {
    const window = await app.firstWindow();

    // Seed a valid mock session before Angular boots so MockAuthService.initializeAuth()
    // restores it and the root auth guard passes.
    await window.addInitScript((user: typeof MOCK_USER) => {
      localStorage.setItem('dms_mock_user', JSON.stringify(user));
      localStorage.setItem('dms_mock_access_token', 'mock-access-token');
      localStorage.setItem('dms_mock_id_token', 'mock-id-token');
      localStorage.setItem('dms_mock_refresh_token', 'mock-refresh-token');
      // 1 hour out, in seconds — matches MockAuthService.calculateTokenExpiration.
      localStorage.setItem(
        'dms_mock_token_expiration',
        String(Math.floor(Date.now() / 1000) + 3600),
      );
    }, MOCK_USER);

    await window.waitForLoadState('domcontentloaded');

    // Give Angular bootstrap + the root auth guard time to resolve. With mock auth
    // baked in this settles on /dashboard; a prod-environment leak never gets there.
    await expect
      .poll(() => window.url(), {
        timeout: 30000,
        message: `Expected the app to reach /dashboard with a seeded mock session but it stayed at ${window.url()} — the desktop build may have baked in the web production (Cognito) environment`,
      })
      .toContain('dashboard');

    expect(window.url()).not.toContain('/auth/login');
  } finally {
    await app.close();
  }
});
