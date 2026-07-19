import { create } from 'zustand';
import { storage } from '../utils/storage';
import { logger } from '../utils/logger';

function parseVersion(v: string): number[] {
  return v.split('.').map(n => parseInt(n, 10) || 0);
}

function isNewer(latest: string, current: string): boolean {
  const l = parseVersion(latest);
  const c = parseVersion(current);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const a = l[i] || 0;
    const b = c[i] || 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}

interface UpdateState {
  updateCheckEnabled: boolean;
  updateAvailable: string | null;
  checkingForUpdates: boolean;
  lastCheckError: string | null;
  currentVersion: string | null;
  initialize: (data: { updateCheckEnabled: boolean; currentVersion: string }) => void;
  setUpdateCheckEnabled: (enabled: boolean) => Promise<void>;
  checkForUpdates: () => Promise<void>;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  updateCheckEnabled: true,
  updateAvailable: null,
  checkingForUpdates: false,
  lastCheckError: null,
  currentVersion: null,

  initialize: (data) => {
    set({ updateCheckEnabled: data.updateCheckEnabled, currentVersion: data.currentVersion });
  },

  setUpdateCheckEnabled: async (enabled) => {
    const prev = get().updateCheckEnabled;
    set({ updateCheckEnabled: enabled });
    try {
      await storage.set('update_check_enabled', enabled);
    } catch (err) {
      set({ updateCheckEnabled: prev });
      logger.error('updateStore', 'Failed to persist update check toggle', err);
    }
  },

  checkForUpdates: async () => {
    set({ checkingForUpdates: true, lastCheckError: null });
    try {
      const result = await window.electronAPI.updates.check();
      if (result.error) {
        set({ checkingForUpdates: false, lastCheckError: result.error });
        return;
      }
      const available = result.latest && isNewer(result.latest, result.current)
        ? result.latest
        : null;
      set({
        updateAvailable: available,
        currentVersion: result.current,
        checkingForUpdates: false,
        lastCheckError: null,
      });
    } catch (err) {
      set({ checkingForUpdates: false, lastCheckError: String(err) });
      logger.error('updateStore', 'Failed to check for updates', err);
    }
  },
}));
