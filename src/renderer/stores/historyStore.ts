import { create } from 'zustand';
import { storage } from '../utils/storage';
import { prependDedup, removeBy, computeContinueWatching } from '../utils/history';
import { logger } from '../utils/logger';
import type { HistoryItem } from '../../types';

const STORAGE_KEY = 'last_viewed';
const MAX_HISTORY = 50;

interface HistoryState {
  lastViewed: HistoryItem[];
  continueWatching: HistoryItem[];
  initialize: (items: HistoryItem[]) => void;
  addToHistory: (item: HistoryItem) => Promise<void>;
  removeFromHistory: (url: string) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  lastViewed: [],
  continueWatching: [],

  initialize: (items) => {
    set({
      lastViewed: items,
      continueWatching: computeContinueWatching(items),
    });
  },

  addToHistory: async (item) => {
    const prev = get().lastViewed;
    const updated = prependDedup(
      prev,
      { ...item, timestamp: Date.now() },
      MAX_HISTORY,
      'url' as keyof HistoryItem,
    );
    set({
      lastViewed: updated,
      continueWatching: computeContinueWatching(updated),
    });
    try {
      await storage.set(STORAGE_KEY, updated);
    } catch (err) {
      set({ lastViewed: prev, continueWatching: computeContinueWatching(prev) });
      logger.error('historyStore', 'Failed to persist history', err);
    }
  },

  removeFromHistory: async (url) => {
    const prev = get().lastViewed;
    const updated = removeBy(prev, (item) => item.url === url);
    set({
      lastViewed: updated,
      continueWatching: computeContinueWatching(updated),
    });
    try {
      await storage.set(STORAGE_KEY, updated);
    } catch (err) {
      set({ lastViewed: prev, continueWatching: computeContinueWatching(prev) });
      logger.error('historyStore', 'Failed to remove from history', err);
    }
  },

  clearHistory: async () => {
    set({ lastViewed: [], continueWatching: [] });
    try {
      await storage.remove(STORAGE_KEY);
    } catch (err) {
      logger.error('historyStore', 'Failed to clear history', err);
    }
  },
}));
