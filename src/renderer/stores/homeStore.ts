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
  fetchHome: (force?: boolean) => Promise<void>;
  prepareRefresh: () => void;
  reset: () => void;
}

export const useHomeStore = create<HomeState>((set, get) => ({
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

    const result = await withCache(
      CACHE_PREFIXES.HOME,
      async (signal) => {
        const data = await source.getHomeData();
        return data;
      },
      { ttl: CACHE_TTL.HOME, signal: homeController.signal, force },
    );

    if (result.error) {
      if (result.error.type === 'AUTH_ERROR') {
        logger.info('homeStore', 'Auth error, refreshing session...');
        const session = await sessionManager.refreshSession();
        // Only retry if we actually got cookies
        if (session.cookies.length > 0) {
          await new Promise((r) => setTimeout(r, 500));
          const retry = await withCache(
            CACHE_PREFIXES.HOME,
            async () => source.getHomeData(),
            { force: true },
          );
          if (retry.error) {
            set({ error: retry.error, isHomeLoading: false, isRefreshing: false });
            return;
          }
          set({ homeData: retry.data ?? { recent: [] }, isHomeLoading: false, isRefreshing: false });
          return;
        }
        logger.warn('homeStore', 'Session refresh returned no cookies, will wait');
        // If still no cookies, wait for cookies properly (blocks until available or timeout)
        const hasCookies = await sessionManager.waitForCookies();
        if (hasCookies) {
          const retry = await withCache(
            CACHE_PREFIXES.HOME,
            async () => source.getHomeData(),
            { force: true },
          );
          if (retry.error) {
            set({ error: retry.error, isHomeLoading: false, isRefreshing: false });
            return;
          }
          set({ homeData: retry.data ?? { recent: [] }, isHomeLoading: false, isRefreshing: false });
          return;
        }
        set({ error: { type: 'AUTH_ERROR', message: 'No se pudo obtener sesión después de esperar' }, isHomeLoading: false, isRefreshing: false });
        return;
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
