import { create } from 'zustand';
import { source } from '../services/source';
import { sessionManager } from '../services/session';
import { withCache } from '../utils/cache';
import { logger } from '../utils/logger';
import { CACHE_PREFIXES, CACHE_TTL } from '../../config/cache';
import type { AnimeDetail, AppError } from '../../types';

let detailsController: AbortController | null = null;

interface DetailsState {
  activeAnime: AnimeDetail | null;
  isDetailsLoading: boolean;
  error: AppError | null;
  fetchDetails: (slug: string, retryCount?: number) => Promise<void>;
  reset: () => void;
}

export const useDetailsStore = create<DetailsState>((set, get) => ({
  activeAnime: null,
  isDetailsLoading: false,
  error: null,

  fetchDetails: async (slug, retryCount = 0) => {
    if (detailsController) {
      detailsController.abort();
    }
    detailsController = new AbortController();

    set({ isDetailsLoading: true, error: null });

    const result = await withCache(
      `${CACHE_PREFIXES.ANIME}_${slug}`,
      async (signal) => {
        const details = await source.getDetails(slug, { signal });
        return details;
      },
      { ttl: CACHE_TTL.DETAILS, signal: detailsController.signal },
    );

    if (result.error) {
      const isAuth = result.error.type === 'AUTH_ERROR';
      if (isAuth && retryCount < 3) {
        const backoff = Math.min(1000 * Math.pow(2, retryCount), 8000);
        logger.info('detailsStore', `Auth error (attempt ${retryCount + 1}/3), refreshing session`);
        await sessionManager.refreshSession();
        await new Promise((r) => setTimeout(r, backoff));
        return get().fetchDetails(slug, retryCount + 1);
      }
      if (retryCount < 2 && !isAuth) {
        const backoff = Math.min(1000 * Math.pow(2, retryCount), 4000);
        logger.info('detailsStore', `Retry ${retryCount + 1}/3 after ${backoff}ms`);
        await new Promise((r) => setTimeout(r, backoff));
        return get().fetchDetails(slug, retryCount + 1);
      }
      set({ error: result.error, isDetailsLoading: false });
      return;
    }

    set({ activeAnime: result.data, isDetailsLoading: false });
  },

  reset: () => {
    if (detailsController) {
      detailsController.abort();
      detailsController = null;
    }
    set({ activeAnime: null, isDetailsLoading: false, error: null });
  },
}));
