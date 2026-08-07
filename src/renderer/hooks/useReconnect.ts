import { useEffect, useRef } from 'react';
import { useHomeStore } from '../stores/homeStore';
import { sessionManager } from '../services/session';
import { clearAllCache } from '../utils/cache';
import { logger } from '../utils/logger';

// When connection restores, wait 2s then refresh session + cache (mirrors
// mobile behavior). Avoids hammering the source while the network settles.
export function useReconnect(isConnected: boolean): void {
  const prevConnected = useRef<boolean | null>(null);

  useEffect(() => {
    const prev = prevConnected.current;
    prevConnected.current = isConnected;
    if (prev === false && isConnected === true) {
      const timer = setTimeout(() => {
        const doRefresh = async () => {
          useHomeStore.getState().prepareRefresh();

          let sessionOk = false;
          try {
            const session = await sessionManager.refreshSession();
            sessionOk = session.cookies.length > 0;
          } catch {
            logger.warn('Reconnect', 'Session refresh failed, skipping cache clear and using stale cache');
          }

          if (sessionOk) {
            await clearAllCache();
            useHomeStore.getState().fetchHome(true).catch((): void => undefined);
          } else {
            useHomeStore.getState().fetchHome(false).catch((): void => undefined);
          }
        };
        doRefresh();
      }, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isConnected]);
}