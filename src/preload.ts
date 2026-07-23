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
    getAllKeys: () => {
      console.log('[Preload] store:getAllKeys');
      return ipcRenderer.invoke('store:getAllKeys');
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
  proxyFetch: (url: string, opts?: { method?: string; headers?: Record<string, string>; body?: string; json?: boolean }) => {
    console.log(`[Preload] proxyFetch: ${url.slice(0, 60)}...`);
    return ipcRenderer.invoke('fetch:proxy', url, opts);
  },
  fullscreen: {
    set: (flag: boolean) => {
      console.log(`[Preload] fullscreen:set ${flag}`);
      return ipcRenderer.invoke('player:setFullScreen', flag);
    },
    onChanged: (cb: (flag: boolean) => void) => {
      const handler = (_event: unknown, flag: boolean) => cb(flag);
      ipcRenderer.on('player:fullscreen', handler);
      return () => ipcRenderer.removeListener('player:fullscreen', handler);
    },
  },
  app: {
    getVersion: () => {
      return ipcRenderer.invoke('app:getVersion');
    },
    openExternal: (url: string) => {
      return ipcRenderer.invoke('app:openExternal', url);
    },
  },
  updates: {
    check: () => {
      return ipcRenderer.invoke('updates:check');
    },
  },
  network: {
    check: () => {
      return ipcRenderer.invoke('network:check');
    },
    onChanged: (cb: (isOnline: boolean) => void) => {
      const handler = (_event: unknown, isOnline: boolean) => cb(isOnline);
      ipcRenderer.on('network:status-changed', handler);
      return () => ipcRenderer.removeListener('network:status-changed', handler);
    },
  },
});
