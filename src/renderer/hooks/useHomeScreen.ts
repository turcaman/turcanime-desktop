import { useEffect, useMemo } from 'react';
import { useHomeStore } from '../stores/homeStore';
import { useHistoryStore } from '../stores/historyStore';
import { useUserInitializationStore } from '../stores/userIndex';
import type { Anime, HistoryItem } from '../../types';

type SectionItem =
  | { type: 'CONTINUE'; data: HistoryItem[] }
  | { type: 'SECTION'; title: string; data: Anime[] };

export function useHomeScreen() {
  const homeData = useHomeStore((s) => s.homeData);
  const isHomeLoading = useHomeStore((s) => s.isHomeLoading);
  const isRefreshing = useHomeStore((s) => s.isRefreshing);
  const error = useHomeStore((s) => s.error);
  const fetchHome = useHomeStore((s) => s.fetchHome);
  const continueWatching = useHistoryStore((s) => s.continueWatching);
  const isInitialized = useUserInitializationStore((s) => s.isInitialized);

  useEffect(() => {
    fetchHome();
  }, [fetchHome]);

  const sections = useMemo(() => {
    const result: SectionItem[] = [];

    if (continueWatching.length > 0) {
      result.push({ type: 'CONTINUE', data: continueWatching });
    }

    if (homeData.recent.length > 0) {
      result.push({
        type: 'SECTION',
        title: 'Recién agregados',
        data: homeData.recent,
      });
    }

    return result;
  }, [continueWatching, homeData]);

  const isLoading = !isInitialized || isHomeLoading || isRefreshing;

  const hasContent = isInitialized && homeData.recent.length > 0;

  return {
    sections,
    isLoading,
    error,
    fetchHome,
    hasContent,
  };
}