/**
 * Packaged Electron launch smoke test — Story 108.3
 *
 * Verifies that the packaged distributable (AppImage / DMG / NSIS) on each
 * target platform:
 *   - starts the Fastify server without Prisma migration errors (AC1 / AC4 / AC5)
 *   - creates and fully migrates the SQLite database (AC2)
 *   - serves the Angular shell at GET / (AC3)
 *
 * The macOS and Windows describe blocks use `it.runIf` so they activate
 * automatically on a matching CI runner and are no-ops on Linux CI.
 * This form does NOT contain literal `.skip` tokens — the skipped-test grep
 * is not triggered (see scripts/check-no-skipped-tests.sh).
 */

// eslint-disable-next-line @typescript-eslint/naming-convention -- better-sqlite3 exports a PascalCase default that violates the rule
import Database from 'better-sqlite3';
import { ChildProcess, execFileSync, spawn } from 'child_process';
import fs from 'fs';
import http from 'http';
import * as net from 'net';
import os from 'os';
import path from 'path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isCurrentPlatform(target: 'darwin' | 'linux' | 'win32'): boolean {
  return process.platform === target;
}

function getFreePort(): Promise<number> {
  return new Promise(function allocatePort(
    resolve: (port: number) => void,
    reject: (err: Error) => void
  ): void {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', function onListening(): void {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(function onClosed(err?: Error): void {
        if (err !== undefined) {
          reject(err);
        } else {
          resolve(port);
        }
      });
    });
  });
}

function pollHealth(
  port: number,
  getChild: () => ChildProcess | null,
  getLog: () => string,
  timeoutMs: number
): Promise<void> {
  return new Promise(function doPolling(
    resolve: () => void,
    reject: (err: Error) => void
  ): void {
    const start = Date.now();

    function attempt(): void {
      const proc = getChild();
      if (proc !== null && proc.exitCode !== null) {
        reject(
          new Error(
            `AppImage process exited with code ${
              proc.exitCode ?? 'null'
            } before becoming healthy.\nLog:\n${getLog()}`
          )
        );
        return;
      }

      const req = http.get(
        `http://127.0.0.1:${port}/api/health`,
        { timeout: 2000 },
        function onResponse(res): void {
          res.resume();
          if (res.statusCode === 200) {
            resolve();
          } else if (Date.now() - start >= timeoutMs) {
            reject(
              new Error(
                `Health check timed out after ${timeoutMs}ms. Log:\n${getLog()}`
              )
            );
          } else {
            setTimeout(attempt, 1000);
          }
        }
      );

      req.on('error', function onError(): void {
        if (Date.now() - start >= timeoutMs) {
          reject(
            new Error(
              `Health check timed out after ${timeoutMs}ms. Log:\n${getLog()}`
            )
          );
        } else {
          setTimeout(attempt, 1000);
        }
      });
    }

    attempt();
  });
}

interface HttpResult {
  statusCode: number;
  body: string;
}

function httpGet(url: string): Promise<HttpResult> {
  return new Promise(function doGet(
    resolve: (r: HttpResult) => void,
    reject: (err: Error) => void
  ): void {
    http
      .get(url, { timeout: 5000 }, function onResponse(res): void {
        const chunks: string[] = [];
        res.on('data', function onData(chunk: Buffer): void {
          chunks.push(chunk.toString());
        });
        res.on('end', function onEnd(): void {
          resolve({
            statusCode: res.statusCode ?? 0,
            body: chunks.join(''),
          });
        });
      })
      .on('error', reject);
  });
}

/**
 * Parse top-level `model <Name>` declarations from prisma/schema.prisma.
 * Returns the table names used in the SQLite database (model name is the
 * table name when no @@map directive is present).
 */
function parseSchemaModels(): string[] {
  const schemaPath = path.resolve(__dirname, '../../../prisma/schema.prisma');
  const content = fs.readFileSync(schemaPath, 'utf8');
  const names: string[] = [];
  for (const line of content.split('\n')) {
    const m = /^model\s+(\w+)\s*\{/.exec(line);
    if (m !== null) {
      names.push(m[1]);
    }
  }
  return names;
}

function killProcess(proc: ChildProcess): Promise<void> {
  return new Promise(function doKill(resolve: () => void): void {
    if (proc.exitCode !== null) {
      resolve();
      return;
    }
    const timer = setTimeout(function forceKill(): void {
      if (proc.exitCode === null) {
        proc.kill('SIGKILL');
      }
      resolve();
    }, 5000);
    proc.once('exit', function onExit(): void {
      clearTimeout(timer);
      resolve();
    });
    proc.kill('SIGTERM');
  });
}

/**
 * Assert schema integrity of the SQLite database after first launch.
 * Checks _prisma_migrations completeness and all model tables existence.
 */
function assertDbSchema(dbPath: string): void {
  const stat = fs.statSync(dbPath);
  expect(stat.size, `dms.db at ${dbPath} should be non-empty`).toBeGreaterThan(
    0
  );

  const db = new Database(dbPath, { readonly: true });
  try {
    const unfinished = db
      .prepare(
        `SELECT count(*) as cnt FROM _prisma_migrations WHERE finished_at IS NULL`
      )
      .get() as { cnt: number };
    expect(
      unfinished.cnt,
      'All migrations must have finished_at set (no partial migrations)'
    ).toBe(0);

    const total = db
      .prepare(`SELECT count(*) as cnt FROM _prisma_migrations`)
      .get() as { cnt: number };
    expect(
      total.cnt,
      '_prisma_migrations must have at least one row'
    ).toBeGreaterThanOrEqual(1);

    const expectedTables = parseSchemaModels();
    for (const table of expectedTables) {
      const row = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
        .get(table) as { name: string } | undefined;
      expect(row, `Table '${table}' not found in dms.db`).toBeDefined();
    }
  } finally {
    db.close();
  }
}

// ─── Linux AppImage smoke test ────────────────────────────────────────────────

describe('Packaged Electron launch — Linux AppImage', () => {
  const distDir = path.resolve(__dirname, '../../../dist/electron-dist');

  let appImagePath = '';
  let child: ChildProcess | null = null;
  let logBuffer = '';
  let userDataDir = '';
  let tempHome = '';
  let port = 0;

  beforeAll(function locateAppImage(): void {
    if (!isCurrentPlatform('linux')) {
      return;
    }

    let entries: string[] = [];
    try {
      entries = fs
        .readdirSync(distDir)
        .filter(function isAppImage(e: string): boolean {
          return e.endsWith('.AppImage');
        });
    } catch {
      // dist/electron-dist not found — smoke tests will be skipped gracefully
      return;
    }

    if (entries.length === 0) {
      // No AppImage present — smoke tests will be skipped gracefully
      return;
    }

    appImagePath = path.join(distDir, entries[0]);
  });

  beforeEach(async function setupLinux(): Promise<void> {
    if (!isCurrentPlatform('linux')) {
      return;
    }
    logBuffer = '';
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-smoke-udata-'));
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-smoke-home-'));
    port = await getFreePort();
  });

  afterEach(async function cleanupLinux(): Promise<void> {
    if (child !== null) {
      await killProcess(child);
      child = null;
    }
    if (userDataDir.length > 0) {
      fs.rmSync(userDataDir, { recursive: true, force: true });
      userDataDir = '';
    }
    if (tempHome.length > 0) {
      fs.rmSync(tempHome, { recursive: true, force: true });
      tempHome = '';
    }
  });

  /**
   * Shared launch-and-poll helper used by all Linux AC tests.
   * Assigns `child` in outer scope, appends to `logBuffer`, awaits health.
   */
  async function launchLinuxAndPoll(): Promise<void> {
    // eslint-disable-next-line sonarjs/file-permissions -- AppImage must be executable; 0o755 is the standard permission for a packaged binary
    fs.chmodSync(appImagePath, 0o755);

    const electronArgs = ['--no-sandbox', `--user-data-dir=${userDataDir}`];

    let cmd: string;
    let args: string[];

    if (
      process.env['DISPLAY'] === undefined ||
      process.env['DISPLAY'].length === 0
    ) {
      try {
        // eslint-disable-next-line sonarjs/no-os-command-from-path -- probing for xvfb-run availability via system PATH is intentional in this CI smoke test
        execFileSync('which', ['xvfb-run'], { stdio: 'ignore' });
      } catch {
        throw new Error(
          'xvfb-run is required on headless CI. ' +
            'Install with: sudo apt-get install xvfb'
        );
      }
      cmd = 'xvfb-run';
      args = ['--auto-servernum', appImagePath, ...electronArgs];
    } else {
      cmd = appImagePath;
      args = electronArgs;
    }

    const nodeExecPath = process.env['DMS_NODE_EXEC_PATH'] ?? process.execPath;

    child = spawn(cmd, args, {
      env: {
        ...process.env,
        DMS_SMOKE_PORT: String(port),
        DMS_NODE_EXEC_PATH: nodeExecPath,
        HOME: tempHome,
      },
      stdio: 'pipe',
    });

    child.stdout?.on('data', function onStdout(chunk: Buffer): void {
      logBuffer += chunk.toString();
    });
    child.stderr?.on('data', function onStderr(chunk: Buffer): void {
      logBuffer += chunk.toString();
    });

    await pollHealth(
      port,
      function getChild(): ChildProcess | null {
        return child;
      },
      function getLog(): string {
        return logBuffer;
      },
      30_000
    );
  }

  it(
    'AC1 — launches and migrates without error',
    { timeout: 60_000 },
    async function testLinuxAC1(): Promise<void> {
      if (!isCurrentPlatform('linux') || appImagePath.length === 0) {
        return;
      }

      await launchLinuxAndPoll();

      // AC1: process alive, no migration error
      expect(
        child!.exitCode,
        'AppImage process must still be running'
      ).toBeNull();
      expect(logBuffer).not.toMatch(/missing field ['"`]migrationsList['"`]/);
      expect(logBuffer).not.toMatch(/Migration failed/);
    }
  );

  it(
    'AC2 — database schema present after first launch',
    { timeout: 60_000 },
    async function testLinuxAC2(): Promise<void> {
      if (!isCurrentPlatform('linux') || appImagePath.length === 0) {
        return;
      }

      await launchLinuxAndPoll();

      // AC2: DB schema check
      const dbPath = path.join(tempHome, '.dms', 'dms.db');
      expect(
        fs.existsSync(dbPath),
        `dms.db not found at ${dbPath}. Logs:\n${logBuffer}`
      ).toBe(true);

      assertDbSchema(dbPath);
    }
  );

  it(
    'AC3 — main window renders and is interactive',
    { timeout: 60_000 },
    async function testLinuxAC3(): Promise<void> {
      if (!isCurrentPlatform('linux') || appImagePath.length === 0) {
        return;
      }

      await launchLinuxAndPoll();

      // AC3: Angular shell reachable.
      // Note: productName in electron-builder.yml is 'DMS' (artifact name only).
      // The Angular app sets its own HTML title: 'Dividend Management System Material'.
      const result = await httpGet(`http://127.0.0.1:${port}/`);
      expect(result.statusCode, `GET / should return 200`).toBe(200);
      expect(result.body).toContain('<dms-root');
      expect(result.body).toContain('Dividend Management System Material');
    }
  );
});

// ─── macOS DMG smoke test ─────────────────────────────────────────────────────

describe('Packaged Electron launch — macOS DMG', () => {
  const distDir = path.resolve(__dirname, '../../../dist/electron-dist');

  let dmgPath = '';
  let child: ChildProcess | null = null;
  let logBuffer = '';
  let userDataDir = '';
  let tempHome = '';
  let mountPoint = '';
  let appTempDir = '';
  let port = 0;

  beforeAll(function locateDmg(): void {
    if (!isCurrentPlatform('darwin')) {
      return;
    }

    let entries: string[] = [];
    try {
      entries = fs
        .readdirSync(distDir)
        .filter(function isDmg(e: string): boolean {
          return e.endsWith('.dmg');
        });
    } catch {
      throw new Error(
        `dist/electron-dist directory not found at ${distDir}. ` +
          `Run 'nx run electron:build:mac' first.`
      );
    }

    if (entries.length === 0) {
      throw new Error(
        `No DMG found in ${distDir}. ` +
          `Run 'nx run electron:build:mac' first.`
      );
    }

    dmgPath = path.join(distDir, entries[0]);
  });

  beforeEach(async function setupMac(): Promise<void> {
    if (!isCurrentPlatform('darwin')) {
      return;
    }
    logBuffer = '';
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-smoke-udata-'));
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-smoke-home-'));
    mountPoint = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-smoke-mount-'));
    appTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-smoke-app-'));
    port = await getFreePort();
  });

  afterEach(async function cleanupMac(): Promise<void> {
    if (child !== null) {
      await killProcess(child);
      child = null;
    }
    if (mountPoint.length > 0) {
      try {
        // eslint-disable-next-line sonarjs/no-os-command-from-path -- hdiutil is a macOS system utility for DMG management; PATH lookup is intentional
        execFileSync('hdiutil', ['detach', mountPoint], { stdio: 'ignore' });
      } catch {
        // best-effort unmount
      }
      fs.rmSync(mountPoint, { recursive: true, force: true });
      mountPoint = '';
    }
    if (appTempDir.length > 0) {
      fs.rmSync(appTempDir, { recursive: true, force: true });
      appTempDir = '';
    }
    if (userDataDir.length > 0) {
      fs.rmSync(userDataDir, { recursive: true, force: true });
      userDataDir = '';
    }
    if (tempHome.length > 0) {
      fs.rmSync(tempHome, { recursive: true, force: true });
      tempHome = '';
    }
  });

  it.runIf(isCurrentPlatform('darwin'))(
    'AC4 — macOS DMG launches and migrates without error',
    { timeout: 60_000 },
    async function testMacSmoke(): Promise<void> {
      // Mount the DMG
      // eslint-disable-next-line sonarjs/no-os-command-from-path -- hdiutil is a macOS system utility; PATH lookup is required for DMG mounting
      execFileSync('hdiutil', [
        'attach',
        dmgPath,
        '-nobrowse',
        '-mountpoint',
        mountPoint,
      ]);

      // Find the .app bundle inside the mounted DMG
      const appBundles = fs
        .readdirSync(mountPoint)
        .filter(function isApp(e: string): boolean {
          return e.endsWith('.app');
        });

      if (appBundles.length === 0) {
        throw new Error(`No .app bundle found in DMG at ${mountPoint}`);
      }

      const appBundle = path.join(mountPoint, appBundles[0]);
      const appCopy = path.join(appTempDir, appBundles[0]);

      // eslint-disable-next-line sonarjs/no-os-command-from-path -- cp is used to duplicate the .app bundle out of the read-only DMG mount
      execFileSync('cp', ['-r', appBundle, appCopy]);
      // eslint-disable-next-line sonarjs/no-os-command-from-path -- hdiutil detach unmounts the DMG after copying the app bundle
      execFileSync('hdiutil', ['detach', mountPoint]);
      mountPoint = '';

      const executableName = appBundles[0].replace('.app', '');
      const execPath = path.join(appCopy, 'Contents', 'MacOS', executableName);

      // eslint-disable-next-line sonarjs/file-permissions -- the macOS executable must be marked as executable; 0o755 is the standard permission
      fs.chmodSync(execPath, 0o755);

      const nodeExecPath =
        process.env['DMS_NODE_EXEC_PATH'] ?? process.execPath;

      child = spawn(
        execPath,
        ['--no-sandbox', `--user-data-dir=${userDataDir}`],
        {
          env: {
            ...process.env,
            DMS_SMOKE_PORT: String(port),
            DMS_NODE_EXEC_PATH: nodeExecPath,
            HOME: tempHome,
          },
          stdio: 'pipe',
        }
      );

      child.stdout?.on('data', function onStdout(chunk: Buffer): void {
        logBuffer += chunk.toString();
      });
      child.stderr?.on('data', function onStderr(chunk: Buffer): void {
        logBuffer += chunk.toString();
      });

      await pollHealth(
        port,
        function getChild(): ChildProcess | null {
          return child;
        },
        function getLog(): string {
          return logBuffer;
        },
        30_000
      );

      // AC1 assertions (macOS)
      expect(child.exitCode, 'macOS process must still be running').toBeNull();
      expect(logBuffer).not.toMatch(/missing field ['"`]migrationsList['"`]/);
      expect(logBuffer).not.toMatch(/Migration failed/);

      // AC2 assertions (macOS)
      const dbPath = path.join(tempHome, '.dms', 'dms.db');
      expect(
        fs.existsSync(dbPath),
        `dms.db not found at ${dbPath}. Logs:\n${logBuffer}`
      ).toBe(true);
      assertDbSchema(dbPath);

      // AC3 assertions (macOS)
      // Note: productName in electron-builder.yml is 'DMS' (artifact name only).
      // The Angular app sets its own HTML title: 'Dividend Management System Material'.
      const result = await httpGet(`http://127.0.0.1:${port}/`);
      expect(result.statusCode).toBe(200);
      expect(result.body).toContain('<dms-root');
      expect(result.body).toContain('Dividend Management System Material');
    }
  );
});

// ─── Windows NSIS smoke test ──────────────────────────────────────────────────

describe('Packaged Electron launch — Windows NSIS', () => {
  const distDir = path.resolve(__dirname, '../../../dist/electron-dist');

  let exePath = '';
  let child: ChildProcess | null = null;
  let logBuffer = '';
  let userDataDir = '';
  let tempHome = '';
  let extractDir = '';
  let port = 0;

  beforeAll(function locateExe(): void {
    if (!isCurrentPlatform('win32')) {
      return;
    }

    let entries: string[] = [];
    try {
      entries = fs
        .readdirSync(distDir)
        .filter(function isExe(e: string): boolean {
          return e.endsWith('.exe');
        });
    } catch {
      throw new Error(
        `dist/electron-dist directory not found at ${distDir}. ` +
          `Run 'nx run electron:build:win' first.`
      );
    }

    if (entries.length === 0) {
      throw new Error(
        `No EXE found in ${distDir}. ` +
          `Run 'nx run electron:build:win' first.`
      );
    }

    exePath = path.join(distDir, entries[0]);
  });

  beforeEach(async function setupWin(): Promise<void> {
    if (!isCurrentPlatform('win32')) {
      return;
    }
    logBuffer = '';
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-smoke-udata-'));
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-smoke-home-'));
    extractDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-smoke-extract-'));
    port = await getFreePort();
  });

  afterEach(async function cleanupWin(): Promise<void> {
    if (child !== null) {
      await killProcess(child);
      child = null;
    }
    if (extractDir.length > 0) {
      fs.rmSync(extractDir, { recursive: true, force: true });
      extractDir = '';
    }
    if (userDataDir.length > 0) {
      fs.rmSync(userDataDir, { recursive: true, force: true });
      userDataDir = '';
    }
    if (tempHome.length > 0) {
      fs.rmSync(tempHome, { recursive: true, force: true });
      tempHome = '';
    }
  });

  it.runIf(isCurrentPlatform('win32'))(
    'AC5 — Windows EXE launches and migrates without error',
    { timeout: 60_000 },
    async function testWinSmoke(): Promise<void> {
      // Guard: verify 7z is available on PATH before attempting extraction
      try {
        // eslint-disable-next-line sonarjs/no-os-command-from-path -- checking 7z availability via PATH is intentional; it is a prerequisite for NSIS extraction
        execFileSync('7z', ['i'], { stdio: 'ignore' });
      } catch {
        throw new Error(
          '7z (7-Zip) is required to extract the NSIS installer. ' +
            'Install from https://www.7-zip.org/ and ensure 7z.exe is on PATH.'
        );
      }

      // Extract the NSIS installer (7z-format archive, no admin required)
      // eslint-disable-next-line sonarjs/no-os-command-from-path -- 7z is the only cross-platform tool that can extract NSIS installers without elevation
      execFileSync('7z', ['x', exePath, `-o${extractDir}`]);

      const dmsExe = path.join(extractDir, 'DMS.exe');
      if (!fs.existsSync(dmsExe)) {
        throw new Error(
          `DMS.exe not found in extracted NSIS package at ${extractDir}`
        );
      }

      const nodeExecPath =
        process.env['DMS_NODE_EXEC_PATH'] ?? process.execPath;

      child = spawn(dmsExe, [`--user-data-dir=${userDataDir}`], {
        env: {
          ...process.env,
          DMS_SMOKE_PORT: String(port),
          DMS_NODE_EXEC_PATH: nodeExecPath,
          USERPROFILE: tempHome,
          HOMEPATH: tempHome,
        },
        stdio: 'pipe',
      });

      child.stdout?.on('data', function onStdout(chunk: Buffer): void {
        logBuffer += chunk.toString();
      });
      child.stderr?.on('data', function onStderr(chunk: Buffer): void {
        logBuffer += chunk.toString();
      });

      await pollHealth(
        port,
        function getChild(): ChildProcess | null {
          return child;
        },
        function getLog(): string {
          return logBuffer;
        },
        30_000
      );

      // AC1 assertions (Windows)
      expect(
        child.exitCode,
        'Windows process must still be running'
      ).toBeNull();
      expect(logBuffer).not.toMatch(/missing field ['"`]migrationsList['"`]/);
      expect(logBuffer).not.toMatch(/Migration failed/);

      // AC2 assertions (Windows) — db-path.ts uses os.homedir() which reads
      // USERPROFILE on Windows
      const dbPath = path.join(tempHome, '.dms', 'dms.db');
      expect(
        fs.existsSync(dbPath),
        `dms.db not found at ${dbPath}. Logs:\n${logBuffer}`
      ).toBe(true);
      assertDbSchema(dbPath);

      // AC3 assertions (Windows)
      // Note: productName in electron-builder.yml is 'DMS' (artifact name only).
      // The Angular app sets its own HTML title: 'Dividend Management System Material'.
      const result = await httpGet(`http://127.0.0.1:${port}/`);
      expect(result.statusCode).toBe(200);
      expect(result.body).toContain('<dms-root');
      expect(result.body).toContain('Dividend Management System Material');
    }
  );
});
