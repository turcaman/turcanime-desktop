import { useEffect, useRef } from 'react';
import { useHomeStore } from '../stores/homeStore';
import { useUpdateStore } from '../stores/updateStore';
import { renewSession } from '../utils/sessionRecovery';

// Chromium can emit both the offline/online transition and a resume
// event for one wake (and Windows can emit resume twice), so coalesce
// recoveries that land in the same settle window.
const RECOVERY_DEDUP_MS = 1_500;
let lastRecoveryAt = 0;

// Shared recovery work for a network-status transition and a system
// resume: wait 2s for the link to settle, then renew the session and
// refresh the home cache. Avoids hammering the source right after wake.
function scheduleRecovery(): () => void {
  const now = Date.now();
  if (now - lastRecoveryAt < RECOVERY_DEDUP_MS) return () => undefined;
  lastRecoveryAt = now;

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

// When connection restores, refresh session + cache (mirrors mobile
// behavior). A resume event also runs recovery when Chromium never
// reported the offline transition during sleep.
export function useReconnect(isConnected: boolean): void {
  const prevConnected = useRef<boolean | null>(null);

  useEffect(() => {
    const prev = prevConnected.current;
    prevConnected.current = isConnected;
    if (prev === false && isConnected === true) {
      return scheduleRecovery();
    }
    return undefined;
  }, [isConnected]);

  useEffect(() => {
    const off = window.electronAPI.network.onResume(scheduleRecovery);
    return off;
  }, []);
}
