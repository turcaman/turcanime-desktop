import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDetailsStore } from '../stores/detailsStore';
import { usePlayerStore } from '../stores/playerStore';
import { useHistoryStore } from '../stores/historyStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { AnimeDetail, Episode, EpisodeRange, VideoServer } from '../../types';

const EPISODES_PER_PAGE = 50;

function buildRanges(episodes: Episode[]): EpisodeRange[] {
  if (episodes.length === 0) return [];
  const last = episodes[episodes.length - 1];
  if (episodes.length <= EPISODES_PER_PAGE) {
    return [{ label: `1-${last!.number}`, start: 0, end: episodes.length }];
  }
  return Array.from({ length: Math.ceil(episodes.length / EPISODES_PER_PAGE) }, (_, i) => {
    const start = i * EPISODES_PER_PAGE;
    const end = Math.min(start + EPISODES_PER_PAGE, episodes.length);
    return { label: `${episodes[start]!.number}-${episodes[end - 1]!.number}`, start, end };
  });
}

export function useAnimeDetail(slug: string) {
  const { activeAnime, isDetailsLoading, error, fetchDetails } = useDetailsStore();
  const {
    servers,
    isLoading: serverLoading,
    fetchServers,
    resolveStream,
  } = usePlayerStore();
  const { addToHistory } = useHistoryStore();
  const { episodeOrder } = useSettingsStore();

  const [expanded, setExpanded] = useState(false);
  const [ascending, setAscending] = useState(episodeOrder === 'asc');
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [activeRangeIdx, setActiveRangeIdx] = useState(0);

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
    async (episode: Episode) => {
      setSelectedEpisode(episode);
      await addToHistory({
        title: activeAnime?.title ?? '',
        image: activeAnime?.image ?? '',
        url: slug,
        number: episode.number,
        progress: 0,
        duration: 0,
        timestamp: Date.now(),
      });
      fetchServers(slug, episode.number);
    },
    [slug, activeAnime, addToHistory, fetchServers],
  );

  const handleServerSelect = useCallback(
    async (server: VideoServer) => {
      await resolveStream(server);
    },
    [resolveStream],
  );

  const closeModal = useCallback(() => {
    setSelectedEpisode(null);
  }, []);

  const handleToggleSort = useCallback(() => {
    setAscending((prev) => !prev);
    setActiveRangeIdx(0);
  }, []);

  return {
    anime: activeAnime,
    isLoading: isDetailsLoading || (!activeAnime && !error),
    error,
    episodes: visibleEpisodes,
    ranges,
    activeRangeIdx,
    setActiveRangeIdx,
    ascending,
    expanded,
    setExpanded,
    selectedEpisode,
    servers,
    serverLoading,
    handleEpisodePress,
    handleServerSelect,
    closeModal,
    handleToggleSort,
    retry,
  };
}
