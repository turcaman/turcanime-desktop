import { create } from 'zustand';
import { storage } from '../utils/storage';
import { logger } from '../utils/logger';
import { STORAGE_KEYS } from '../config/storageKeys';

interface UIState {
  isRefreshingSession: boolean;
  sidebarCollapsed: boolean;
  setSessionRefreshing: (refreshing: boolean) => void;
  initialize: (data: { sidebarCollapsed: boolean }) => void;
  toggleSidebarCollapsed: () => Promise<void>;
}

export const useUIStore = create<UIState>((set, get) => ({
  isRefreshingSession: false,
  sidebarCollapsed: false,

  setSessionRefreshing: (refreshing) => {
    set({ isRefreshingSession: refreshing });
  },

  initialize: (data) => {
    set({ sidebarCollapsed: data.sidebarCollapsed });
  },

  toggleSidebarCollapsed: async () => {
    const next = !get().sidebarCollapsed;
    set({ sidebarCollapsed: next });
    try {
      await storage.set(STORAGE_KEYS.sidebarCollapsed, next);
    } catch (err) {
      set({ sidebarCollapsed: !next });
      logger.error('uiStore', 'Failed to persist sidebar collapsed state', err);
    }
  },
}));
