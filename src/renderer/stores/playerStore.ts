import { create } from 'zustand';
import { source } from '../services/source';
import { sessionManager } from '../services/session';
import { storage } from '../utils/storage';
import { withCache } from '../utils/cache';
import { logger } from '../utils/logger';
import { CACHE_PREFIXES, CACHE_TTL } from '../../config/cache';
import type { VideoServer, StreamUrlResult } from '../../types';

interface PlayerState {
  servers: VideoServer[];
  streamUrl: string;
  streamHeaders: Record<string, string>;
  lastLanguage: string;
  isLoading: boolean;
  error: string | null;
  fetchServers: (slug: string, number: number, signal?: AbortSignal) => Promise<void>;
  resolveStream: (server: VideoServer) => Promise<void>;
  setStream: (url: string, headers?: Record<string, string>) => void;
  setLastLanguage: (lang: string) => void;
  reset: () => void;
  clearError: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  servers: [],
  streamUrl: '',
  streamHeaders: {},
  lastLanguage: 'sub',
  isLoading: false,
  error: null,

  fetchServers: async (slug, number, signal) => {
    set({ isLoading: true, error: null });

    const result = await withCache(
      `${CACHE_PREFIXES.SERVERS}_${slug}_${number}`,
      async () => source.getEpisodeServers(slug, number),
      { ttl: CACHE_TTL.SERVERS, signal },
    );

    if (result.error) {
      if (result.error.type === 'AUTH_ERROR') {
        logger.info('playerStore', 'Auth error fetching servers, refreshing session');
        await sessionManager.refreshSession();
        const retry = await withCache(
          `${CACHE_PREFIXES.SERVERS}_${slug}_${number}`,
          async () => source.getEpisodeServers(slug, number),
          { force: true },
        );
        if (retry.error) {
          set({ error: retry.error.message, isLoading: false });
          return;
        }
        set({ servers: retry.data ?? [], isLoading: false });
        return;
      }
      set({ error: result.error.message, isLoading: false });
      return;
    }

    set({ servers: result.data ?? [], isLoading: false });
  },

  resolveStream: async (server) => {
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
      if (result.error.type === 'AUTH_ERROR') {
        await sessionManager.refreshSession();
        const retryData = await source.resolveStreamUrl(server.url);
        set({
          streamUrl: retryData.url,
          streamHeaders: retryData.headers ?? {},
          lastLanguage: server.language,
          isLoading: false,
        });
        return;
      }
      set({ error: result.error.message, isLoading: false });
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
    set({
      servers: [],
      streamUrl: '',
      streamHeaders: {},
      lastLanguage: 'sub',
      isLoading: false,
      error: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));
