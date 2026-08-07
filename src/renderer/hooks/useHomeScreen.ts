import { useEffect, useMemo, useState } from 'react';
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

  // The first render happens before the mount effect fires fetchHome, so the
  // store still reports isLoading:false with empty homeData; this flag keeps
  // that frame on the skeleton. A past refactor removed it as 'dead code' and
  // regressed the flash.
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    setHasStarted(true);
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

  const isLoading = !isInitialized || !hasStarted || homeLoading || isRefreshing;

  const hasContent = isInitialized && homeData.recent.length > 0;

  // True only after a fetch completed successfully with zero results, so the
  // 'Sin datos' message never shows for the pre-fetch/in-flight states above.
  const isEmpty = hasStarted && !homeLoading && !isRefreshing && !error && !hasContent;

  return {
    sections,
    isLoading,
    error,
    fetchHome,
    hasContent,
    isEmpty,
  };
}