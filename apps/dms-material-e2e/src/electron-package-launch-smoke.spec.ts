import { ChildProcess, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import betterSqlite3 from 'better-sqlite3';
import { expect, test } from 'playwright/test';

// ─── Linux-only guard ────────────────────────────────────────────────────────
// macOS and Windows AppImage builds are out of scope until build environments
// for those platforms are available (Story 98.4).
test.skip(
  process.platform !== 'linux',
  'Story 98.4 smoke test is Linux-only until macOS/Windows build environments are available'
);

// ─── Constants ───────────────────────────────────────────────────────────────
const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');
const DIST_DIR = path.join(WORKSPACE_ROOT, 'dist/electron-dist');
const MIGRATIONS_DIR = path.join(WORKSPACE_ROOT, 'prisma/migrations');
const DMS_SMOKE_PORT = 39001;
const HEALTH_URL = `http://127.0.0.1:${DMS_SMOKE_PORT}/api/health`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findAppImage(): string {
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error(
      `AppImage directory not found: ${DIST_DIR}\n` +
        'Run `nx run electron:build:linux` before executing this smoke test.'
    );
  }
  const entries = fs.readdirSync(DIST_DIR);
  const appImages = entries
    .filter((e) => e.endsWith('.AppImage'))
    .map((e) => path.join(DIST_DIR, e));
  if (appImages.length === 0) {
    throw new Error(
      `No *.AppImage found in ${DIST_DIR}\n` +
        'Run `nx run electron:build:linux` before executing this smoke test.'
    );
  }
  return appImages[0];
}

function getExpectedMigrationNames(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
  }
  return fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        fs.existsSync(path.join(MIGRATIONS_DIR, entry.name, 'migration.sql'))
    )
    .map((entry) => entry.name)
    .sort();
}

/* eslint-disable @typescript-eslint/naming-convention -- _prisma_migrations column names are snake_case by Prisma convention */
interface MigrationRow {
  id: string;
  checksum: string;
  finished_at: string | null;
  migration_name: string;
  logs: string | null;
  rolled_back_at: string | null;
  started_at: string;
  applied_steps_count: number;
}
/* eslint-enable @typescript-eslint/naming-convention -- end of _prisma_migrations column name block */

function readMigrationsTable(dbPath: string): MigrationRow[] {
  const db = new betterSqlite3(dbPath, { readonly: true });
  try {
    const rows = db
      .prepare(
        'SELECT id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count FROM _prisma_migrations ORDER BY started_at'
      )
      .all() as MigrationRow[];
    return rows;
  } finally {
    db.close();
  }
}

function launchAppImage(appImagePath: string, tmpHome: string): ChildProcess {
  const args = ['--no-sandbox'];
  const env = {
    ...process.env,
    HOME: tmpHome,
    DMS_SMOKE_PORT: String(DMS_SMOKE_PORT),
  };

  let child: ChildProcess;

  // On headless CI (no DISPLAY), wrap with xvfb-run so Electron can open a window
  if (process.env['DISPLAY'] === undefined) {
    child = spawn(
      '/usr/bin/xvfb-run',
      ['--auto-servernum', appImagePath, ...args],
      {
        env,
        stdio: 'pipe',
      }
    );
  } else {
    child = spawn(appImagePath, args, { env, stdio: 'pipe' });
  }

  // Surface stdout/stderr for diagnostics if the test fails
  child.stdout?.on('data', (data: Buffer) => {
    process.stdout.write(`[AppImage stdout] ${data.toString()}`);
  });
  child.stderr?.on('data', (data: Buffer) => {
    process.stderr.write(`[AppImage stderr] ${data.toString()}`);
  });

  return child;
}

async function waitForHealth(timeoutMs = 90_000): Promise<void> {
  await expect
    .poll(
      async function checkHealth() {
        try {
          const res = await fetch(HEALTH_URL);
          return res.status;
        } catch {
          return 0;
        }
      },
      { timeout: timeoutMs, intervals: [500, 1000, 2000] }
    )
    .toBe(200);
}

async function terminateProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.killed) {
    return; // already exited
  }
  child.kill('SIGTERM');
  // Wait up to 10 s for graceful exit, then SIGKILL
  await new Promise<void>((resolve) => {
    const killTimer = setTimeout(() => {
      if (child.exitCode === null && !child.killed) {
        child.kill('SIGKILL');
      }
      resolve();
    }, 10_000);
    child.once('exit', () => {
      clearTimeout(killTimer);
      resolve();
    });
  });
}

// ─── Test suite ──────────────────────────────────────────────────────────────

test.describe('Packaged Electron App – launch smoke test', () => {
  test.describe.configure({ mode: 'serial' });

  let appImagePath: string;
  let tmpHome: string;
  let activeChild: ChildProcess | null = null;

  test.beforeAll(() => {
    appImagePath = findAppImage();
    // eslint-disable-next-line sonarjs/file-permissions -- AppImage must be executable
    fs.chmodSync(appImagePath, 0o755);
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-smoke-home-'));
  });

  test.afterAll(async () => {
    try {
      if (activeChild !== null) {
        await terminateProcess(activeChild);
        activeChild = null;
      }
    } finally {
      if (tmpHome) {
        fs.rmSync(tmpHome, { recursive: true, force: true });
      }
    }
  });

  test('first launch creates dms.db with all migrations applied', async () => {
    const child = launchAppImage(appImagePath, tmpHome);
    activeChild = child;

    await waitForHealth();

    await terminateProcess(child);
    activeChild = null;

    const dbPath = path.join(tmpHome, '.dms', 'dms.db');
    expect(
      fs.existsSync(dbPath),
      `Expected ${dbPath} to exist after first launch`
    ).toBe(true);

    const appliedMigrations = readMigrationsTable(dbPath).map(
      (r) => r.migration_name
    );
    const expectedMigrations = getExpectedMigrationNames();

    expect(
      appliedMigrations,
      `Migration mismatch.\nExpected (from prisma/migrations/): ${JSON.stringify(
        expectedMigrations,
        null,
        2
      )}\nActual (from _prisma_migrations): ${JSON.stringify(
        appliedMigrations,
        null,
        2
      )}`
    ).toEqual(expectedMigrations);
  });

  test('second launch reuses existing dms.db without re-applying migrations', async () => {
    const dbPath = path.join(tmpHome, '.dms', 'dms.db');

    // Snapshot before second launch
    const rowsBefore = readMigrationsTable(dbPath);

    const child = launchAppImage(appImagePath, tmpHome);
    activeChild = child;

    await waitForHealth();

    await terminateProcess(child);
    activeChild = null;

    // Snapshot after second launch
    const rowsAfter = readMigrationsTable(dbPath);

    expect(
      rowsAfter,
      `_prisma_migrations changed after second launch (idempotency violation).\nBefore: ${JSON.stringify(
        rowsBefore,
        null,
        2
      )}\nAfter:  ${JSON.stringify(rowsAfter, null, 2)}`
    ).toEqual(rowsBefore);
  });
});
