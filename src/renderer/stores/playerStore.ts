import { create } from 'zustand';
import { source } from '../services/source';
import { withCache } from '../utils/cache';
import { runWithRetry } from '../utils/runWithRetry';
import { CACHE_PREFIXES, CACHE_TTL } from '../../config/cache';
import type { AppError, VideoServer } from '../../types';

interface PlayerState {
  servers: VideoServer[];
  // slug+number the current servers belong to, so re-entering the player for
  // the same episode can skip the redundant fetchServers call.
  serversFor: { slug: string; number: number } | null;
  streamUrl: string;
  lastLanguage: string;
  isLoading: boolean;
  error: AppError | null;
  fetchServers: (slug: string, number: number) => Promise<void>;
  resolveStream: (server: VideoServer, options?: { force?: boolean }) => Promise<void>;
  setLastLanguage: (lang: string) => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  servers: [],
  serversFor: null,
  streamUrl: '',
  lastLanguage: 'sub',
  isLoading: false,
  error: null,

  fetchServers: async (slug, number) => {
    set({ isLoading: true, error: null });

    const result = await runWithRetry(
      (attempt) =>
        withCache(
          `${CACHE_PREFIXES.SERVERS}_${slug}_${number}`,
          () => source.getEpisodeServers(slug, number),
          { ttl: CACHE_TTL.SERVERS, force: attempt > 0 },
        ),
      'playerStore',
    );

    if (result.error) {
      set({ error: result.error, isLoading: false });
      return;
    }

    set({ servers: result.data ?? [], serversFor: { slug, number }, isLoading: false });
  },

  resolveStream: async (server, options) => {
    set({ isLoading: true, error: null });

    const cacheKey = `${CACHE_PREFIXES.STREAM}_${server.id}`;

    const result = await runWithRetry(
      (attempt) =>
        withCache(
          cacheKey,
          async () => {
            const resolved = await source.resolveStreamUrl(server.url);
            return resolved;
          },
          { ttl: CACHE_TTL.STREAM, force: attempt > 0 || options?.force === true },
        ),
      'playerStore',
    );

    if (result.error) {
      set({ error: result.error, isLoading: false });
      return;
    }

    if (result.data) {
      set({
        streamUrl: result.data.url,
        lastLanguage: server.language,
        isLoading: false,
      });
    }
  },

  setLastLanguage: (lang) => {
    set({ lastLanguage: lang });
  },

  reset: () => {
    const lang = get().lastLanguage;
    set({
      servers: [],
      serversFor: null,
      streamUrl: '',
      lastLanguage: lang,
      isLoading: false,
      error: null,
    });
  },
}));