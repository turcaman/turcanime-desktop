import { sessionManager } from '../services/session';
import { storage } from './storage';
import { logger } from './logger';
import { useUIStore } from '../stores/uiStore';
import { SESSION_SENSITIVE_CACHE_PREFIXES } from '../../config/cache';

// Single entry point for "renew the session" used by the settings button, the
// reconnect hook and the home store's auth backoff. Mirrors the mobile app's
// triggerSessionRefresh: concurrent callers share the in-flight renewal (no
// double renewal, no spam on the settings button) and the UI flag stays set
// for the whole duration, so the button shows its loading state even when the
// refresh was triggered automatically.
let inflightSessionRenewal: Promise<boolean> | null = null;

export function renewSession(): Promise<boolean> {
  const ui = useUIStore.getState();
  if (ui.isRefreshingSession && inflightSessionRenewal) {
    return inflightSessionRenewal;
  }
  ui.setSessionRefreshing(true);
  inflightSessionRenewal = renewSessionAndInvalidateCache().finally(() => {
    inflightSessionRenewal = null;
    useUIStore.getState().setSessionRefreshing(false);
  });
  return inflightSessionRenewal;
}

// Shared "recover from a stale session" step: renew the session and drop only
// the caches whose content depends on it (home, search) -- anime, servers and
// stream data stay valid across sessions (mirrors the mobile app). Never
// throws; returns whether the session is usable so callers can reload
// accordingly.
async function renewSessionAndInvalidateCache(): Promise<boolean> {
  let session;
  try {
    session = await sessionManager.refreshSession();
  } catch (err) {
    logger.warn('SessionRecovery', 'Session refresh failed', err);
    return false;
  }
  const ok = session.cookies.length > 0;
  if (ok) {
    await clearSessionSensitiveCache();
  }
  return ok;
}

async function clearSessionSensitiveCache(): Promise<void> {
  try {
    const allKeys = await window.electronAPI.store.getAllKeys();
    for (const key of allKeys) {
      if (SESSION_SENSITIVE_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        await storage.remove(key);
      }
    }
  } catch (err) {
    logger.warn('SessionRecovery', 'Failed to clear session-sensitive cache', err);
  }
}
