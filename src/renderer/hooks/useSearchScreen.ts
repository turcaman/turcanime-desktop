import { useEffect, useCallback, useRef } from 'react';
import { useSearchStore } from '../stores/searchStore';
import { useSearchHistoryStore } from '../stores/searchHistoryStore';

const DEBOUNCE_MS = 300;

export function useSearchScreen() {
  const term = useSearchStore((s) => s.lastSearchTerm);
  const searchAnimes = useSearchStore((s) => s.searchAnimes);
  const suggestions = useSearchStore((s) => s.suggestions);
  const error = useSearchStore((s) => s.error);
  const status = useSearchStore((s) => s.status);
  const fetchSearch = useSearchStore((s) => s.fetchSearch);
  const fetchSuggestions = useSearchStore((s) => s.fetchSuggestions);
  const cancelSearch = useSearchStore((s) => s.cancelSearch);
  const resetSearch = useSearchStore((s) => s.reset);
  const setSearchTerm = useSearchStore((s) => s.setSearchTerm);
  const setStatus = useSearchStore((s) => s.setStatus);
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
    setSearchTerm(text);
    if (text.length > 0) {
      setStatus('typing');
    } else {
      setStatus('idle');
      resetSearch();
    }
  }, [setSearchTerm, resetSearch, setStatus]);

  const executeSearch = useCallback(async (searchTerm?: string) => {
    const query = (searchTerm ?? term).trim();
    if (!query) return;

    // fetchSearch owns the searching -> searched transition in the store.
    await fetchSearch(query);
    await saveRecentSearch(query);
  }, [term, fetchSearch, saveRecentSearch]);

  const handleSearch = useCallback(() => {
    executeSearch();
  }, [executeSearch]);

  const retrySearch = useCallback(() => {
    if (term.trim()) {
      fetchSearch(term, true);
    }
  }, [term, fetchSearch]);

  const handleSelectSuggestion = useCallback(() => {
    const inputText = term.trim();
    if (inputText) {
      saveRecentSearch(inputText);
    }
  }, [term, saveRecentSearch]);

  const handleSelectRecent = useCallback((recentTerm: string) => {
    setSearchTerm(recentTerm);
    executeSearch(recentTerm);
  }, [setSearchTerm, executeSearch]);

  const handleClear = useCallback(() => {
    setSearchTerm('');
    setStatus('idle');
    cancelSearch();
    resetSearch();
  }, [setSearchTerm, cancelSearch, resetSearch]);

  useEffect(() => {
    return () => {
      cancelSearch();
    };
  }, [cancelSearch]);

  // Loading is derived from the searching status: the store no longer keeps a
  // parallel isLoading flag.
  const isLoading = status === 'searching';

  return {
    term,
    status,
    searchAnimes,
    suggestions,
    recentSearches,
    isLoading,
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