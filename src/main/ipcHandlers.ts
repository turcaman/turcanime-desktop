import { ipcMain, net } from 'electron';
import { hiddenSession } from './sessionHidden';
import ElectronStore from 'electron-store';
import { logger } from './logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new ElectronStore() as any;

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
    return store.get(key);
  });

  ipcMain.handle('store:set', async (_event, key: string, value: unknown) => {
    logger.debug('IPC', `store:set ${key}`);
    store.set(key, value);
    return true;
  });

  ipcMain.handle('store:delete', async (_event, key: string) => {
    logger.debug('IPC', `store:delete ${key}`);
    store.delete(key);
    return true;
  });

  ipcMain.handle('store:clear', async () => {
    logger.info('IPC', 'store:clear');
    store.clear();
    return true;
  });

  ipcMain.handle('fetch:request', async (_event, url: string, options?: Record<string, unknown>) => {
    logger.debug('IPC', `fetch:request ${url.slice(0, 80)}`);
    const result = await hiddenSession.fetchInPage(url, options);
    return result;
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
}
