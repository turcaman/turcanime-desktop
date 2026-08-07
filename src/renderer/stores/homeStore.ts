import { create } from 'zustand';
import { source } from '../services/source';
import { sessionManager } from '../services/session';
import { withCache, clearAllCache } from '../utils/cache';
import { runWithRetry } from '../utils/runWithRetry';
import { CACHE_PREFIXES, CACHE_TTL } from '../../config/cache';
import type { AppError, HomeData } from '../../types';

let homeController: AbortController | null = null;

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
      const session = await sessionManager.refreshSession();
      if (session.cookies.length > 0) {
        await clearAllCache();
        await useHomeStore.getState().fetchHome(true);
      } else {
        await useHomeStore.getState().fetchHome(false);
      }
    })();
  }, delay);
}

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
    if (homeController) {
      homeController.abort();
    }
    const controller = new AbortController();
    homeController = controller;

    set({ isLoading: true, error: null });

    const result = await runWithRetry(
      (attempt) =>
        withCache(
          CACHE_PREFIXES.HOME,
          () => source.getHomeData(),
          { ttl: CACHE_TTL.HOME, signal: controller.signal, force: attempt > 0 || force },
        ),
      'homeStore',
    );

    // A newer fetchHome/reset superseded this one. Aborts resolve as
    // {data: null, error: null} (treated as success by runWithRetry), so
    // writing here would wipe homeData and clear the error, briefly flashing
    // the 'Sin datos' empty state.
    if (controller.signal.aborted || homeController !== controller) {
      return;
    }

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
    if (homeController) {
      homeController.abort();
      homeController = null;
    }
    clearRecovery();
    set({ homeData: { recent: [] }, isLoading: false, isRefreshing: false, error: null });
  },
}));