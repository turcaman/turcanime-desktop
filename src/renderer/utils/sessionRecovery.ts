import { sessionManager } from '../services/session';
import { storage } from './storage';
import { logger } from './logger';
import { SESSION_SENSITIVE_CACHE_PREFIXES } from '../../config/cache';

// Shared "recover from a stale session" step used by the home store's auth
// backoff, the reconnect hook and the settings refresh: renew the session and
// drop only the caches whose content depends on it (home, search) -- anime,
// servers and stream data stay valid across sessions (mirrors the mobile
// app). Never throws; returns whether the session is usable so callers can
// reload accordingly.
export async function renewSessionAndInvalidateCache(): Promise<boolean> {
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
