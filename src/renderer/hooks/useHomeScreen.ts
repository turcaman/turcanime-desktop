import { useEffect, useMemo } from 'react';
import { useHomeStore } from '../stores/homeStore';
import { useHistoryStore } from '../stores/historyStore';
import { useAppInitStore } from '../stores/appInitStore';
import type { Anime, HistoryItem } from '../../types';

type SectionItem =
  | { type: 'CONTINUE'; items: HistoryItem[] }
  | { type: 'SECTION'; title: string; items: Anime[] };

export function useHomeScreen() {
  const homeData = useHomeStore((s) => s.homeData);
  const homeLoading = useHomeStore((s) => s.isLoading);
  const isRefreshing = useHomeStore((s) => s.isRefreshing);
  const error = useHomeStore((s) => s.error);
  const fetchHome = useHomeStore((s) => s.fetchHome);
  const continueWatching = useHistoryStore((s) => s.continueWatching);
  const isInitialized = useAppInitStore((s) => s.isInitialized);

  useEffect(() => {
    fetchHome();
  }, [fetchHome]);

  const sections = useMemo(() => {
    const result: SectionItem[] = [];

    if (continueWatching.length > 0) {
      result.push({ type: 'CONTINUE', items: continueWatching });
    }

    if (homeData.recent.length > 0) {
      result.push({
        type: 'SECTION',
        title: 'Recién agregados',
        items: homeData.recent,
      });
    }

    return result;
  }, [continueWatching, homeData]);

  const isLoading = !isInitialized || homeLoading || isRefreshing;

  const hasContent = isInitialized && homeData.recent.length > 0;

  return {
    sections,
    isLoading,
    error,
    fetchHome,
    hasContent,
  };
}