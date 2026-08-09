import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  session: {
    get: () => ipcRenderer.invoke('session:get'),
    refresh: () => ipcRenderer.invoke('session:refresh'),
  },
  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),
    delete: (key: string) => ipcRenderer.invoke('store:delete', key),
    getAllKeys: () => ipcRenderer.invoke('store:getAllKeys'),
  },
  fetch: (url: string, options?: RequestInit) =>
    ipcRenderer.invoke('fetch:request', url, options),
  bridgeFetch: (url: string, headers: Record<string, string>) =>
    ipcRenderer.invoke('fetch:bridge', url, headers),
  proxyFetch: (url: string, opts?: { method?: string; headers?: Record<string, string>; body?: string; json?: boolean }) =>
    ipcRenderer.invoke('fetch:proxy', url, opts),
  proxyBuffer: (url: string, rangeStart?: number | null, rangeEnd?: number | null) =>
    ipcRenderer.invoke('fetch:proxyBuffer', url, rangeStart ?? null, rangeEnd ?? null),
  fullscreen: {
    set: (flag: boolean) => ipcRenderer.invoke('player:setFullScreen', flag),
    onChanged: (cb: (flag: boolean) => void) => {
      const handler = (_event: unknown, flag: boolean) => cb(flag);
      ipcRenderer.on('player:fullscreen', handler);
      return () => ipcRenderer.removeListener('player:fullscreen', handler);
    },
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
  },
  updates: {
    check: () => ipcRenderer.invoke('updates:check'),
  },
  network: {
    check: () => ipcRenderer.invoke('network:check'),
    onChanged: (cb: (isOnline: boolean) => void) => {
      const handler = (_event: unknown, isOnline: boolean) => cb(isOnline);
      ipcRenderer.on('network:status-changed', handler);
      return () => ipcRenderer.removeListener('network:status-changed', handler);
    },
  },
});
