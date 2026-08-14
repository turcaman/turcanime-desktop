import { runWithRetry } from './runWithRetry';
import { withCache } from './cache';
import type { AppError } from '../../types';

// Same envelope as runWithRetry (withCache also reports fromCache at runtime,
// but no consumer reads it, so it is not part of the public type).
export interface CachedFetchResult<T> {
  data: T | null;
  error: AppError | null;
}

export interface CachedFetcher<TArgs extends unknown[], TData> {
  /** Runs the cached+retried fetch; rejects stale runs via isCurrent(). */
  run: (...args: TArgs) => Promise<{
    result: CachedFetchResult<TData>;
    isCurrent: () => boolean;
  }>;
  /** Marks the in-flight run stale and releases the controller. */
  abort: () => void;
}

interface CachedFetcherConfig<TArgs extends unknown[], TData> {
  /** Logging/retry context, e.g. 'homeStore'. */
  context: string;
  cacheKey: (...args: TArgs) => string;
  ttl: number;
  fetch: (...args: TArgs) => Promise<TData>;
  /**
   * Index of the boolean "force" flag within TArgs (when the store's load
   * action exposes one, e.g. for user-triggered refreshes). Bypasses the
   * cache. Defaults to none (retries already force).
   */
  forceArgIndex?: number;
}

// One abort/retry/cache pipeline shared by every HTTP-backed store. The
// underlying IPC request cannot be cancelled, so abort only marks the run
// stale; isCurrent() lets the store skip writing stale results instead of
// duplicating the AbortController bookkeeping per store.
export function createCachedFetcher<TArgs extends unknown[], TData>(
  config: CachedFetcherConfig<TArgs, TData>,
): CachedFetcher<TArgs, TData> {
  let controller: AbortController | null = null;

  return {
    async run(...args) {
      controller?.abort();
      const current = new AbortController();
      controller = current;

      const force =
        config.forceArgIndex != null && args[config.forceArgIndex] === true;

      const result = await runWithRetry(
        (attempt) =>
          withCache(config.cacheKey(...args), () => config.fetch(...args), {
            ttl: config.ttl,
            signal: current.signal,
            force: attempt > 0 || force,
          }),
        config.context,
      );

      return { result, isCurrent: () => !current.signal.aborted && controller === current };
    },

    abort() {
      controller?.abort();
      controller = null;
    },
  };
}
