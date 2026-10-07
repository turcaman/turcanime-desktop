import { create } from 'zustand';
import { storage } from '../utils/storage';
import { logger } from '../utils/logger';
import { STORAGE_KEYS } from '../../config/storageKeys';

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

export type UpdatePhase = 'idle' | 'confirm' | 'downloading' | 'installing' | 'error';
export type InstallMode = 'appimage' | 'installer' | 'browser';

export interface UpdateProgress {
  receivedBytes: number;
  totalBytes: number | null;
}

const RELEASES_PAGE = 'https://github.com/turcaman/turcanime-desktop/releases/latest';

let stopProgress: (() => void) | null = null;
// Bumped whenever the user dismisses or cancels, so a flow that resolves after
// the abort stops touching the phase instead of resurrecting the modal with a
// "Descarga cancelada" error.
let flowToken = 0;
let checkPromise: Promise<boolean> | null = null;

function mapDownloadError(error: string): string | null {
  // Typed codes from main (mirrors Android): cancelled is silent.
  if (error === 'cancelled') return null;
  if (error === 'stalled') return 'La descarga se detuvo por conexión lenta. Reintentá cuando tengas mejor señal.';
  if (error === 'timeout') return 'La descarga tardó demasiado. Reintentá con mejor conexión.';
  return error;
}

interface UpdateState {
  updateCheckEnabled: boolean;
  updateAvailable: string | null;
  checkingForUpdates: boolean;
  lastCheckError: string | null;
  currentVersion: string | null;
  phase: UpdatePhase;
  progress: UpdateProgress;
  errorMessage: string | null;
  installMode: InstallMode;
  assetName: string | null;
  assetSize: number | null;
  initialize: (data: { updateCheckEnabled: boolean; currentVersion: string }) => void;
  setUpdateCheckEnabled: (enabled: boolean) => Promise<void>;
  checkForUpdates: (force?: boolean) => Promise<boolean>;
  startUpdate: () => void;
  closeUpdate: () => void;
  confirmUpdate: () => Promise<void>;
  beginDownload: () => Promise<void>;
  cancelDownload: () => void;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  updateCheckEnabled: true,
  updateAvailable: null,
  checkingForUpdates: false,
  lastCheckError: null,
  currentVersion: null,
  phase: 'idle',
  progress: { receivedBytes: 0, totalBytes: null },
  errorMessage: null,
  installMode: 'browser',
  assetName: null,
  assetSize: null,

  initialize: (data) => {
    set({ updateCheckEnabled: data.updateCheckEnabled, currentVersion: data.currentVersion });
  },

  setUpdateCheckEnabled: async (enabled) => {
    const prev = get().updateCheckEnabled;
    set({ updateCheckEnabled: enabled });
    try {
      await storage.set(STORAGE_KEYS.updateCheckEnabled, enabled);
    } catch (err) {
      set({ updateCheckEnabled: prev });
      logger.error('updateStore', 'Failed to persist update check toggle', err);
    }
  },

  checkForUpdates: async (force = false) => {
    if (checkPromise) return checkPromise;
    checkPromise = (async () => {
      set({ checkingForUpdates: true, lastCheckError: null });
      try {
        const result = await window.electronAPI.updates.check(force);
        if (result.error) {
          set({ checkingForUpdates: false, lastCheckError: result.error });
          return false;
        }
        const available = result.latest && isNewer(result.latest, result.current)
          ? result.latest
          : null;
        set({
          updateAvailable: available,
          currentVersion: result.current,
          checkingForUpdates: false,
          lastCheckError: null,
          installMode: result.mode,
          assetName: result.asset?.name ?? null,
          assetSize: result.asset?.size ?? null,
        });
        return true;
      } catch (err) {
        set({ checkingForUpdates: false, lastCheckError: String(err) });
        logger.error('updateStore', 'Failed to check for updates', err);
        return false;
      }
    })();
    try {
      return await checkPromise;
    } finally {
      checkPromise = null;
    }
  },

  // Installs in place are only possible when the app knows how to replace
  // itself (AppImage / Squirrel). Anything else sends the user to the release
  // page instead of showing a modal that could never finish.
  startUpdate: () => {
    const { updateAvailable, installMode, assetName } = get();
    if (!updateAvailable) return;
    if (installMode === 'browser' || !assetName) {
      void window.electronAPI.app.openExternal(RELEASES_PAGE);
      return;
    }
    set({ phase: 'confirm', errorMessage: null });
  },

  closeUpdate: () => {
    if (get().phase === 'downloading') {
      void window.electronAPI.updates.cancel();
    }
    flowToken++;
    stopProgress?.();
    stopProgress = null;
    set({ phase: 'idle', errorMessage: null });
  },

  confirmUpdate: async () => {
    if (get().phase === 'downloading') return;
    await get().beginDownload();
  },

  beginDownload: async () => {
    // Re-entrant call (double click on "Actualizar" o Reintentar en error)
    if (get().phase === 'downloading') return;
    const token = ++flowToken;

    set({
      phase: 'downloading',
      progress: { receivedBytes: 0, totalBytes: get().assetSize },
      errorMessage: null,
    });

    stopProgress = window.electronAPI.updates.onProgress((progress) => {
      useUpdateStore.setState({ progress });
    });

    try {
      const download = await window.electronAPI.updates.download();
      if (token !== flowToken) return;
      if (!download.ok) {
        const mapped = mapDownloadError(download.error ?? '');
        if (mapped == null) {
          set({ phase: 'idle', errorMessage: null });
          return;
        }
        set({ phase: 'error', errorMessage: mapped });
        return;
      }

      set({ phase: 'installing' });
      const install = await window.electronAPI.updates.install();
      if (token !== flowToken) return;
      if (!install.ok) {
        set({ phase: 'error', errorMessage: install.error ?? 'No se pudo instalar la actualización.' });
      }
    } catch (err) {
      if (token !== flowToken) return;
      const message = err instanceof Error ? err.message : String(err);
      const mapped = mapDownloadError(message);
      if (mapped == null) {
        set({ phase: 'idle', errorMessage: null });
        return;
      }
      set({ phase: 'error', errorMessage: mapped });
      logger.error('updateStore', 'Update flow failed', err);
    } finally {
      stopProgress?.();
      stopProgress = null;
    }
  },

  cancelDownload: () => {
    void window.electronAPI.updates.cancel();
    flowToken++;
    stopProgress?.();
    stopProgress = null;
    set({ phase: 'idle', errorMessage: null });
  },
}));
