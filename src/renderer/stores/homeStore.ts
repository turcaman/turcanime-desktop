import { create } from 'zustand';
import { source } from '../services/source';
import { withCache } from '../utils/cache';
import { runWithRetry } from '../utils/runWithRetry';
import { CACHE_PREFIXES, CACHE_TTL } from '../../config/cache';
import type { AppError, HomeData } from '../../types';

let homeController: AbortController | null = null;

interface HomeState {
  homeData: HomeData;
  isHomeLoading: boolean;
  isRefreshing: boolean;
  error: AppError | null;
  fetchHome: (force?: boolean) => Promise<void>;
  prepareRefresh: () => void;
  reset: () => void;
}

export const useHomeStore = create<HomeState>((set) => ({
  homeData: { recent: [] },
  isHomeLoading: false,
  isRefreshing: false,
  error: null,

  fetchHome: async (force) => {
    if (homeController) {
      homeController.abort();
    }
    homeController = new AbortController();

    set({ isHomeLoading: true, error: null });

    const result = await runWithRetry(
      (attempt) =>
        withCache(
          CACHE_PREFIXES.HOME,
          () => source.getHomeData(),
          { ttl: CACHE_TTL.HOME, signal: homeController?.signal, force: attempt > 0 || force },
        ),
      'homeStore',
    );

    if (result.error) {
      set({ error: result.error, isHomeLoading: false, isRefreshing: false });
      return;
    }

    set({ homeData: result.data ?? { recent: [] }, isHomeLoading: false, isRefreshing: false });
  },

  prepareRefresh: () => {
    set({ isRefreshing: true, error: null });
  },

  reset: () => {
    if (homeController) {
      homeController.abort();
      homeController = null;
    }
    set({ homeData: { recent: [] }, isHomeLoading: false, isRefreshing: false, error: null });
  },
}));