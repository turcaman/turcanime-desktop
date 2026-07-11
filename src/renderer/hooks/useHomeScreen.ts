import { useEffect, useMemo } from 'react';
import { useHomeStore } from '../stores/homeStore';
import { useHistoryStore } from '../stores/historyStore';
import { useUserInitializationStore } from '../stores/userIndex';
import type { Anime, HistoryItem } from '../../types';

type SectionItem =
  | { type: 'CONTINUE'; data: HistoryItem[] }
  | { type: 'SECTION'; title: string; data: Anime[] };

export function useHomeScreen() {
  const { homeData, isHomeLoading, isRefreshing, error, fetchHome } =
    useHomeStore();
  const { continueWatching } = useHistoryStore();
  const { isInitialized } = useUserInitializationStore();

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

    if (homeData.sections) {
      for (const section of homeData.sections) {
        if (section.animes.length > 0) {
          result.push({ type: 'SECTION', title: section.title, data: section.animes });
        }
      }
    }

    return result;
  }, [continueWatching, homeData]);

  const isLoading =
    isHomeLoading || isRefreshing || (homeData.recent.length === 0 && !isInitialized);

  const hasContent =
    isInitialized && (homeData.recent.length > 0 || continueWatching.length > 0);

  return {
    sections,
    isLoading,
    error,
    fetchHome,
    hasContent,
  };
}
