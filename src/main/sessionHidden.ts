import { BrowserWindow, session } from 'electron';
import path from 'node:path';
import { logger } from './logger';
import { mergeCookies } from './cookies';

const SESSION_WASH_URL = 'https://www.animelatinohd.com/';
const POLL_TIMEOUT = 90_000;
// Backoff between washes so a failed wash doesn't immediately re-navigate
// and keep hammering the Cloudflare challenge.
const WASH_BACKOFF_INITIAL_MS = 30_000;
const WASH_BACKOFF_MAX_MS = 120_000;
// Skip re-navigating when a wash already succeeded moments ago, so the
// startup refresh (main + renderer) can't trigger a second wash.
const RECENT_WASH_MS = 10_000;

const GLOBAL_BOOTSTRAP = [
  '(function() {',
  "  console.log('[Bootstrap] Starting Cloudflare validation polling');",
  '',
  '  var post = function(type, data) {',
  "    if (!window.__electronBridge) return;",
  "    window.__electronBridge.postMessage(JSON.stringify({ type: type, data: data }));",
  '  };',
  '',
  '  var reportSession = function() {',
  '    var cookies = document.cookie;',
  "    console.log('[Bootstrap] Session acquired (cookies: ' + cookies.length + ' chars, UA: ' + navigator.userAgent.slice(0, 50) + '...)');",
  "    post('SESSION_UPDATE', {",
  '      cookies: cookies,',
  '      userAgent: navigator.userAgent',
  '    });',
  '  };',
  '',
  '  var pollForCloudflareValidation = function() {',
  '    var maxAttempts = 300;',
  '    var attempts = 0;',
  '    var check = function() {',
  '      attempts++;',
  "      var title = document.title || '';",
  "      var cookies = document.cookie || '';",
  '      if (attempts % 20 === 0) {',
  "        console.log('[Bootstrap] Poll attempt ' + attempts + '/' + maxAttempts + ' (title: \\\"' + title + '\\\", cookies: ' + cookies.length + ' chars)');",
  '      }',
  "      if (title.indexOf('Just a moment') === -1 && cookies.length > 0) {",
  '        reportSession();',
  '        return;',
  '      }',
  '      if (attempts >= maxAttempts) {',
  "        console.log('[Bootstrap] Max attempts reached, reporting anyway');",
  '        reportSession();',
  '        return;',
  '      }',
  '      setTimeout(check, 200);',
  '    };',
  '    check();',
  '  };',
  '',
  '  pollForCloudflareValidation();',
  '})();',
].join('\n');

interface SessionData {
  cookies: string;
  userAgent: string;
}

export class HiddenSessionWindow {
  private window: BrowserWindow | null = null;
  private currentSession: SessionData | null = null;
  private pendingResolve: ((session: SessionData) => void) | null = null;
  private pendingTimeout: ReturnType<typeof setTimeout> | null = null;
  private nextWashDelayMs = 0;
  private lastWashAt = 0;
  private cookieCaptureRegistered = false;

  private getWindow(): BrowserWindow {
    if (!this.window) {
      this.create();
    }
    return this.window as BrowserWindow;
  }

  create(): void {
    if (this.window) {
      logger.debug('SessionHidden', 'Already created, skipping');
      return;
    }

    logger.info('SessionHidden', 'Creating hidden BrowserWindow');

    this.window = new BrowserWindow({
      show: false,
      width: 800,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, 'sessionPreload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        partition: 'persist:anime-session',
      },
    });

    this.window.webContents.on('console-message', (event) => {
      const { level, message } = event as unknown as { level: number; message: string };
      const levelMap = ['verbose', 'info', 'warning', 'error'];

      if (message.startsWith('[Bootstrap] ')) {
        logger.debug('SessionHidden', `[bootstrap] ${message.slice(12)}`);
      } else if (level >= 2) {
        logger.warn('HiddenWindow', `[${levelMap[level] || 'log'}] ${message}`);
      }
    });

    this.window.webContents.on('did-finish-load', () => {
      const url = this.window?.webContents.getURL() || 'unknown';
      logger.info('SessionHidden', `Page loaded: ${url}, injecting bootstrap`);
      this.window?.webContents.executeJavaScript(GLOBAL_BOOTSTRAP).catch((err) => {
        if (!this.window) return;
        logger.warn('SessionHidden', 'Bootstrap injection interrupted', err);
      });
    });

    this.window.on('closed', () => {
      logger.debug('SessionHidden', 'Hidden window closed');
      this.window = null;
    });

    this.registerCookieCapture();
  }

  // Absorb Set-Cookie headers from every response in the hidden session
  // (fetchInPage and the wash alike) into the serialized snapshot, mirroring
  // the mobile fetch layer. The Chromium cookie jar of the hidden window
  // already stores these automatically, so this only keeps the snapshot used
  // by main-process net.fetch calls (fetch:bridge) fresh between washes,
  // avoiding AUTH_ERROR when the origin rotates its cookies mid-session.
  //
  // Deliberately passive: it never goes through setSession(), so the wash
  // machinery (backoff, last-good, pending resolvers) is never triggered, and
  // it only merges into an existing snapshot -- the wash owns session creation.
  private registerCookieCapture(): void {
    if (this.cookieCaptureRegistered) return;
    this.cookieCaptureRegistered = true;

    const sess = session.fromPartition('persist:anime-session');
    sess.webRequest.onHeadersReceived((details, callback) => {
      callback({});
      const headers = details.responseHeaders;
      if (!headers) return;
      const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === 'set-cookie');
      if (!entry) return;
      const value = entry[1];
      const setCookies = Array.isArray(value) ? value : [value];
      if (setCookies.length === 0) return;
      this.mergeSessionCookies(setCookies);
    });
  }

  private mergeSessionCookies(setCookieHeaders: string[]): void {
    if (!this.currentSession || this.currentSession.cookies.length === 0) return;
    const merged = mergeCookies(this.currentSession.cookies, setCookieHeaders);
    if (merged !== this.currentSession.cookies) {
      this.currentSession = { ...this.currentSession, cookies: merged };
      logger.debug('SessionHidden', `Session cookies merged (${merged.length} chars)`);
    }
  }

  destroy(): void {
    logger.info('SessionHidden', 'Destroying hidden BrowserWindow');
    this.resolvePending({ cookies: '', userAgent: '' });
    if (this.window) {
      this.window.close();
      this.window = null;
    }
  }

  setSession(cookies: string, userAgent: string): void {
    const hasCookies = cookies.length > 0;
    logger.info('SessionHidden', `Session ${hasCookies ? 'acquired' : 'cleared'} (cookies: ${cookies.length} chars)`);

    // Backoff between washes: a failed wash must not trigger an immediate re-navigation.
    if (hasCookies) {
      this.nextWashDelayMs = 0;
      this.lastWashAt = Date.now();
    } else {
      this.nextWashDelayMs = this.nextWashDelayMs === 0
        ? WASH_BACKOFF_INITIAL_MS
        : Math.min(this.nextWashDelayMs * 2, WASH_BACKOFF_MAX_MS);
      logger.warn('SessionHidden', `Wash failed, next wash allowed in ${this.nextWashDelayMs}ms`);
    }

    // Keep the last good session: a failed wash must not wipe valid cookies.
    if (!hasCookies && this.currentSession && this.currentSession.cookies.length > 0) {
      logger.warn('SessionHidden', 'Wash returned empty cookies, keeping previous session');
      this.resolvePending(this.currentSession);
      return;
    }

    this.currentSession = { cookies, userAgent };
    this.resolvePending(this.currentSession);
  }

  private resolvePending(session: SessionData): void {
    if (this.pendingResolve) {
      this.pendingResolve(session);
      this.pendingResolve = null;
    }
    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }
  }

  getSession(): SessionData | null {
    return this.currentSession;
  }

  async refreshSession(): Promise<SessionData> {
    if (!this.window) {
      logger.debug('SessionHidden', 'No window yet, creating one');
      this.create();
    }

    if (this.nextWashDelayMs > 0) {
      logger.warn('SessionHidden', 'Wash backoff active, returning current session without navigating');
      return this.currentSession ?? { cookies: '', userAgent: '' };
    }

    if (Date.now() - this.lastWashAt < RECENT_WASH_MS) {
      logger.debug('SessionHidden', 'Wash completed recently, returning current session');
      return this.currentSession ?? { cookies: '', userAgent: '' };
    }

    // If there's already a pending refresh, wait for it instead of navigating again
    if (this.pendingResolve) {
      logger.debug('SessionHidden', 'Refresh already pending, waiting...');
      return new Promise<SessionData>((resolve) => {
        const original = this.pendingResolve;
        this.pendingResolve = (session) => {
          original(session);
          resolve(session);
        };
      });
    }

    logger.info('SessionHidden', 'Navigating to session wash URL');

    return new Promise<SessionData>((resolve) => {
      this.pendingResolve = resolve;

      this.pendingTimeout = setTimeout(() => {
        logger.warn('SessionHidden', 'Session refresh timed out');
        this.setSession('', this.currentSession?.userAgent ?? '');
      }, POLL_TIMEOUT);

      const win = this.getWindow();
      win.loadURL(SESSION_WASH_URL).catch((err) => {
        // Navigation interrupted by shutdown is expected; only report
        // failures while the window is still alive.
        if (!this.window) return;
        logger.warn('SessionHidden', 'Wash navigation interrupted', err);
      });
    });
  }

  async fetchInPage(
    url: string,
    options?: Record<string, unknown>,
  ): Promise<{ ok: boolean; status: number; data: string | null; error?: string }> {
    const win = this.getWindow();

    const method = (options?.method as string) ?? 'GET';
    const headers = (options?.headers as Record<string, string>) ?? {};
    const body = options?.body as string | undefined;

    const safeUrl = url.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const safeHeaders = JSON.stringify(headers);

    let script: string;
    if (method === 'GET') {
      script = [
        "fetch('" + safeUrl + "', {",
        "  method: 'GET',",
        "  headers: " + safeHeaders + ",",
        '})',
        ".then(function(r) {",
        "  return r.text().then(function(text) {",
        "    return JSON.stringify({ ok: r.ok, status: r.status, data: text });",
        "  });",
        "})",
        ".catch(function(err) {",
        "  return JSON.stringify({ ok: false, status: 0, data: null, error: (err && typeof err.message === 'string') ? err.message : String(err) });",
        '})',
      ].join('\n');
    } else {
      const safeBody = body ? body.replace(/\\/g, '\\\\').replace(/'/g, "\\'") : '';
      script = [
        "fetch('" + safeUrl + "', {",
        "  method: '" + method + "',",
        "  headers: " + safeHeaders + ",",
        "  body: '" + safeBody + "',",
        '})',
        ".then(function(r) {",
        "  return r.text().then(function(text) {",
        "    return JSON.stringify({ ok: r.ok, status: r.status, data: text });",
        "  });",
        "})",
        ".catch(function(err) {",
        "  return JSON.stringify({ ok: false, status: 0, data: null, error: (err && typeof err.message === 'string') ? err.message : String(err) });",
        '})',
      ].join('\n');
    }

    try {
      logger.debug('SessionHidden', `fetchInPage: ${url.slice(0, 80)}`);
      const raw = await win.webContents.executeJavaScript(script);
      const result = JSON.parse(raw);
      logger.debug('SessionHidden', `fetchInPage: ${url.slice(0, 80)} -> ${result.status}`);
      return result;
    } catch (err) {
      logger.error('SessionHidden', `fetchInPage failed: ${url.slice(0, 60)}`, err);
      return { ok: false, status: 0, data: null, error: String(err) };
    }
  }
}

export const hiddenSession = new HiddenSessionWindow();
