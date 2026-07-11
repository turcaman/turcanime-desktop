import { create } from 'zustand';
import { source } from '../services/source';
import { sessionManager } from '../services/session';
import { withCache } from '../utils/cache';
import { CACHE_PREFIXES, CACHE_TTL, TIMEOUTS } from '../../config/cache';
import type { Anime, AppError, AutocompleteAnime } from '../../types';

let searchController: AbortController | null = null;
let suggestionsController: AbortController | null = null;

interface SearchState {
  searchAnimes: Anime[];
  suggestions: AutocompleteAnime[];
  lastSearchTerm: string;
  isSearchLoading: boolean;
  isSuggestionsLoading: boolean;
  error: AppError | null;
  fetchSearch: (query: string, force?: boolean) => Promise<void>;
  fetchSuggestions: (query: string) => Promise<void>;
  cancelSearch: () => void;
  resetSearch: () => void;
  setSearchTerm: (term: string) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  searchAnimes: [],
  suggestions: [],
  lastSearchTerm: '',
  isSearchLoading: false,
  isSuggestionsLoading: false,
  error: null,

  fetchSearch: async (query, force) => {
    if (searchController) {
      searchController.abort();
    }
    searchController = new AbortController();

    set({ isSearchLoading: true, error: null, lastSearchTerm: query });

    const timeout = setTimeout(() => searchController?.abort(), TIMEOUTS.SEARCH);

    const result = await withCache(
      `${CACHE_PREFIXES.SEARCH}_${query}`,
      async () => source.search(query),
      { ttl: CACHE_TTL.SEARCH, signal: searchController.signal, force },
    );

    clearTimeout(timeout);

    if (result.error) {
      if (result.error.type === 'AUTH_ERROR') {
        await sessionManager.refreshSession();
        const retry = await withCache(
          `${CACHE_PREFIXES.SEARCH}_${query}`,
          async () => source.search(query),
          { force: true },
        );
        if (retry.error) {
          set({ error: retry.error, isSearchLoading: false });
          return;
        }
        set({ searchAnimes: retry.data ?? [], isSearchLoading: false });
        return;
      }
      set({ error: result.error, isSearchLoading: false });
      return;
    }

    set({ searchAnimes: result.data ?? [], isSearchLoading: false });
  },

  fetchSuggestions: async (query) => {
    if (suggestionsController) {
      suggestionsController.abort();
    }
    suggestionsController = new AbortController();

    set({ isSuggestionsLoading: true });

    const result = await withCache(
      `${CACHE_PREFIXES.SUGGESTIONS}_${query}`,
      async () => source.getSuggestions(query),
      { ttl: CACHE_TTL.SUGGESTIONS, signal: suggestionsController.signal },
    );

    if (result.error) {
      set({ isSuggestionsLoading: false });
      return;
    }

    set({ suggestions: result.data ?? [], isSuggestionsLoading: false });
  },

  cancelSearch: () => {
    searchController?.abort();
    set({ isSearchLoading: false });
  },

  resetSearch: () => {
    searchController?.abort();
    suggestionsController?.abort();
    set({
      searchAnimes: [],
      suggestions: [],
      lastSearchTerm: '',
      isSearchLoading: false,
      isSuggestionsLoading: false,
      error: null,
    });
  },

  setSearchTerm: (term) => {
    set({ lastSearchTerm: term });
  },
}));
