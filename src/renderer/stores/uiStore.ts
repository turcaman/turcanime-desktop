import { create } from 'zustand';

interface UIState {
  isRefreshingSession: boolean;
  setSessionRefreshing: (refreshing: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isRefreshingSession: false,

  setSessionRefreshing: (refreshing) => {
    set({ isRefreshingSession: refreshing });
  },
}));