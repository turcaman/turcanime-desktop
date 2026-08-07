import { create } from 'zustand';
import { source } from '../services/source';
import { withCache } from '../utils/cache';
import { runWithRetry } from '../utils/runWithRetry';
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

  fetchDetails: async (slug: string) => {
    if (detailsController) {
      detailsController.abort();
    }
    detailsController = new AbortController();

    set({ isDetailsLoading: true, error: null });

    const result = await runWithRetry(
      (attempt) =>
        withCache(
          `${CACHE_PREFIXES.ANIME}_${slug}`,
          (signal) => {
            const details = source.getDetails(slug, { signal });
            return details;
          },
          { ttl: CACHE_TTL.DETAILS, signal: detailsController?.signal, force: attempt > 0 },
        ),
      'detailsStore',
    );

    if (result.error) {
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