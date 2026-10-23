import ElectronStore from 'electron-store';
import { logger } from './logger';

const CACHE_MAX_ENTRIES = 500;
const RANGE_MAX_KEYS = 100;

// conf (the base class of electron-store) only ships its types via an
// "exports" map, which the node10 moduleResolution used here cannot follow;
// the base class therefore resolves to `any` and its members are missing from
// the inferred instance type. Declare the surface the app actually uses and
// bridge once at this boundary instead of casting per consumer.
interface StoreShape {
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
  delete: (key: string) => void;
  store: Record<string, unknown>;
}

export const store = new ElectronStore() as unknown as StoreShape;

interface StoredCacheEntry {
  payload: unknown;
  expiration: number;
}

function isCacheEntry(value: unknown): value is StoredCacheEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as { payload?: unknown; expiration?: unknown };
  return 'payload' in entry && typeof entry.expiration === 'number';
}

// Cache entries are only checked for expiry on read; without this the store
// keeps every detail/search key forever and rewrites the whole JSON on each
// set. Ranges have no timestamp, so they are capped instead. Everything is
// rebuilt in memory and written once instead of one write per deleted key.
export function pruneStoredData(): void {
  const now = Date.now();
  const before = Object.keys(store.store).length;
  const next: Record<string, unknown> = {};
  const liveCache: { key: string; value: unknown; expiration: number }[] = [];
  const rangeKeys: { key: string; value: unknown }[] = [];

  for (const [key, value] of Object.entries(store.store)) {
    if (isCacheEntry(value)) {
      if (value.expiration > now) {
        liveCache.push({ key, value, expiration: value.expiration });
      }
    } else if (key.startsWith('range_')) {
      rangeKeys.push({ key, value });
    } else {
      next[key] = value;
    }
  }

  const keepCache = liveCache
    .sort((a, b) => b.expiration - a.expiration)
    .slice(0, CACHE_MAX_ENTRIES);
  for (const { key, value } of keepCache) next[key] = value;

  const keepRanges = rangeKeys.slice(-RANGE_MAX_KEYS);
  for (const { key, value } of keepRanges) next[key] = value;

  const removed = before - Object.keys(next).length;
  if (removed > 0) {
    store.store = next;
    logger.info('Store', `Pruned ${removed} stale entries`);
  }
}
