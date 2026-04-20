import { contextBridge } from 'electron';

// Expose IPC surface to renderer in later stories
contextBridge.exposeInMainWorld('electronAPI', {});
