import { create } from 'zustand';
import { source } from '../services/source';
import { createCachedFetcher } from '../utils/cachedFetcher';
import { CACHE_PREFIXES, CACHE_TTL } from '../../config/cache';
import type { AnimeDetail, AppError } from '../../types';

const detailsFetcher = createCachedFetcher<[slug: string], AnimeDetail | null>({
  context: 'detailsStore',
  cacheKey: (slug) => `${CACHE_PREFIXES.ANIME}_${slug}`,
  ttl: CACHE_TTL.DETAILS,
  fetch: (slug) => source.getDetails(slug),
});

interface DetailsState {
  activeAnime: AnimeDetail | null;
  isLoading: boolean;
  error: AppError | null;
  fetchDetails: (slug: string) => Promise<void>;
  reset: () => void;
}

export const useDetailsStore = create<DetailsState>((set) => ({
  activeAnime: null,
  isLoading: false,
  error: null,

  fetchDetails: async (slug) => {
    set({ isLoading: true, error: null });
    const { result, isCurrent } = await detailsFetcher.run(slug);
    // A newer fetchDetails/reset superseded this one; skip stale writes.
    if (!isCurrent()) return;

    if (result.error) {
      set({ error: result.error, isLoading: false });
      return;
    }

    set({ activeAnime: result.data, isLoading: false });
  },

  reset: () => {
    detailsFetcher.abort();
    set({ activeAnime: null, isLoading: false, error: null });
  },
}));
