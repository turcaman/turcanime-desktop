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

export const useUserInitializationStore = create<UserInitState>((set) => ({
  isInitialized: false,

  initialize: async () => {
    const history = (await storage.get<HistoryItem[]>('last_viewed')) ?? [];
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
