import type { HistoryItem } from '../../types';

export function prependDedup<T>(
  list: T[],
  item: T,
  max: number,
  dedupKey?: keyof T,
): T[] {
  const filtered = dedupKey
    ? list.filter((existing) => existing[dedupKey] !== item[dedupKey])
    : list.filter((existing) => existing !== item);
  return [item, ...filtered].slice(0, max);
}

export function removeBy<T>(
  list: T[],
  predicate: (item: T) => boolean,
): T[] {
  return list.filter((item) => !predicate(item));
}

export function computeContinueWatching(
  lastViewed: HistoryItem[],
): HistoryItem[] {
  // lastViewed is newest-first; keep the first (newest) episode per URL and
  // preserve that newest-first order so re-watching moves an item to the front.
  const unique = new Map<string, HistoryItem>();
  for (const item of lastViewed) {
    if (!unique.has(item.url)) unique.set(item.url, item);
  }
  return Array.from(unique.values()).slice(0, 8);
}
