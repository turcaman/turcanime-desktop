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
    // Serve the previous (possibly expired) cache entry on transient failures
    // so the UI keeps content; auth errors are surfaced instead.
    if (appError.type !== 'AUTH_ERROR') {
      const cached = await storage.get<CacheEntry<T>>(cacheKey);
      if (cached && cached.payload != null) {
        logger.warn('Cache', `Serving stale cache for ${cacheKey} after ${appError.type}`);
        return { data: cached.payload, error: null, fromCache: true };
      }
    }
    return { data: null, error: appError, fromCache: false };
  }
}

