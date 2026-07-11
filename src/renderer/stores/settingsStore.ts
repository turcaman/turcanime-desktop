import { create } from 'zustand';
import { storage } from '../utils/storage';
import { logger } from '../utils/logger';

type EpisodeOrder = 'asc' | 'desc';

interface SettingsState {
  episodeOrder: EpisodeOrder;
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

  setEpisodeOrder: async (order) => {
    const prev = get().episodeOrder;
    set({ episodeOrder: order });
    try {
      await storage.set('episode_order', order);
    } catch (err) {
      set({ episodeOrder: prev });
      logger.error('settingsStore', 'Failed to persist episode order', err);
    }
  },

  invalidateCache: () => {
    set({ cacheInvalidationTimestamp: Date.now() });
  },
}));
