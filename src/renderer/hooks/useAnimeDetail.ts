import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDetailsStore } from '../stores/detailsStore';
import { usePlayerStore } from '../stores/playerStore';
import { useSettingsStore } from '../stores/settingsStore';
import { storage } from '../utils/storage';
import { logger } from '../utils/logger';
import type { Episode, EpisodeRange } from '../../types';

const EPISODES_PER_PAGE = 50;

function buildRanges(episodes: Episode[]): EpisodeRange[] {
  if (episodes.length === 0) return [];
  const last = episodes[episodes.length - 1];
  if (episodes.length <= EPISODES_PER_PAGE) {
    return [{ label: `1-${last.number}`, start: 0, end: episodes.length }];
  }
  return Array.from({ length: Math.ceil(episodes.length / EPISODES_PER_PAGE) }, (_, i) => {
    const start = i * EPISODES_PER_PAGE;
    const end = Math.min(start + EPISODES_PER_PAGE, episodes.length);
    return { label: `${episodes[start].number}-${episodes[end - 1].number}`, start, end };
  });
}

export function useAnimeDetail(slug: string) {
  const { activeAnime, isDetailsLoading, error, fetchDetails } = useDetailsStore();
  const {
    servers,
    isLoading: serverLoading,
    fetchServers,
  } = usePlayerStore();
  const { episodeOrder, setEpisodeOrder } = useSettingsStore();

  const [ascending, setAscending] = useState(episodeOrder === 'asc');
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [activeRangeIdx, setActiveRangeIdxState] = useState(0);

  const setActiveRangeIdx = useCallback((idx: number) => {
    setActiveRangeIdxState(idx);
    storage.set(`range_${slug}`, idx).catch((err) => {
      logger.error('useAnimeDetail', 'Failed to persist range', err);
    });
  }, [slug]);

  useEffect(() => {
    setActiveRangeIdxState(0);
    useDetailsStore.getState().reset();
    storage.get<number>(`range_${slug}`).then((idx) => {
      if (idx != null) setActiveRangeIdxState(idx);
    });
  }, [slug]);

  const retry = useCallback(() => {
    fetchDetails(slug);
  }, [slug, fetchDetails]);

  useEffect(() => {
    fetchDetails(slug);
  }, [slug, fetchDetails]);

  const sortedEpisodes = useMemo(() => {
    const eps = activeAnime?.episodes ?? [];
    return [...eps].sort((a, b) => a.number - b.number);
  }, [activeAnime?.episodes]);

  const ranges = useMemo(() => buildRanges(sortedEpisodes), [sortedEpisodes]);

  const visibleEpisodes = useMemo(() => {
    const range = ranges[activeRangeIdx];
    if (!range) return ascending ? sortedEpisodes : [...sortedEpisodes].reverse();
    const slice = sortedEpisodes.slice(range.start, range.end);
    return ascending ? slice : [...slice].reverse();
  }, [sortedEpisodes, ranges, activeRangeIdx, ascending]);

  const handleEpisodePress = useCallback(
    (episode: Episode) => {
      setSelectedEpisode(episode);
      fetchServers(slug, episode.number);
    },
    [slug, fetchServers],
  );

  const closeModal = useCallback(() => {
    setSelectedEpisode(null);
  }, []);

  const handleToggleSort = useCallback(() => {
    setAscending((prev) => {
      const newVal = !prev;
      setEpisodeOrder(newVal ? 'asc' : 'desc');
      return newVal;
    });
  }, [setEpisodeOrder]);

  return {
    anime: activeAnime,
    isLoading: isDetailsLoading || (!activeAnime && !error),
    error,
    episodes: visibleEpisodes,
    ranges,
    activeRangeIdx,
    setActiveRangeIdx,
    ascending,
    selectedEpisode,
    servers,
    serverLoading,
    handleEpisodePress,
    closeModal,
    handleToggleSort,
    retry,
  };
}