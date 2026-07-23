import { ipcMain, net, shell, app, type BrowserWindow } from 'electron';
import { hiddenSession } from './sessionHidden';
import { store } from './store';
import { networkMonitor } from './networkMonitor';
import { logger } from './logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const electronStore = store as any;

let mainWindow: BrowserWindow | undefined;

export function setMainWindow(win: BrowserWindow): void {
  mainWindow = win;
}

export function registerIpcHandlers(): void {
  logger.info('IPC', 'Registering IPC handlers');

  ipcMain.handle('session:get', async () => {
    const session = hiddenSession.getSession();
    logger.debug('IPC', `session:get -> ${session ? 'has session' : 'no session'}`);
    return session;
  });

  ipcMain.handle('session:refresh', async () => {
    logger.info('IPC', 'session:refresh requested');
    const session = await hiddenSession.refreshSession();
    logger.info('IPC', `session:refresh done (cookies: ${session.cookies.length} chars)`);
    return session;
  });

  ipcMain.on('session-from-hidden', (_event, message: string) => {
    try {
      const parsed = JSON.parse(message);
      if (parsed.type === 'SESSION_UPDATE' && parsed.data) {
        logger.debug('IPC', 'Session update received from hidden window');
        hiddenSession.setSession(parsed.data.cookies || '', parsed.data.userAgent || '');
      }
    } catch {
      logger.warn('IPC', 'Malformed message from hidden window');
    }
  });

  ipcMain.handle('store:get', async (_event, key: string) => {
    logger.debug('IPC', `store:get ${key}`);
    return electronStore.get(key);
  });

  ipcMain.handle('store:set', async (_event, key: string, value: unknown) => {
    logger.debug('IPC', `store:set ${key}`);
    electronStore.set(key, value);
    return true;
  });

  ipcMain.handle('store:delete', async (_event, key: string) => {
    logger.debug('IPC', `store:delete ${key}`);
    electronStore.delete(key);
    return true;
  });

  ipcMain.handle('store:clear', async () => {
    logger.info('IPC', 'store:clear');
    electronStore.clear();
    return true;
  });

  ipcMain.handle('store:getAllKeys', async () => {
    const keys = Object.keys(electronStore.store);
    logger.debug('IPC', `store:getAllKeys -> ${keys.length} keys`);
    return keys;
  });

  ipcMain.handle('fetch:request', async (_event, url: string, options?: Record<string, unknown>) => {
    logger.debug('IPC', `fetch:request ${url.slice(0, 80)}`);
    const result = await hiddenSession.fetchInPage(url, options);
    return result;
  });

  ipcMain.handle('fetch:proxy', async (_event, url: string, opts: { method?: string; headers?: Record<string, string>; body?: string; json?: boolean }) => {
    logger.debug('IPC', `fetch:proxy ${url.slice(0, 80)}`);
    try {
      const method = opts?.method ?? 'GET';
      const headers = opts?.headers ?? {};
      const body = opts?.body;
      const response = await net.fetch(url, { method, headers, body });
      if (opts?.json) {
        const data = await response.json();
        logger.debug('IPC', `fetch:proxy ${url.slice(0, 60)} -> ${response.status} (JSON)`);
        return { ok: response.ok, status: response.status, data };
      }
      const data = await response.text();
      logger.debug('IPC', `fetch:proxy ${url.slice(0, 60)} -> ${response.status} (${data.length} bytes)`);
      return { ok: response.ok, status: response.status, data };
    } catch (err) {
      logger.error('IPC', `fetch:proxy failed: ${url.slice(0, 60)}: ${err}`);
      return { ok: false, status: 0, data: null, error: String(err) };
    }
  });

  ipcMain.handle('fetch:bridge', async (_event, url: string, headers: Record<string, string>) => {
    logger.debug('IPC', `fetch:bridge ${url.slice(0, 80)}`);
    try {
      logger.debug('IPC', `fetch:bridge headers: ${JSON.stringify(headers)}`);
      const response = await net.fetch(url, { method: 'GET', headers });
      const data = await response.text();
      logger.debug('IPC', `fetch:bridge ${url.slice(0, 60)} -> ${response.status} (${data.length} bytes)`);
      if (!response.ok) {
        logger.warn('IPC', `fetch:bridge response body (first 500): ${data.slice(0, 500)}`);
      }
      return { ok: response.ok, status: response.status, data };
    } catch (err) {
      logger.error('IPC', `fetch:bridge failed: ${url.slice(0, 60)}: ${err}`);
      return { ok: false, status: 0, data: null, error: String(err) };
    }
  });

  ipcMain.handle('player:setFullScreen', (_event, flag: boolean) => {
    logger.debug('IPC', `player:setFullScreen ${flag}`);
    mainWindow?.setFullScreen(flag);
    return true;
  });

  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });

  ipcMain.handle('app:openExternal', async (_event, url: string) => {
    await shell.openExternal(url);
  });

  ipcMain.handle('updates:check', async () => {
    try {
      const current = app.getVersion();
      const response = await net.fetch(
        'https://api.github.com/repos/turcaman/turcanime-desktop/releases/latest',
        { headers: { Accept: 'application/vnd.github+json' } },
      );
      if (!response.ok) {
        return { latest: null, current, error: `Error al consultar GitHub (${response.status})` };
      }
      const data = await response.json();
      const latest = (data.tag_name as string)?.replace(/^v/, '') || null;
      return { latest, current };
    } catch (err) {
      return { latest: null, current: app.getVersion(), error: String(err) };
    }
  });

  ipcMain.handle('network:check', async () => {
    return networkMonitor.check();
  });
}
