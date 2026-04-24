import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getApiPort: function getApiPort(): Promise<number> {
    return ipcRenderer.invoke('get-api-port') as Promise<number>;
  },
  isMockAuthEnabled: process.env['DMS_ENABLE_MOCK_AUTH'] === '1',
});
