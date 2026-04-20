import { app, BrowserWindow } from 'electron';
import path from 'path';

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

function onWindowAllClosed(): void {
  if (process.platform !== 'darwin') {
    app.quit();
  }
}

void app.whenReady().then(createWindow);

app.on('window-all-closed', onWindowAllClosed);
