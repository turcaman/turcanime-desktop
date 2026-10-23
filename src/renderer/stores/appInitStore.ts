import { create } from 'zustand';
import { storage } from '../utils/storage';
import { useHistoryStore } from './historyStore';
import { useSearchHistoryStore } from './searchHistoryStore';
import { useSettingsStore } from './settingsStore';
import { useUpdateStore } from './updateStore';
import type { HistoryItem } from '../../types';
import { STORAGE_KEYS } from '../../config/storageKeys';

interface AppInitState {
  isInitialized: boolean;
  initialize: () => Promise<void>;
}

// History persisted by older versions used `url`; map it to `slug` so
// "continue watching" survives the upgrade.
function migrateHistoryItem(item: HistoryItem & { url?: string }): HistoryItem {
  return { ...item, slug: item.slug ?? item.url ?? '' };
}

// A read failure is not "no data": retry briefly so a transient IPC error
// cannot make the app overwrite real history with empty defaults.
async function readStored<T>(key: string): Promise<T | null> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await storage.get<T>(key, true);
    } catch (err) {
      if (attempt >= 2) throw err;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

export const useAppInitStore = create<AppInitState>((set) => ({
  isInitialized: false,

  initialize: async () => {
    const storedHistory = (await readStored<HistoryItem[]>(STORAGE_KEYS.lastViewed)) ?? [];
    const history = storedHistory.map(migrateHistoryItem);
    const searches = (await readStored<string[]>(STORAGE_KEYS.recentSearches)) ?? [];
    const episodeOrder =
      (await readStored<'asc' | 'desc'>(STORAGE_KEYS.episodeOrder)) ?? 'asc';
    const updateCheckEnabled =
      (await readStored<boolean>(STORAGE_KEYS.updateCheckEnabled)) ?? true;
    const currentVersion = await window.electronAPI.app.getVersion();

    useHistoryStore.getState().initialize(history);
    useSearchHistoryStore.getState().initialize(searches);
    useSettingsStore.getState().initialize({ episodeOrder });
    useUpdateStore.getState().initialize({ updateCheckEnabled, currentVersion });

    set({ isInitialized: true });
  },
}));