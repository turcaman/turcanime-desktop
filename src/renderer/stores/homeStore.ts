import { create } from 'zustand';
import { source } from '../services/source';
import { sessionManager } from '../services/session';
import { withCache } from '../utils/cache';
import { logger } from '../utils/logger';
import { CACHE_PREFIXES, CACHE_TTL } from '../../config/cache';
import type { AppError, HomeData } from '../../types';

let homeController: AbortController | null = null;

interface HomeState {
  homeData: HomeData;
  isHomeLoading: boolean;
  isRefreshing: boolean;
  error: AppError | null;
  fetchHome: (force?: boolean, retryCount?: number) => Promise<void>;
  prepareRefresh: () => void;
  reset: () => void;
}

export const useHomeStore = create<HomeState>((set, get) => ({
  homeData: { recent: [] },
  isHomeLoading: false,
  isRefreshing: false,
  error: null,

  fetchHome: async (force, retryCount = 0) => {
    if (homeController) {
      homeController.abort();
    }
    homeController = new AbortController();

    set({ isHomeLoading: true, error: null });

    const result = await withCache(
      CACHE_PREFIXES.HOME,
      async () => {
        const data = await source.getHomeData();
        return data;
      },
      { ttl: CACHE_TTL.HOME, signal: homeController.signal, force },
    );

    if (result.error) {
      const isAuth = result.error.type === 'AUTH_ERROR';
      if (isAuth && retryCount < 3) {
        const backoff = Math.min(1000 * Math.pow(2, retryCount), 8000);
        logger.info('homeStore', `Auth error (attempt ${retryCount + 1}/3), refreshing session...`);
        await sessionManager.refreshSession();
        await new Promise((r) => setTimeout(r, backoff));
        return get().fetchHome(true, retryCount + 1);
      }
      if (retryCount < 2 && !isAuth) {
        const backoff = Math.min(1000 * Math.pow(2, retryCount), 4000);
        logger.info('homeStore', `Retry ${retryCount + 1}/3 after ${backoff}ms`);
        await new Promise((r) => setTimeout(r, backoff));
        return get().fetchHome(true, retryCount + 1);
      }
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
