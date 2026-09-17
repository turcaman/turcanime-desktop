import { create } from 'zustand';
import { source, type RawSearchItem } from '../services/source';
import { cleanTitle } from '../services/parsers';
import { withCache } from '../utils/cache';
import { createCachedFetcher } from '../utils/cachedFetcher';
import { posterToUrl } from '../../config/source';
import { CACHE_PREFIXES, CACHE_TTL, TIMEOUTS } from '../../config/cache';
import type { Anime, AppError, AutocompleteAnime } from '../../types';

export type SearchStatus = 'idle' | 'typing' | 'searching' | 'searched';

let suggestionsController: AbortController | null = null;
let suggestionsRunId = 0;

// The underlying IPC request cannot be cancelled, so the controller only
// marks runs stale: a superseded response must not overwrite the suggestions
// of the query the user is currently typing.

// Results and suggestions share one cache entry per query (same raw endpoint);
// normalize the key so casing/whitespace variants hit the same entry.
function normalizeSearchKey(query: string): string {
  return query.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

function toAnime(item: RawSearchItem): Anime {
  return {
    title: cleanTitle(item.name ?? ''),
    image: posterToUrl(item.poster ?? ''),
    slug: item.slug ?? '',
    status: '',
  };
}

function toSuggestion(item: RawSearchItem): AutocompleteAnime {
  return {
    id: String(item.id ?? ''),
    name: item.name ?? '',
    poster: posterToUrl(item.poster ?? ''),
    slug: item.slug ?? '',
    type: item.type ?? 'anime',
  };
}

const searchFetcher = createCachedFetcher<[query: string, force?: boolean], RawSearchItem[]>({
  context: 'searchStore',
  cacheKey: (query) => `${CACHE_PREFIXES.SEARCH}_${normalizeSearchKey(query)}`,
  ttl: CACHE_TTL.SEARCH,
  fetch: (query) => source.searchRaw(query),
  forceArgIndex: 1,
});

interface SearchState {
  searchAnimes: Anime[];
  suggestions: AutocompleteAnime[];
  lastSearchTerm: string;
  status: SearchStatus;
  error: AppError | null;
  // Monotonic nonce bumped by Ctrl+K so the SearchBar can re-focus even when
  // the search screen is already mounted (autoFocus only fires on mount).
  searchFocusSignal: number;
  fetchSearch: (query: string, force?: boolean) => Promise<void>;
  fetchSuggestions: (query: string) => Promise<void>;
  cancelSearch: () => void;
  reset: () => void;
  setSearchTerm: (term: string) => void;
  setStatus: (status: SearchStatus) => void;
  requestSearchFocus: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  searchAnimes: [],
  suggestions: [],
  lastSearchTerm: '',
  status: 'idle',
  error: null,
  searchFocusSignal: 0,

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

    set({ searchAnimes: (result.data ?? []).map(toAnime), status: 'searched' });
  },

  fetchSuggestions: async (query) => {
    suggestionsController?.abort();
    suggestionsController = new AbortController();
    const runId = ++suggestionsRunId;

    const result = await withCache(
      `${CACHE_PREFIXES.SEARCH}_${normalizeSearchKey(query)}`,
      () => source.searchRaw(query),
      { ttl: CACHE_TTL.SEARCH, signal: suggestionsController.signal },
    );

    if (runId !== suggestionsRunId || suggestionsController.signal.aborted) return;
    if (result.error) return;

    set({ suggestions: (result.data ?? []).map(toSuggestion) });
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

  requestSearchFocus: () => {
    set((s) => ({ searchFocusSignal: s.searchFocusSignal + 1 }));
  },
}));
