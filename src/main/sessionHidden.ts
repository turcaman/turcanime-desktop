import { BrowserWindow } from 'electron';
import path from 'node:path';
import { logger } from './logger';

const SESSION_WASH_URL = 'https://www.animelatinohd.com/';
const POLL_TIMEOUT = 90_000;

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
      this.window?.webContents.executeJavaScript(GLOBAL_BOOTSTRAP);
    });

    this.window.on('closed', () => {
      logger.debug('SessionHidden', 'Hidden window closed');
      this.window = null;
    });
  }

  destroy(): void {
    logger.info('SessionHidden', 'Destroying hidden BrowserWindow');
    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }
    if (this.pendingResolve) {
      this.pendingResolve({ cookies: '', userAgent: '' });
      this.pendingResolve = null;
    }
    if (this.window) {
      this.window.close();
      this.window = null;
    }
  }

  setSession(cookies: string, userAgent: string): void {
    const hasCookies = cookies.length > 0;
    logger.info('SessionHidden', `Session ${hasCookies ? 'acquired' : 'cleared'} (cookies: ${cookies.length} chars)`);
    this.currentSession = { cookies, userAgent };
    if (this.pendingResolve) {
      this.pendingResolve(this.currentSession);
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

    const existing = this.currentSession;
    if (existing && existing.cookies.length > 0) {
      logger.debug('SessionHidden', 'Session already valid, returning cached');
      return existing;
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
        if (this.pendingResolve) {
          const session = this.currentSession ?? { cookies: '', userAgent: '' };
          this.pendingResolve(session);
          this.pendingResolve = null;
        }
      }, POLL_TIMEOUT);

      const win = this.getWindow();
      win.loadURL(SESSION_WASH_URL);
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
