import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('__electronBridge', {
  postMessage: (message: string) => {
    ipcRenderer.send('session-from-hidden', message);
  },
});
