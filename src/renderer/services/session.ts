import type { ISession } from '../../types';

let sessionReadyPromise: Promise<void> | null = null;
let readyResolve: (() => void) | null = null;

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

  async waitForCookies(): Promise<void> {
    await sessionReadyPromise;
  },

  async getSession(): Promise<ISession> {
    const session = await window.electronAPI.session.get();
    return (
      session ?? { cookies: '', userAgent: '' }
    );
  },

  async refreshSession(): Promise<void> {
    await window.electronAPI.session.refresh();
    readyResolve?.();
  },

  invalidateCookies(): void {
    sessionReadyPromise = new Promise((resolve) => {
      readyResolve = resolve;
    });
  },
};
