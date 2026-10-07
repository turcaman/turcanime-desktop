import { useEffect, useRef } from 'react';
import { useHomeStore } from '../stores/homeStore';
import { useUpdateStore } from '../stores/updateStore';
import { renewSession } from '../utils/sessionRecovery';

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
          const ok = await renewSession();
          useHomeStore.getState().fetchHome(ok).catch((): void => undefined);
        };
        void doRefresh();
        if (useUpdateStore.getState().updateCheckEnabled !== false) {
          void useUpdateStore.getState().checkForUpdates();
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isConnected]);
}
