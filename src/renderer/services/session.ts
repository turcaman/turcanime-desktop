import type { ISession } from '../../types';

let sessionReadyPromise: Promise<void> | null = null;
let readyResolve: (() => void) | null = null;

const SESSION_TIMEOUT = 60_000;

export const sessionManager = {
  async initialize(): Promise<void> {
    sessionReadyPromise = new Promise((resolve) => {
      readyResolve = resolve;
    });
    try {
      const existing = await window.electronAPI.session.get();
      if (existing && existing.cookies.length > 0) {
        readyResolve?.();
      }
    } catch {
      // will be resolved on first successful refresh
    }
  },

  async waitForCookies(): Promise<boolean> {
    if (!sessionReadyPromise) return false;
    const timeout = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), SESSION_TIMEOUT);
    });
    await Promise.race([sessionReadyPromise, timeout]);
    const session = await this.getSession();
    return session.cookies.length > 0;
  },

  async getSession(): Promise<ISession> {
    const session = await window.electronAPI.session.get();
    return (
      session ?? { cookies: '', userAgent: '' }
    );
  },

  async refreshSession(): Promise<ISession> {
    const session = await window.electronAPI.session.refresh();
    readyResolve?.();
    return session;
  },

  invalidateCookies(): void {
    sessionReadyPromise = new Promise((resolve) => {
      readyResolve = resolve;
    });
  },
};
