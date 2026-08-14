import { create } from 'zustand';
import { source } from '../services/source';
import { withCache } from '../utils/cache';
import { createCachedFetcher } from '../utils/cachedFetcher';
import { CACHE_PREFIXES, CACHE_TTL, TIMEOUTS } from '../../config/cache';
import type { Anime, AppError, AutocompleteAnime } from '../../types';

export type SearchStatus = 'idle' | 'typing' | 'searching' | 'searched';

let suggestionsController: AbortController | null = null;

const searchFetcher = createCachedFetcher<[query: string, force?: boolean], Anime[]>({
  context: 'searchStore',
  cacheKey: (query) => `${CACHE_PREFIXES.SEARCH}_${query}`,
  ttl: CACHE_TTL.SEARCH,
  fetch: (query) => source.search(query),
  forceArgIndex: 1,
});

interface SearchState {
  searchAnimes: Anime[];
  suggestions: AutocompleteAnime[];
  lastSearchTerm: string;
  status: SearchStatus;
  error: AppError | null;
  fetchSearch: (query: string, force?: boolean) => Promise<void>;
  fetchSuggestions: (query: string) => Promise<void>;
  cancelSearch: () => void;
  reset: () => void;
  setSearchTerm: (term: string) => void;
  setStatus: (status: SearchStatus) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  searchAnimes: [],
  suggestions: [],
  lastSearchTerm: '',
  status: 'idle',
  error: null,

  fetchSearch: async (query, force) => {
    set({ error: null, lastSearchTerm: query, status: 'searching' });

    const timeout = setTimeout(() => searchFetcher.abort(), TIMEOUTS.SEARCH);
    const { result, isCurrent } = await searchFetcher.run(query, force);
    clearTimeout(timeout);

    // A newer search/reset superseded this one (or the timeout fired); the
    // request itself cannot be cancelled, so skip stale writes.
    if (!isCurrent()) return;

    if (result.error) {
      set({ error: result.error, status: 'searched' });
      return;
    }

    set({ searchAnimes: result.data ?? [], status: 'searched' });
  },

  fetchSuggestions: async (query) => {
    if (suggestionsController) {
      suggestionsController.abort();
    }
    suggestionsController = new AbortController();

    const result = await withCache(
      `${CACHE_PREFIXES.SUGGESTIONS}_${query}`,
      async () => source.getSuggestions(query),
      { ttl: CACHE_TTL.SUGGESTIONS, signal: suggestionsController.signal },
    );

    if (result.error) return;

    set({ suggestions: result.data ?? [] });
  },

  cancelSearch: () => {
    searchFetcher.abort();
  },

  reset: () => {
    searchFetcher.abort();
    suggestionsController?.abort();
    set({
      searchAnimes: [],
      suggestions: [],
      lastSearchTerm: '',
      status: 'idle',
      error: null,
    });
  },

  setSearchTerm: (term) => {
    set({ lastSearchTerm: term });
  },

  setStatus: (status) => {
    set({ status });
  },
}));
