import { create } from 'zustand';
import { source } from '../services/source';
import { withCache } from '../utils/cache';
import { runWithRetry } from '../utils/runWithRetry';
import { CACHE_PREFIXES, CACHE_TTL, TIMEOUTS } from '../../config/cache';
import type { Anime, AppError, AutocompleteAnime } from '../../types';

let searchController: AbortController | null = null;
let suggestionsController: AbortController | null = null;

interface SearchState {
  searchAnimes: Anime[];
  suggestions: AutocompleteAnime[];
  lastSearchTerm: string;
  isLoading: boolean;
  error: AppError | null;
  fetchSearch: (query: string, force?: boolean) => Promise<void>;
  fetchSuggestions: (query: string) => Promise<void>;
  cancelSearch: () => void;
  reset: () => void;
  setSearchTerm: (term: string) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  searchAnimes: [],
  suggestions: [],
  lastSearchTerm: '',
  isLoading: false,
  error: null,

  fetchSearch: async (query, force) => {
    if (searchController) {
      searchController.abort();
    }
    searchController = new AbortController();

    set({ isLoading: true, error: null, lastSearchTerm: query });

    const timeout = setTimeout(() => searchController?.abort(), TIMEOUTS.SEARCH);

    const result = await runWithRetry(
      (attempt) =>
        withCache(
          `${CACHE_PREFIXES.SEARCH}_${query}`,
          () => source.search(query),
          { ttl: CACHE_TTL.SEARCH, signal: searchController?.signal, force: attempt > 0 || force },
        ),
      'searchStore',
    );

    clearTimeout(timeout);

    if (result.error) {
      set({ error: result.error, isLoading: false });
      return;
    }

    set({ searchAnimes: result.data ?? [], isLoading: false });
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
    searchController?.abort();
    set({ isLoading: false });
  },

  reset: () => {
    searchController?.abort();
    suggestionsController?.abort();
    set({
      searchAnimes: [],
      suggestions: [],
      lastSearchTerm: '',
      isLoading: false,
      error: null,
    });
  },

  setSearchTerm: (term) => {
    set({ lastSearchTerm: term });
  },
}));