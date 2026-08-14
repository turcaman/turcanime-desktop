import { create } from 'zustand';
import { source } from '../services/source';
import { withCache } from '../utils/cache';
import { runWithRetry } from '../utils/runWithRetry';
import { pickPreferredServer } from '../utils/servers';
import { CACHE_PREFIXES, CACHE_TTL } from '../../config/cache';
import type { AppError, VideoServer } from '../../types';

const NO_SERVERS_MESSAGE = 'No hay idiomas disponibles para este episodio.';

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
  // Loads servers when needed (reusing the ones already fetched for this
  // slug+episode) and resolves the preferred stream. force bypasses the
  // stream cache, used for user retries.
  startPlayback: (slug: string, number: number, force?: boolean) => void;
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

  startPlayback: (slug, number, force = false) => {
    const state = get();
    const alreadyLoaded =
      state.serversFor?.slug === slug && state.serversFor?.number === number;

    if (alreadyLoaded) {
      set({ streamUrl: '', error: null });
      const target = pickPreferredServer(state.servers, state.lastLanguage);
      if (!target) {
        set({ error: { type: 'SERVER_ERROR', message: NO_SERVERS_MESSAGE } });
        return;
      }
      get().resolveStream(target, force ? { force: true } : undefined);
      return;
    }

    get().reset();
    get().fetchServers(slug, number).then(() => {
      const s = get();
      if (s.servers.length === 0) {
        set({ error: { type: 'SERVER_ERROR', message: NO_SERVERS_MESSAGE } });
        return;
      }
      const target = pickPreferredServer(s.servers, s.lastLanguage);
      if (target) get().resolveStream(target, force ? { force: true } : undefined);
    });
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