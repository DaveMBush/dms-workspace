import { ChildProcess, fork } from 'child_process';
import { app, BrowserWindow, ipcMain } from 'electron';
import http from 'http';
import path from 'path';

import { findAvailablePort } from './utils/port';

let serverProcess: ChildProcess | null = null;
let resolvedPort: number | null = null;

function healthCheck(port: number): Promise<void> {
  return new Promise(function doHealthCheck(
    resolve: () => void,
    reject: (err: Error) => void
  ): void {
    const req = http.get(
      `http://localhost:${port}/api/health`,
      function onResponse(res): void {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject(
            new Error(
              `Health check failed with status: ${res.statusCode ?? 'unknown'}`
            )
          );
        }
      }
    );
    req.on('error', reject);
  });
}

function startServer(port: number): Promise<void> {
  return new Promise(function doStartServer(
    resolve: () => void,
    reject: (err: Error) => void
  ): void {
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

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  void win.loadURL('about:blank');
}

function handleQuit(): void {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    setTimeout(function killIfStillAlive(): void {
      if (serverProcess) {
        serverProcess.kill('SIGTERM');
        serverProcess = null;
      }
    }, 3000);
    serverProcess = null;
  }
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

    await startServer(port);
    console.log(`[electron] Fastify started on port ${port}`);

    await healthCheck(port);
    console.log(`[electron] Health check passed on port ${port}`);

    await app.whenReady();
    createWindow();
  } catch (error) {
    console.error('[electron] Failed to start server:', error);
    app.exit(1);
  }
}

app.on('before-quit', handleQuit);
app.on('window-all-closed', onWindowAllClosed);

void init();
