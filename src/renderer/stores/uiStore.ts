import { create } from 'zustand';

interface UIState {
  sessionRefreshTrigger: number;
  isRefreshingSession: boolean;
  triggerSessionRefresh: () => void;
  setSessionRefreshing: (refreshing: boolean) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sessionRefreshTrigger: 0,
  isRefreshingSession: false,

  triggerSessionRefresh: () => {
    if (get().isRefreshingSession) return;
    set({ sessionRefreshTrigger: Date.now(), isRefreshingSession: true });
  },

  setSessionRefreshing: (refreshing) => {
    set({ isRefreshingSession: refreshing });
  },
}));
