import { storage } from './storage';
import { logger } from './logger';
import { LIMITS } from '../../config/cache';
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
    const appError: AppError = {
      type: (err as { type?: AppErrorType })?.type ?? 'UNKNOWN',
      message: err instanceof Error ? err.message : String(err),
    };
    return { data: null, error: appError, fromCache: false };
  }
}
