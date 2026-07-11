import { create } from 'zustand';
import { storage } from '../utils/storage';
import { useHistoryStore } from './historyStore';
import { useSearchHistoryStore } from './searchHistoryStore';
import { useSettingsStore } from './settingsStore';
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

    useHistoryStore.getState().initialize(history);
    useSearchHistoryStore.getState().initialize(searches);
    useSettingsStore.getState().initialize({ episodeOrder });

    set({ isInitialized: true });
  },
}));

export { useHistoryStore } from './historyStore';
export { useSearchHistoryStore } from './searchHistoryStore';
export { useSettingsStore } from './settingsStore';
