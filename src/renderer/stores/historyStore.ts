import { create } from 'zustand';
import { storage } from '../utils/storage';
import { removeBy, computeContinueWatching } from '../utils/history';
import { logger } from '../utils/logger';
import type { HistoryItem } from '../../types';

const STORAGE_KEY = 'last_viewed';
const MAX_HISTORY = 50;

interface HistoryState {
  lastViewed: HistoryItem[];
  continueWatching: HistoryItem[];
  initialize: (items: HistoryItem[]) => void;
  addToHistory: (item: HistoryItem) => Promise<void>;
  saveProgressSilent: (item: HistoryItem) => void;
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
    const newItem = { ...item, timestamp: Date.now() };
    const prev = get().lastViewed;
    // Dedup by url+number so each anime+episode appears once (like Android)
    const updated = [newItem, ...prev.filter(
      (i) => i.url !== newItem.url || i.number !== newItem.number,
    )].slice(0, MAX_HISTORY);
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

  saveProgressSilent: (item) => {
    // Update Zustand state in-memory without disk persist to avoid IPC stutter during playback
    const prev = get().lastViewed;
    const updated = [item, ...prev.filter(
      (i) => i.url !== item.url || i.number !== item.number,
    )].slice(0, MAX_HISTORY);
    set({
      lastViewed: updated,
      continueWatching: computeContinueWatching(updated),
    });
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
