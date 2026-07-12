import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDetailsStore } from '../stores/detailsStore';
import { usePlayerStore } from '../stores/playerStore';
import { useHistoryStore } from '../stores/historyStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { AnimeDetail, Episode, EpisodeRange, VideoServer } from '../../types';

const EPISODES_PER_PAGE = 50;

function computeEpisodePagination(
  episodes: Episode[],
  order: 'asc' | 'desc',
): { ranges: EpisodeRange[]; episodesInOrder: Episode[] } {
  const sorted = [...episodes].sort((a, b) =>
    order === 'asc' ? a.number - b.number : b.number - a.number,
  );
  const ranges: EpisodeRange[] = [];
  if (episodes.length === 0) return { ranges, episodesInOrder: sorted };

  const total = episodes.length;
  const numRanges = Math.ceil(total / EPISODES_PER_PAGE);
  for (let i = 0; i < numRanges; i++) {
    const start = i * EPISODES_PER_PAGE + 1;
    const end = Math.min((i + 1) * EPISODES_PER_PAGE, total);
    ranges.push({
      label: `${episodes[start - 1].number}-${episodes[end - 1].number}`,
      start: episodes[start - 1].number,
      end: episodes[end - 1].number,
    });
  }

  return { ranges, episodesInOrder: sorted };
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

  const { ranges, episodesInOrder } = useMemo(
    () => computeEpisodePagination(
      activeAnime?.episodes ?? [],
      ascending ? 'asc' : 'desc',
    ),
    [activeAnime?.episodes, ascending],
  );

  const visibleEpisodes = useMemo(() => {
    if (ranges.length === 0) return episodesInOrder;
    const range = ranges[activeRangeIdx];
    if (!range) return episodesInOrder;
    return episodesInOrder.filter(
      (ep) => ep.number >= range.start && ep.number <= range.end,
    );
  }, [episodesInOrder, ranges, activeRangeIdx]);

  const handleEpisodePress = useCallback(
    async (episode: Episode) => {
      setSelectedEpisode(episode);
      await addToHistory({
        title: activeAnime?.title ?? '',
        image: activeAnime?.image ?? '',
        url: `${slug}/${episode.number}`,
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
