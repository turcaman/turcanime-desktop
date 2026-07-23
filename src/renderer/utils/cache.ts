import { storage } from './storage';
import { logger } from './logger';
import { CACHE_PREFIXES, LIMITS } from '../../config/cache';
import type { CacheEntry, AppError, AppErrorType } from '../../types';

const DEFAULT_TTL = 6 * 60 * 60 * 1000;
const STALE_THRESHOLD = 0.3;

interface WithCacheOptions {
  ttl?: number;
  signal?: AbortSignal;
  force?: boolean;
}

interface WithCacheResult<T> {
  data: T | null;
  error: AppError | null;
  fromCache: boolean;
}

export async function withCache<T>(
  cacheKey: string,
  fetchFn: (signal?: AbortSignal) => Promise<T>,
  options?: WithCacheOptions,
): Promise<WithCacheResult<T>> {
  const { ttl = DEFAULT_TTL, signal, force } = options ?? {};

  if (!force) {
    const cached = await storage.get<CacheEntry<T>>(cacheKey);
    if (cached) {
      const elapsed = Date.now() - cached.expiration + ttl;
      if (elapsed < ttl * (1 - STALE_THRESHOLD)) {
        return { data: cached.payload, error: null, fromCache: true };
      }
    }
  }

  try {
    const data = await fetchFn(signal);
    const serialized = JSON.stringify(data);
    if (serialized.length <= LIMITS.CACHE_MAX_ENTRY_SIZE) {
      const entry: CacheEntry<T> = { payload: data, expiration: Date.now() + ttl };
      await storage.set(cacheKey, entry);
    } else {
      logger.warn('Cache', `Entry ${cacheKey} exceeds size limit, skipping cache`);
    }
    return { data, error: null, fromCache: false };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { data: null, error: null, fromCache: false };
    }
    const thrown = err as { type?: AppErrorType; message?: unknown };
    const rawMessage = thrown?.message;
    const message = typeof rawMessage === 'string'
      ? rawMessage
      : err instanceof Error
        ? err.message
        : String(err);
    const appError: AppError = {
      type: thrown?.type ?? 'UNKNOWN',
      message,
    };
    return { data: null, error: appError, fromCache: false };
  }
}

const CACHE_PREFIX_VALUES = Object.values(CACHE_PREFIXES);

export async function clearAllCache(): Promise<void> {
  try {
    const allKeys = Object.keys(await window.electronAPI.store.get('__all_keys__') ?? {});
    for (const key of allKeys) {
      if (CACHE_PREFIX_VALUES.some((prefix) => key.startsWith(prefix))) {
        await storage.remove(key);
      }
    }
  } catch (err) {
    logger.warn('Cache', 'Failed to clear all cache entries', err);
  }
}
