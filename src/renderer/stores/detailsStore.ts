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
  fetchDetails: (slug: string) => Promise<void>;
  reset: () => void;
}

export const useDetailsStore = create<DetailsState>((set) => ({
  activeAnime: null,
  isDetailsLoading: false,
  error: null,

  fetchDetails: async (slug) => {
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
      if (result.error.type === 'AUTH_ERROR') {
        logger.info('detailsStore', 'Auth error, refreshing session');
        await sessionManager.refreshSession();
        const retry = await withCache(
          `${CACHE_PREFIXES.ANIME}_${slug}`,
          async () => source.getDetails(slug),
          { force: true },
        );
        if (retry.error) {
          set({ error: retry.error, isDetailsLoading: false });
          return;
        }
        set({ activeAnime: retry.data, isDetailsLoading: false });
        return;
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
