import { ipcMain } from 'electron';
import { hiddenSession } from './sessionHidden';
import ElectronStore from 'electron-store';
import { logger } from './logger';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

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

    const session = hiddenSession.getSession();
    const headers: Record<string, string> = {
      'User-Agent': session?.userAgent || DEFAULT_USER_AGENT,
      'Referer': 'https://www.animelatinohd.com/',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      ...(options?.headers as Record<string, string>),
    };

    if (session?.cookies) {
      headers['Cookie'] = session.cookies;
    }

    try {
      const response = await fetch(url, { ...options, headers });

      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader && session) {
        const merged = mergeCookies(session.cookies, [setCookieHeader]);
        if (merged !== session.cookies) {
          logger.debug('IPC', 'Cookies updated from response');
          hiddenSession.setSession(merged, session.userAgent);
        }
      }

      logger.debug('IPC', `fetch:request ${url.slice(0, 80)} -> ${response.status}`);
      const text = await response.text();
      return { ok: response.ok, status: response.status, data: text };
    } catch (err) {
      logger.error('IPC', `fetch:request failed: ${url.slice(0, 60)}`, err);
      return { ok: false, status: 0, data: null, error: String(err) };
    }
  });
}

function mergeCookies(existing: string, setCookieHeaders: string[]): string {
  const cookieMap = new Map<string, string>();

  existing.split(';').forEach((cookie) => {
    const trimmed = cookie.trim();
    if (!trimmed) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const name = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    cookieMap.set(name, value);
  });

  setCookieHeaders.forEach((header) => {
    const eqIdx = header.indexOf('=');
    if (eqIdx === -1) return;
    const name = header.slice(0, eqIdx).trim();
    const semiIdx = header.indexOf(';');
    const value = semiIdx === -1
      ? header.slice(eqIdx + 1).trim()
      : header.slice(eqIdx + 1, semiIdx).trim();
    cookieMap.set(name, value);
  });

  return Array.from(cookieMap.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}
