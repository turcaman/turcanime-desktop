import type { Episode, EpisodeRange } from '../../types';

const EPISODES_PER_PAGE = 50;

export function orderEpisodes(episodes: Episode[]): Episode[] {
  return [...episodes].sort((a, b) => a.number - b.number);
}

function buildRanges(episodes: Episode[]): EpisodeRange[] {
  if (episodes.length === 0) return [];
  if (episodes.length <= EPISODES_PER_PAGE) {
    return [{ label: `1-${episodes[episodes.length - 1].number}`, start: 0, end: episodes.length }];
  }
  return Array.from({ length: Math.ceil(episodes.length / EPISODES_PER_PAGE) }, (_, i) => {
    const start = i * EPISODES_PER_PAGE;
    const end = Math.min(start + EPISODES_PER_PAGE, episodes.length);
    return { label: `${episodes[start].number}-${episodes[end - 1].number}`, start, end };
  });
}

function getVisibleEpisodes(
  episodes: Episode[],
  ranges: EpisodeRange[],
  activeRangeIdx: number,
  ascending: boolean,
): Episode[] {
  const range = ranges[activeRangeIdx];
  if (range == null) return [];
  const slice = episodes.slice(range.start, range.end);
  return ascending ? slice : [...slice].reverse();
}

export function computeEpisodePagination(
  episodes: Episode[],
  order: 'asc' | 'desc',
  activeRangeIdx: number,
): { ranges: EpisodeRange[]; visibleEpisodes: Episode[] } {
  const ordered = episodes.length > 0 ? orderEpisodes(episodes) : [];
  const ranges = buildRanges(ordered);
  const visibleEpisodes = getVisibleEpisodes(ordered, ranges, activeRangeIdx, order === 'asc');
  return { ranges, visibleEpisodes };
}
