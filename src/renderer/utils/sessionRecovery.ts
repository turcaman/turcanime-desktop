import { sessionManager } from '../services/session';
import { clearAllCache } from './cache';
import { logger } from './logger';

// Shared "recover from a stale session" step used by the home store's auth
// backoff, the reconnect hook and the settings refresh: renew the session and
// drop the cache when the new session carries cookies. Never throws; returns
// whether the session is usable so callers can reload accordingly.
export async function renewSessionAndClearCache(): Promise<boolean> {
  let session;
  try {
    session = await sessionManager.refreshSession();
  } catch (err) {
    logger.warn('SessionRecovery', 'Session refresh failed', err);
    return false;
  }
  const ok = session.cookies.length > 0;
  if (ok) {
    await clearAllCache();
  }
  return ok;
}
