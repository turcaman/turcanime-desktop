import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDetailsStore } from '../stores/detailsStore';
import { usePlayerStore } from '../stores/playerStore';
import { useSettingsStore } from '../stores/settingsStore';
import { usePersistedRange } from './usePersistedRange';
import { computeEpisodePagination } from './episodeHelpers';
import type { Episode } from '../../types';

export function useAnimeDetail(slug: string) {
  const activeAnime = useDetailsStore((s) => s.activeAnime);
  const isDetailsLoading = useDetailsStore((s) => s.isLoading);
  const error = useDetailsStore((s) => s.error);
  const fetchDetails = useDetailsStore((s) => s.fetchDetails);
  const servers = usePlayerStore((s) => s.servers);
  const serverLoading = usePlayerStore((s) => s.isLoading);
  const fetchServers = usePlayerStore((s) => s.fetchServers);
  const episodeOrder = useSettingsStore((s) => s.episodeOrder);
  const setEpisodeOrder = useSettingsStore((s) => s.setEpisodeOrder);
  const ascending = episodeOrder === 'asc';

  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const { activeRangeIdx, setActiveRangeIdx } = usePersistedRange(slug);

  useEffect(() => {
    useDetailsStore.getState().reset();
  }, [slug]);

  const retry = useCallback(() => {
    fetchDetails(slug);
  }, [slug, fetchDetails]);

  useEffect(() => {
    fetchDetails(slug);
  }, [slug, fetchDetails]);

  const episodes = activeAnime?.episodes ?? [];
  const { ranges, visibleEpisodes } = useMemo(
    () => computeEpisodePagination(episodes, episodeOrder, activeRangeIdx),
    [episodes, episodeOrder, activeRangeIdx],
  );

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
    setEpisodeOrder(ascending ? 'desc' : 'asc');
  }, [ascending, setEpisodeOrder]);

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
