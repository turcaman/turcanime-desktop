import { create } from 'zustand';
import { storage } from '../utils/storage';
import { useHistoryStore } from './historyStore';
import { useSearchHistoryStore } from './searchHistoryStore';
import { useSettingsStore } from './settingsStore';
import { useUpdateStore } from './updateStore';
import type { HistoryItem } from '../../types';

interface UserInitState {
  isInitialized: boolean;
  initialize: () => Promise<void>;
}

// History persisted by older versions used `url`; map it to `slug` so
// "continue watching" survives the upgrade.
function migrateHistoryItem(item: HistoryItem & { url?: string }): HistoryItem {
  return { ...item, slug: item.slug ?? item.url ?? '' };
}

export const useUserInitializationStore = create<UserInitState>((set) => ({
  isInitialized: false,

  initialize: async () => {
    const storedHistory = (await storage.get<HistoryItem[]>('last_viewed')) ?? [];
    const history = storedHistory.map(migrateHistoryItem);
    const searches = (await storage.get<string[]>('recent_searches')) ?? [];
    const episodeOrder = (await storage.get<'asc' | 'desc'>('episode_order')) ?? 'asc';
    const updateCheckEnabled = (await storage.get<boolean>('update_check_enabled')) ?? true;
    const currentVersion = await window.electronAPI.app.getVersion();

    useHistoryStore.getState().initialize(history);
    useSearchHistoryStore.getState().initialize(searches);
    useSettingsStore.getState().initialize({ episodeOrder });
    useUpdateStore.getState().initialize({ updateCheckEnabled, currentVersion });

    set({ isInitialized: true });
  },
}));

export { useHistoryStore } from './historyStore';
export { useSearchHistoryStore } from './searchHistoryStore';
export { useSettingsStore } from './settingsStore';
export { useUpdateStore } from './updateStore';
