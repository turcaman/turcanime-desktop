import { create } from 'zustand';
import { storage } from '../utils/storage';
import { useHistoryStore } from './historyStore';
import { useSearchHistoryStore } from './searchHistoryStore';
import { useSettingsStore } from './settingsStore';
import { useUpdateStore } from './updateStore';
import { useUIStore } from './uiStore';
import type { HistoryItem } from '../../types';
import { STORAGE_KEYS } from '../config/storageKeys';

interface AppInitState {
  isInitialized: boolean;
  initialize: () => Promise<void>;
}

// History persisted by older versions used `url`; map it to `slug` so
// "continue watching" survives the upgrade.
function migrateHistoryItem(item: HistoryItem & { url?: string }): HistoryItem {
  return { ...item, slug: item.slug ?? item.url ?? '' };
}

export const useAppInitStore = create<AppInitState>((set) => ({
  isInitialized: false,

  initialize: async () => {
    const storedHistory = (await storage.get<HistoryItem[]>(STORAGE_KEYS.lastViewed)) ?? [];
    const history = storedHistory.map(migrateHistoryItem);
    const searches = (await storage.get<string[]>(STORAGE_KEYS.recentSearches)) ?? [];
    const episodeOrder =
      (await storage.get<'asc' | 'desc'>(STORAGE_KEYS.episodeOrder)) ?? 'asc';
    const updateCheckEnabled =
      (await storage.get<boolean>(STORAGE_KEYS.updateCheckEnabled)) ?? true;
    const sidebarCollapsed =
      (await storage.get<boolean>(STORAGE_KEYS.sidebarCollapsed)) ?? false;
    const currentVersion = await window.electronAPI.app.getVersion();

    useHistoryStore.getState().initialize(history);
    useSearchHistoryStore.getState().initialize(searches);
    useSettingsStore.getState().initialize({ episodeOrder });
    useUpdateStore.getState().initialize({ updateCheckEnabled, currentVersion });
    useUIStore.getState().initialize({ sidebarCollapsed });

    set({ isInitialized: true });
  },
}));