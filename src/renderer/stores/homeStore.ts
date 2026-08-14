import { create } from 'zustand';
import { source } from '../services/source';
import { createCachedFetcher } from '../utils/cachedFetcher';
import { renewSessionAndInvalidateCache } from '../utils/sessionRecovery';
import { CACHE_PREFIXES, CACHE_TTL } from '../../config/cache';
import type { AppError, HomeData } from '../../types';

// After a cold start without cookies (e.g. clearing the cache) every fetch
// dies with AUTH_ERROR until the session wash succeeds. Retry with increasing
// spacing so the app heals itself once the wash is allowed to run again.
const RECOVERY_BACKOFFS_MS = [15000, 45000, 120000];
const RECOVERY_MAX_ATTEMPTS = RECOVERY_BACKOFFS_MS.length;
let recoveryTimer: ReturnType<typeof setTimeout> | null = null;
let recoveryAttempts = 0;

function clearRecovery(): void {
  if (recoveryTimer) {
    clearTimeout(recoveryTimer);
    recoveryTimer = null;
  }
  recoveryAttempts = 0;
}

function scheduleRecovery(): void {
  if (recoveryTimer || recoveryAttempts >= RECOVERY_MAX_ATTEMPTS) return;
  const delay = RECOVERY_BACKOFFS_MS[recoveryAttempts];
  recoveryAttempts += 1;
  recoveryTimer = setTimeout(() => {
    recoveryTimer = null;
    void (async () => {
      const ok = await renewSessionAndInvalidateCache();
      await useHomeStore.getState().fetchHome(ok);
    })();
  }, delay);
}

const homeFetcher = createCachedFetcher<[force?: boolean], HomeData>({
  context: 'homeStore',
  cacheKey: () => CACHE_PREFIXES.HOME,
  ttl: CACHE_TTL.HOME,
  fetch: () => source.getHomeData(),
  forceArgIndex: 0,
});

interface HomeState {
  homeData: HomeData;
  isLoading: boolean;
  isRefreshing: boolean;
  error: AppError | null;
  fetchHome: (force?: boolean) => Promise<void>;
  prepareRefresh: () => void;
  reset: () => void;
}

export const useHomeStore = create<HomeState>((set) => ({
  homeData: { recent: [] },
  isLoading: false,
  isRefreshing: false,
  error: null,

  fetchHome: async (force) => {
    set({ isLoading: true, error: null });
    const { result, isCurrent } = await homeFetcher.run(force);

    // A newer fetchHome/reset superseded this one. Aborts resolve as
    // {data: null, error: null} (treated as success by runWithRetry), so
    // writing here would wipe homeData and clear the error, briefly flashing
    // the 'Sin datos' empty state.
    if (!isCurrent()) return;

    if (result.error) {
      set({ error: result.error, isLoading: false, isRefreshing: false });
      if (result.error.type === 'AUTH_ERROR') {
        scheduleRecovery();
      }
      return;
    }

    clearRecovery();
    set({ homeData: result.data ?? { recent: [] }, isLoading: false, isRefreshing: false });
  },

  prepareRefresh: () => {
    set({ isRefreshing: true, error: null });
  },

  reset: () => {
    homeFetcher.abort();
    clearRecovery();
    set({ homeData: { recent: [] }, isLoading: false, isRefreshing: false, error: null });
  },
}));
