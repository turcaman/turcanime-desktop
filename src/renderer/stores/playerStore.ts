import { create } from 'zustand';
import { source } from '../services/source';
import { sessionManager } from '../services/session';
import { withCache } from '../utils/cache';
import { logger } from '../utils/logger';
import { CACHE_PREFIXES, CACHE_TTL } from '../../config/cache';
import type { VideoServer } from '../../types';

interface PlayerState {
  servers: VideoServer[];
  streamUrl: string;
  streamHeaders: Record<string, string>;
  lastLanguage: string;
  isLoading: boolean;
  error: string | null;
  fetchServers: (slug: string, number: number, signal?: AbortSignal, retryCount?: number) => Promise<void>;
  resolveStream: (server: VideoServer, retryCount?: number) => Promise<void>;
  setStream: (url: string, headers?: Record<string, string>) => void;
  setLastLanguage: (lang: string) => void;
  reset: () => void;
  clearError: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  servers: [],
  streamUrl: '',
  streamHeaders: {},
  lastLanguage: 'sub',
  isLoading: false,
  error: null,

  fetchServers: async (slug, number, signal, retryCount = 0) => {
    set({ isLoading: true, error: null });

    const result = await withCache(
      `${CACHE_PREFIXES.SERVERS}_${slug}_${number}`,
      async () => source.getEpisodeServers(slug, number),
      { ttl: CACHE_TTL.SERVERS, signal },
    );

    if (result.error) {
      const isAuth = result.error.type === 'AUTH_ERROR';
      if (isAuth && retryCount < 3) {
        const backoff = Math.min(1000 * Math.pow(2, retryCount), 8000);
        logger.info('playerStore', `Auth error fetching servers (attempt ${retryCount + 1}/3), refreshing session`);
        await sessionManager.refreshSession();
        await new Promise((r) => setTimeout(r, backoff));
        return get().fetchServers(slug, number, undefined, retryCount + 1);
      }
      if (retryCount < 2 && !isAuth) {
        const backoff = Math.min(1000 * Math.pow(2, retryCount), 4000);
        logger.info('playerStore', `Retry fetchServers ${retryCount + 1}/3 after ${backoff}ms`);
        await new Promise((r) => setTimeout(r, backoff));
        return get().fetchServers(slug, number, undefined, retryCount + 1);
      }
      const errMsg = result.error?.message;
      set({
        error: typeof errMsg === 'string' && errMsg.length > 0 ? errMsg : 'Error desconocido',
        isLoading: false,
      });
      return;
    }

    set({ servers: result.data ?? [], isLoading: false });
  },

  resolveStream: async (server, retryCount = 0) => {
    set({ isLoading: true, error: null });

    const cacheKey = `${CACHE_PREFIXES.STREAM}_${server.id}`;

    const result = await withCache(
      cacheKey,
      async () => {
        const resolved = await source.resolveStreamUrl(server.url);
        return resolved;
      },
      { ttl: CACHE_TTL.STREAM },
    );

    if (result.error) {
      const isAuth = result.error.type === 'AUTH_ERROR';
      if (isAuth && retryCount < 3) {
        const backoff = Math.min(1000 * Math.pow(2, retryCount), 8000);
        logger.info('playerStore', `Auth error resolveStream (attempt ${retryCount + 1}/3), refreshing session`);
        await sessionManager.refreshSession();
        await new Promise((r) => setTimeout(r, backoff));
        return get().resolveStream(server, retryCount + 1);
      }
      if (retryCount < 2 && !isAuth) {
        const backoff = Math.min(1000 * Math.pow(2, retryCount), 4000);
        logger.info('playerStore', `Retry resolveStream ${retryCount + 1}/3 after ${backoff}ms`);
        await new Promise((r) => setTimeout(r, backoff));
        return get().resolveStream(server, retryCount + 1);
      }
      const errMsg = result.error?.message;
      set({
        error: typeof errMsg === 'string' && errMsg.length > 0 ? errMsg : 'Error desconocido',
        isLoading: false,
      });
      return;
    }

    if (result.data) {
      set({
        streamUrl: result.data.url,
        streamHeaders: result.data.headers ?? {},
        lastLanguage: server.language,
        isLoading: false,
      });
    }
  },

  setStream: (url, headers) => {
    set({ streamUrl: url, streamHeaders: headers ?? {} });
  },

  setLastLanguage: (lang) => {
    set({ lastLanguage: lang });
  },

  reset: () => {
    const lang = get().lastLanguage;
    set({
      servers: [],
      streamUrl: '',
      streamHeaders: {},
      lastLanguage: lang,
      isLoading: false,
      error: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));
