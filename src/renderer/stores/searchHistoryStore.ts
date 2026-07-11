import { create } from 'zustand';
import { storage } from '../utils/storage';
import { prependDedup, removeBy } from '../utils/history';
import { logger } from '../utils/logger';

const STORAGE_KEY = 'recent_searches';
const MAX_SEARCHES = 10;

interface SearchHistoryState {
  recentSearches: string[];
  initialize: (data: string[]) => void;
  saveRecentSearch: (term: string) => Promise<void>;
  removeRecentSearch: (term: string) => Promise<void>;
  clearRecentSearches: () => Promise<void>;
}

export const useSearchHistoryStore = create<SearchHistoryState>((set, get) => ({
  recentSearches: [],

  initialize: (data) => {
    set({ recentSearches: data });
  },

  saveRecentSearch: async (term) => {
    const prev = get().recentSearches;
    const updated = prependDedup(prev, term, MAX_SEARCHES);
    set({ recentSearches: updated });
    try {
      await storage.set(STORAGE_KEY, updated);
    } catch (err) {
      set({ recentSearches: prev });
      logger.error('searchHistoryStore', 'Failed to persist recent search', err);
    }
  },

  removeRecentSearch: async (term) => {
    const prev = get().recentSearches;
    const updated = removeBy(prev, (item) => item === term);
    set({ recentSearches: updated });
    try {
      await storage.set(STORAGE_KEY, updated);
    } catch (err) {
      set({ recentSearches: prev });
      logger.error('searchHistoryStore', 'Failed to remove recent search', err);
    }
  },

  clearRecentSearches: async () => {
    set({ recentSearches: [] });
    try {
      await storage.remove(STORAGE_KEY);
    } catch (err) {
      logger.error('searchHistoryStore', 'Failed to clear recent searches', err);
    }
  },
}));
