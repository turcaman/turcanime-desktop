import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchStore } from '../stores/searchStore';
import { useSearchHistoryStore } from '../stores/searchHistoryStore';
import type { AutocompleteAnime } from '../../types';

type SearchStatus = 'idle' | 'typing' | 'searching' | 'searched';

const DEBOUNCE_MS = 300;

export function useSearchScreen() {
  const lastSearchTerm = useSearchStore((s) => s.lastSearchTerm);
  const searchAnimes = useSearchStore((s) => s.searchAnimes);
  const suggestions = useSearchStore((s) => s.suggestions);
  const isSearchLoading = useSearchStore((s) => s.isSearchLoading);
  const error = useSearchStore((s) => s.error);
  const fetchSearch = useSearchStore((s) => s.fetchSearch);
  const fetchSuggestions = useSearchStore((s) => s.fetchSuggestions);
  const cancelSearch = useSearchStore((s) => s.cancelSearch);
  const resetSearch = useSearchStore((s) => s.resetSearch);
  const setSearchTerm = useSearchStore((s) => s.setSearchTerm);
  const [term, setTerm] = useState(lastSearchTerm);
  const [status, setStatus] = useState<SearchStatus>(lastSearchTerm ? 'searched' : 'idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const recentSearches = useSearchHistoryStore((s) => s.recentSearches);
  const saveRecentSearch = useSearchHistoryStore((s) => s.saveRecentSearch);
  const removeRecentSearch = useSearchHistoryStore((s) => s.removeRecentSearch);
  const clearRecentSearches = useSearchHistoryStore((s) => s.clearRecentSearches);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (status === 'typing' && term.length > 0) {
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(term);
      }, DEBOUNCE_MS);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [term, status, fetchSuggestions]);

  const handleTextChange = useCallback((text: string) => {
    setTerm(text);
    if (text.length > 0) {
      setStatus('typing');
    } else {
      setStatus('idle');
      resetSearch();
    }
  }, [resetSearch]);

  const executeSearch = useCallback(async (searchTerm?: string) => {
    const query = (searchTerm ?? term).trim();
    if (!query) return;

    setStatus('searching');
    await fetchSearch(query);
    await saveRecentSearch(query);
    setStatus('searched');
  }, [term, fetchSearch, saveRecentSearch]);

  const handleSearch = useCallback(() => {
    executeSearch();
  }, [executeSearch]);

  const retrySearch = useCallback(() => {
    if (term.trim()) {
      fetchSearch(term, true);
    }
  }, [term, fetchSearch]);

  const handleSelectSuggestion = useCallback((anime: AutocompleteAnime) => {
    setTerm(anime.name);
    setSearchTerm(anime.name);
    executeSearch(anime.name);
  }, [setSearchTerm, executeSearch]);

  const handleSelectRecent = useCallback((recentTerm: string) => {
    setTerm(recentTerm);
    setSearchTerm(recentTerm);
    executeSearch(recentTerm);
  }, [setSearchTerm, executeSearch]);

  const handleClear = useCallback(() => {
    setTerm('');
    setStatus('idle');
    cancelSearch();
    resetSearch();
  }, [cancelSearch, resetSearch]);

  useEffect(() => {
    return () => {
      cancelSearch();
    };
  }, [cancelSearch]);

  return {
    term,
    status,
    searchAnimes,
    suggestions,
    recentSearches,
    isSearchLoading,
    error,
    handleTextChange,
    handleSearch,
    retrySearch,
    handleSelectSuggestion,
    handleSelectRecent,
    handleClear,
    removeRecentSearch,
    clearRecentSearches,
  };
}
