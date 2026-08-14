import { ipcMain, net, shell, app, type BrowserWindow } from 'electron';
import { hiddenSession } from './sessionHidden';
import { store } from './store';
import { networkMonitor } from './networkMonitor';
import { logger } from './logger';
import { TIMEOUTS } from '../config/cache';
import { backoffDelay } from '../config/backoff';
import { SOURCE_CONFIG } from '../config/source';

let mainWindow: BrowserWindow | undefined;

export function setMainWindow(win: BrowserWindow): void {
  mainWindow = win;
}

type FetchViaNetResult = {
  ok: boolean;
  status: number;
  data: unknown;
  error?: string;
};

// Shared net.fetch wrapper for the proxy/bridge handlers. Main-process fetches
// are not subject to CORS and can attach the session UA and a same-origin
// Referer so CDNs that validate headers accept the requests. Logging and the
// uniform { ok, status, data } envelope (with error shaping) live in one
// place instead of being duplicated per handler.
//
// Requests that never complete (timeout or network error, status 0) are
// retried up to TIMEOUTS.MAX_ATTEMPTS with full-jitter backoff, mirroring the
// mobile fetch layer. HTTP statuses flow through untouched so the caller
// (store or hls.js) applies its own policy. retryOnFailure=false keeps one
// timed attempt for HLS segments, where hls.js owns the retry logic.
async function fetchViaNet(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string },
  parse: 'text' | 'json' | 'buffer',
  label: string,
  retryOnFailure = true,
): Promise<FetchViaNetResult> {
  const attemptFetch = async (): Promise<FetchViaNetResult> => {
    try {
      const response = await net.fetch(url, init);
      if (parse === 'buffer') {
        const data = await response.arrayBuffer();
        logger.debug('IPC', `${label} ${url.slice(0, 80)} -> ${response.status} (${data.byteLength}B)`);
        return { ok: response.ok, status: response.status, data };
      }
      const data = parse === 'json' ? await response.json() : await response.text();
      const size = typeof data === 'string' ? `${data.length} bytes` : 'JSON';
      logger.debug('IPC', `${label} ${url.slice(0, 60)} -> ${response.status} (${size})`);
      return { ok: response.ok, status: response.status, data };
    } catch (err) {
      logger.error('IPC', `${label} failed: ${url.slice(0, 60)}: ${err}`);
      return { ok: false, status: 0, data: null, error: String(err) };
    }
  };

  for (let attempt = 0; ; attempt++) {
    const result = await withTimeout(
      attemptFetch(),
      TIMEOUTS.REQUEST_TIMEOUT,
      label,
      { ok: false, status: 0, data: null, error: 'TIMEOUT' },
    );
    if (result.ok || result.status !== 0 || !retryOnFailure) return result;
    if (attempt >= TIMEOUTS.MAX_ATTEMPTS - 1) return result;
    logger.info('IPC', `${label} failed (attempt ${attempt + 1}/${TIMEOUTS.MAX_ATTEMPTS}), retrying`);
    await sleep(backoffDelay(attempt));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Hidden-window fetches have no built-in timeout; a stalled page request
// would otherwise leave the store loading forever. Enforce a ceiling and
// report it as a TIMEOUT error (mirrors the mobile REQUEST_TIMEOUT).
async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
  timeoutValue: T,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
      }),
    ]);
  } catch (err) {
    if (err instanceof Error && err.message === 'TIMEOUT') {
      logger.warn('IPC', `${label} timed out after ${ms}ms`);
      return timeoutValue;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
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

  ipcMain.handle('store:getAllKeys', async () => {
    const keys = Object.keys(store.store);
    logger.debug('IPC', `store:getAllKeys -> ${keys.length} keys`);
    return keys;
  });

  ipcMain.handle('fetch:request', async (_event, url: string, options?: Record<string, unknown>) => {
    logger.debug('IPC', `fetch:request ${url.slice(0, 80)}`);
    for (let attempt = 0; ; attempt++) {
      const result = await withTimeout(
        hiddenSession.fetchInPage(url, options),
        TIMEOUTS.REQUEST_TIMEOUT,
        `fetch:request ${url.slice(0, 60)}`,
        { ok: false, status: 0, data: null, error: 'TIMEOUT' },
      );
      // Retry only when the request never completed (timeout / network error);
      // real HTTP responses go back as-is for the store to handle.
      if (result.ok || result.status !== 0) return result;
      if (attempt >= TIMEOUTS.MAX_ATTEMPTS - 1) return result;
      logger.info('IPC', `fetch:request failed (attempt ${attempt + 1}/${TIMEOUTS.MAX_ATTEMPTS}), retrying`);
      await sleep(backoffDelay(attempt));
    }
  });

  ipcMain.handle('fetch:proxy', async (_event, url: string, opts: { method?: string; headers?: Record<string, string>; body?: string; json?: boolean }) => {
    logger.debug('IPC', `fetch:proxy ${url.slice(0, 80)}`);
    return fetchViaNet(
      url,
      {
        method: opts?.method ?? 'GET',
        headers: opts?.headers ?? {},
        body: opts?.body,
      },
      opts?.json ? 'json' : 'text',
      'fetch:proxy',
    );
  });

  // Binary variant of fetch:proxy for HLS segments (hls.js custom loader).
  // Supports byte-range requests for #EXT-X-BYTERANGE playlists: the Range
  // header is sent and, if the server ignores it (200 full body), the slice is
  // applied here so hls.js always receives exactly the requested bytes.
  ipcMain.handle('fetch:proxyBuffer', async (_event, url: string, rangeStart: number | null = null, rangeEnd: number | null = null) => {
    const session = hiddenSession.getSession();
    const headers: Record<string, string> = {
      'User-Agent': session?.userAgent ?? '',
      // The stream CDNs validate the Referer against the site, not the CDN's
      // own origin: the site player embeds the stream with the site referer
      // (same pattern the working fetch:bridge uses). A self-referrer (CDN
      // origin) looks like a hotlink and gets 403.
      'Referer': `${SOURCE_CONFIG.baseUrl}/`,
      'Accept': '*/*',
    };
    // HLS CDNs may also gate playlists/segments on the session cookies set
    // during stream resolution; send them like the site player does.
    if (session?.cookies) {
      headers['Cookie'] = session.cookies;
    }
    // rangeEnd === 0 means "no byte range" (hls.js defaults to 0,0); only
    // real EXT-X-BYTERANGE requests carry an end offset.
    if (rangeStart != null && rangeEnd != null && rangeEnd > 0) {
      headers['Range'] = `bytes=${rangeStart}-${rangeEnd}`;
    }
    const result = await fetchViaNet(
      url,
      { method: 'GET', headers },
      'buffer',
      'fetch:proxyBuffer',
      false, // hls.js owns retry for segments; keep a single timed attempt
    );
    // Server ignored the Range header: trim to the requested window.
    if (
      rangeStart != null && rangeEnd != null && rangeEnd > 0 &&
      result.data instanceof ArrayBuffer &&
      result.data.byteLength > rangeEnd - rangeStart + 1
    ) {
      return {
        ok: result.ok,
        status: result.status,
        data: result.data.slice(rangeStart, rangeEnd + 1),
        error: result.error,
      };
    }
    return result;
  });

  ipcMain.handle('fetch:bridge', async (_event, url: string, headers: Record<string, string>) => {
    logger.debug('IPC', `fetch:bridge ${url.slice(0, 80)}`);
    logger.debug('IPC', `fetch:bridge headers: ${JSON.stringify(headers)}`);
    const result = await fetchViaNet(url, { method: 'GET', headers }, 'text', 'fetch:bridge');
    if (!result.ok && typeof result.data === 'string') {
      logger.warn('IPC', `fetch:bridge response body (first 500): ${result.data.slice(0, 500)}`);
    }
    return result;
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
