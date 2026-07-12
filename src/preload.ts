import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  session: {
    get: () => {
      console.log('[Preload] session:get called');
      return ipcRenderer.invoke('session:get');
    },
    refresh: () => {
      console.log('[Preload] session:refresh called');
      return ipcRenderer.invoke('session:refresh');
    },
  },
  store: {
    get: (key: string) => {
      console.log(`[Preload] store:get ${key}`);
      return ipcRenderer.invoke('store:get', key);
    },
    set: (key: string, value: unknown) => {
      console.log(`[Preload] store:set ${key}`);
      return ipcRenderer.invoke('store:set', key, value);
    },
    delete: (key: string) => {
      console.log(`[Preload] store:delete ${key}`);
      return ipcRenderer.invoke('store:delete', key);
    },
    clear: () => {
      console.log('[Preload] store:clear');
      return ipcRenderer.invoke('store:clear');
    },
  },
  fetch: (url: string, options?: RequestInit) => {
    console.log(`[Preload] fetch: ${url.slice(0, 60)}...`);
    return ipcRenderer.invoke('fetch:request', url, options);
  },
  bridgeFetch: (url: string, headers: Record<string, string>) => {
    console.log(`[Preload] bridgeFetch: ${url.slice(0, 60)}...`);
    return ipcRenderer.invoke('fetch:bridge', url, headers);
  },
});
