import type { ISession } from '../../types';

// Concurrent refreshes share one in-flight request so a burst of callers
// (stores, settings, reconnect) doesn't fire a wash per caller.
let refreshInFlight: Promise<ISession> | null = null;

export const sessionManager = {
  async initialize(): Promise<void> {
    try {
      await window.electronAPI.session.get();
    } catch {
      // session state is read lazily via getSession()
    }
  },

  async getSession(): Promise<ISession> {
    const session = await window.electronAPI.session.get();
    return (
      session ?? { cookies: '', userAgent: '' }
    );
  },

  // Never throws: an empty session means the refresh failed, so callers
  // check cookies.length instead of relying on exceptions.
  async refreshSession(): Promise<ISession> {
    if (refreshInFlight) return refreshInFlight;

    const run = (async (): Promise<ISession> => {
      const session = await window.electronAPI.session.refresh();
      return session ?? { cookies: '', userAgent: '' };
    })();

    refreshInFlight = run;
    try {
      return await run;
    } finally {
      refreshInFlight = null;
    }
  },

  async waitForCookies(): Promise<boolean> {
    const session = await this.getSession();
    if (session.cookies.length > 0) return true;

    if (refreshInFlight) {
      const refreshed = await refreshInFlight;
      return refreshed.cookies.length > 0;
    }

    return false;
  },
};
