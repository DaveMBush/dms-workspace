import { ChildProcess, fork } from 'child_process';
import { app, BrowserWindow, dialog, ipcMain, session, shell } from 'electron';
import http from 'http';
import path from 'path';

import { resolveDbPath } from './utils/db-path';
import { ensureDbFile } from './utils/ensure-db-file';
import { findAvailablePort } from './utils/port';
import { runMigrations } from './utils/run-migrations';

let serverProcess: ChildProcess | null = null;
let resolvedPort: number | null = null;

const externalOpenLog: string[] = [];

function openExternal(url: string): void {
  if (process.env['ELECTRON_TEST_MODE'] === '1') {
    externalOpenLog.push(url);
    return;
  }
  void shell.openExternal(url);
}

function healthCheck(port: number): Promise<void> {
  return new Promise(function doHealthCheck(
    resolve: () => void,
    reject: (err: Error) => void
  ): void {
    const req = http.get(
      `http://127.0.0.1:${port}/api/health`,
      { timeout: 2000 },
      function onResponse(res): void {
        if (res.statusCode === 200) {
          res.resume();
          resolve();
        } else {
          res.resume();
          reject(
            new Error(
              `Health check failed with status: ${res.statusCode ?? 'unknown'}`
            )
          );
        }
      }
    );
    req.on('timeout', function onTimeout(): void {
      req.destroy(new Error('Health check request timed out'));
    });
    req.on('error', reject);
  });
}

interface ServerPaths {
  serverPath: string;
  serverCwd: string;
  staticDir: string;
}

function resolveServerPaths(): ServerPaths {
  if (app.isPackaged) {
    return {
      serverPath: path.join(process.resourcesPath, 'apps/server/main.js'),
      serverCwd: process.resourcesPath,
      staticDir: path.join(process.resourcesPath, 'apps/dms-material/browser'),
    };
  }
  const workspaceRoot = path.resolve(__dirname, '../../..');
  return {
    serverPath: path.join(workspaceRoot, 'dist/apps/server/main.js'),
    serverCwd: workspaceRoot,
    staticDir: path.join(workspaceRoot, 'dist/apps/dms-material/browser'),
  };
}

function attachServerProcessListeners(
  proc: ChildProcess,
  timeout: ReturnType<typeof setTimeout>,
  resolve: () => void,
  reject: (err: Error) => void
): void {
  proc.on('message', function onMessage(msg: Buffer | object | string): void {
    if (msg === 'ready') {
      clearTimeout(timeout);
      resolve();
    }
  });

  proc.on('error', function onError(err: Error): void {
    clearTimeout(timeout);
    reject(err);
  });

  proc.on('exit', function onExit(code: number | null): void {
    clearTimeout(timeout);
    if (code !== 0) {
      reject(new Error(`Server process exited with code ${code ?? 'null'}`));
    }
  });
}

function startServer(port: number): Promise<void> {
  return new Promise(function doStartServer(
    resolve: () => void,
    reject: (err: Error) => void
  ): void {
    const nodeExecPath =
      process.env['DMS_NODE_EXEC_PATH'] ?? process.env['npm_node_execpath'];

    if (nodeExecPath === undefined || nodeExecPath.length === 0) {
      reject(
        new Error(
          'Missing DMS_NODE_EXEC_PATH or npm_node_execpath; refusing to fork the server with the Electron binary'
        )
      );
      return;
    }

    const { serverPath, serverCwd, staticDir } = resolveServerPaths();

    serverProcess = fork(serverPath, [], {
      cwd: serverCwd,
      env: { ...process.env, PORT: String(port), STATIC_DIR: staticDir },
      execPath: nodeExecPath,
      silent: false,
    });

    const timeout = setTimeout(function onTimeout(): void {
      reject(new Error('Server start timeout after 10 seconds'));
    }, 10_000);

    attachServerProcessListeners(serverProcess, timeout, resolve, reject);
  });
}

function isLocalAppUrl(url: string, port: number): boolean {
  try {
    return new URL(url).origin === `http://localhost:${port}`;
  } catch {
    return false;
  }
}

function handleWillNavigate(
  event: Electron.Event,
  url: string,
  port: number
): void {
  if (!isLocalAppUrl(url, port)) {
    event.preventDefault();
    const scheme = url.slice(0, url.indexOf(':') + 1).toLowerCase();
    if (scheme === 'http:' || scheme === 'https:') {
      openExternal(url);
    }
  }
}

function configureContentSecurityPolicy(port: number): void {
  session.defaultSession.webRequest.onHeadersReceived(
    function onHeadersReceived(details, callback): void {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            `default-src 'self' http://localhost:${port}; ` +
              `script-src 'self' 'unsafe-hashes' 'sha256-MhtPZXr7+LpJUY5qtMutB+qWfQtMaPccfe7QXtCcEYc='; ` +
              `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ` +
              `font-src 'self' https://fonts.gstatic.com; ` +
              `img-src 'self' data: https:; ` +
              `connect-src 'self' http://localhost:${port} https://*.amazonaws.com https://cognito-idp.us-east-1.amazonaws.com https://cognito-identity.us-east-1.amazonaws.com;`,
          ],
        },
      });
    }
  );
}

function createWindow(port: number): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  win.webContents.on(
    'will-navigate',
    function onWillNavigate(event: Electron.Event, url: string): void {
      handleWillNavigate(event, url, port);
    }
  );

  win.webContents.setWindowOpenHandler(function onWindowOpen(
    details: Electron.HandlerDetails
  ): Electron.WindowOpenHandlerResponse {
    if (isLocalAppUrl(details.url, port)) {
      void win.loadURL(details.url);
    } else {
      const scheme = details.url
        .slice(0, details.url.indexOf(':') + 1)
        .toLowerCase();
      if (scheme === 'http:' || scheme === 'https:') {
        openExternal(details.url);
      }
    }
    return { action: 'deny' };
  });

  void win.loadURL(`http://localhost:${port}`);
}

function handleQuit(): void {
  if (!serverProcess) {
    return;
  }
  const child = serverProcess;
  child.kill('SIGTERM');
  setTimeout(function killIfStillAlive(): void {
    if (!child.killed && child.exitCode === null) {
      child.kill('SIGKILL');
    }
  }, 3000);
  child.once('exit', function clearRef(): void {
    serverProcess = null;
  });
}

function onWindowAllClosed(): void {
  if (process.platform !== 'darwin') {
    app.quit();
  }
}

function parseSmokePort(smokePortEnv: string): number {
  const parsed = parseInt(smokePortEnv, 10);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid DMS_SMOKE_PORT value: "${smokePortEnv}"`);
  }
  return parsed;
}

function registerTestGlobals(): void {
  (
    global as typeof globalThis & { electronTestExternalLog?: string[] }
  ).electronTestExternalLog = externalOpenLog;
}

function showFatalError(title: string, detail: string): void {
  dialog.showErrorBox(title, `${detail}\n\nThe application will now exit.`);
  app.exit(1);
}

async function initDatabase(dbPath: string): Promise<boolean> {
  try {
    ensureDbFile(dbPath);
  } catch (err) {
    showFatalError(
      'Database Initialisation Failed',
      `Could not create the database directory or file at ${dbPath}.\n\n${String(
        err
      )}`
    );
    return false;
  }
  process.env['DATABASE_URL'] = `file:${dbPath}`;

  try {
    await runMigrations();
  } catch (err) {
    showFatalError(
      'Database Migration Failed',
      `Could not update the database schema.\n\n${String(err)}`
    );
    return false;
  }
  return true;
}

async function init(): Promise<void> {
  const dbPath = resolveDbPath();
  if (!(await initDatabase(dbPath))) {
    return;
  }

  try {
    const smokePortEnv = process.env['DMS_SMOKE_PORT'];
    const port =
      smokePortEnv !== undefined && smokePortEnv.length > 0
        ? parseSmokePort(smokePortEnv)
        : await findAvailablePort();
    resolvedPort = port;

    ipcMain.handle('get-api-port', function getApiPort(): number | null {
      return resolvedPort;
    });

    if (process.env['ELECTRON_TEST_MODE'] === '1') {
      registerTestGlobals();
    }

    await startServer(port);
    console.log(`[electron] Fastify started on port ${port}`);

    await healthCheck(port);
    console.log(`[electron] Health check passed on port ${port}`);

    await app.whenReady();
    configureContentSecurityPolicy(port);
    createWindow(port);
  } catch (error) {
    console.error('[electron] Failed to start server:', error);
    if (serverProcess?.exitCode === null) {
      serverProcess.kill('SIGKILL');
      serverProcess = null;
    }
    app.exit(1);
  }
}

app.on('before-quit', handleQuit);
app.on('window-all-closed', onWindowAllClosed);

void init();
