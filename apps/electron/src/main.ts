import { ChildProcess, fork } from 'child_process';
import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
import http from 'http';
import path from 'path';

import { findAvailablePort } from './utils/port';

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

function startServer(port: number): Promise<void> {
  return new Promise(function doStartServer(
    resolve: () => void,
    reject: (err: Error) => void
  ): void {
    // Note: serverPath must be updated for asar-packaged production builds
    const serverPath = path.join(
      __dirname,
      '../../../dist/apps/server/main.js'
    );
    serverProcess = fork(serverPath, [], {
      env: { ...process.env, PORT: String(port) },
      silent: false,
    });

    const timeout = setTimeout(function onTimeout(): void {
      reject(new Error('Server start timeout after 10 seconds'));
    }, 10_000);

    serverProcess.on(
      'message',
      function onMessage(msg: Buffer | object | string): void {
        if (msg === 'ready') {
          clearTimeout(timeout);
          resolve();
        }
      }
    );

    serverProcess.on('error', function onError(err: Error): void {
      clearTimeout(timeout);
      reject(err);
    });

    serverProcess.on('exit', function onExit(code: number | null): void {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`Server process exited with code ${code ?? 'null'}`));
      }
    });
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
              `script-src 'self'; ` +
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

async function init(): Promise<void> {
  try {
    const port = await findAvailablePort();
    resolvedPort = port;

    ipcMain.handle('get-api-port', function getApiPort(): number | null {
      return resolvedPort;
    });

    if (process.env['ELECTRON_TEST_MODE'] === '1') {
      ipcMain.handle(
        'get-external-open-calls',
        function getExternalOpenCalls(): string[] {
          return externalOpenLog;
        }
      );
      (
        global as typeof globalThis & { electronTestExternalLog?: string[] }
      ).electronTestExternalLog = externalOpenLog;
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
