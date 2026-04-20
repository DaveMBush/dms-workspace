import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getApiPort: function getApiPort(): Promise<number> {
    return ipcRenderer.invoke('get-api-port') as Promise<number>;
  },
});
