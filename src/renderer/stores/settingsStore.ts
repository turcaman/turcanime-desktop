import { create } from 'zustand';
import { storage } from '../utils/storage';
import { logger } from '../utils/logger';
import { STORAGE_KEYS } from '../../config/storageKeys';

type EpisodeOrder = 'asc' | 'desc';

interface SettingsState {
  episodeOrder: EpisodeOrder;
  // Bumped whenever session-sensitive caches are wiped (mirrors the mobile
  // app), so the home screen refetches even while mounted.
  cacheInvalidationTimestamp: number;
  initialize: (data: { episodeOrder: EpisodeOrder }) => void;
  setEpisodeOrder: (order: EpisodeOrder) => Promise<void>;
  invalidateCache: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  episodeOrder: 'asc',
  cacheInvalidationTimestamp: 0,

  initialize: (data) => {
    set({ episodeOrder: data.episodeOrder });
  },

  invalidateCache: () => {
    set({ cacheInvalidationTimestamp: Date.now() });
  },

  setEpisodeOrder: async (order) => {
    const prev = get().episodeOrder;
    set({ episodeOrder: order });
    try {
      await storage.set(STORAGE_KEYS.episodeOrder, order);
    } catch (err) {
      set({ episodeOrder: prev });
      logger.error('settingsStore', 'Failed to persist episode order', err);
    }
  },
}));
