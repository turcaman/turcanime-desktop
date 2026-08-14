import { useCallback, useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { sessionManager } from '../services/session';
import { pickPreferredServer } from '../utils/servers';
import { logger } from '../utils/logger';

const PLAYER_REFRESH_MAX_RETRIES = 2;
const NETWORK_ERROR_CODES = [2, 3];

// Owns the stream-recovery machinery: a retry budget for network errors during
// playback, reset whenever the stream URL actually changes. On a recoverable
// error it refreshes the session and re-resolves the preferred stream, bumping
// reloadNonce so the video reloads even when the resolved URL is identical to
// the failed one (same URL would not change the store and the effect would
// never re-run).
export function usePlaybackRecovery(streamUrl: string) {
  const resolveStream = usePlayerStore((s) => s.resolveStream);
  const refreshRetryCount = useRef(0);
  const lastRecoveredStreamUrl = useRef<string>('');
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    if (streamUrl !== lastRecoveredStreamUrl.current) {
      refreshRetryCount.current = 0;
      lastRecoveredStreamUrl.current = streamUrl;
    }
  }, [streamUrl]);

  const handleMediaError = useCallback((video: HTMLVideoElement) => {
    const mediaError = video.error;
    const code = mediaError?.code ?? 0;
    logger.warn('Player', `video error code=${code} message=${mediaError?.message ?? 'unknown'}`);

    // SRC_NOT_SUPPORTED (4) cannot be recovered by re-resolving the same
    // stream (e.g. an HLS url the engine cannot play); surface it instead.
    if (code === 4) {
      usePlayerStore.setState({
        error: { type: 'SERVER_ERROR', message: 'No se pudo reproducir este contenido.' },
      });
      return;
    }
    if (!NETWORK_ERROR_CODES.includes(code)) return;

    if (refreshRetryCount.current >= PLAYER_REFRESH_MAX_RETRIES) {
      logger.warn('Player', `refresh retries exhausted (${PLAYER_REFRESH_MAX_RETRIES}), giving up`);
      usePlayerStore.setState({
        error: { type: 'NETWORK_ERROR', message: 'La reproducción se interrumpió y no se pudo recuperar.' },
      });
      return;
    }

    refreshRetryCount.current += 1;
    logger.info('Player', `network error during playback, refreshing session and re-resolving stream (attempt ${refreshRetryCount.current}/${PLAYER_REFRESH_MAX_RETRIES})`);

    (async () => {
      try {
        await sessionManager.refreshSession();
      } catch (e) {
        logger.warn('Player', 'session refresh failed before stream re-resolve', e);
        return;
      }
      const state = usePlayerStore.getState();
      const target = pickPreferredServer(state.servers, state.lastLanguage);
      if (!target) return;
      try {
        // force bypasses the stream cache: re-resolving a cached URL would
        // set the same streamUrl, no effect re-run, and a silent dead player.
        // lastRecoveredStreamUrl is refreshed inside the effect so a fresh
        // URL resets the retry counter.
        await resolveStream(target, { force: true });
        setReloadNonce((n) => n + 1);
      } catch (e) {
        logger.warn('Player', 'stream re-resolve failed', e);
      }
    })();
  }, [resolveStream]);

  return { reloadNonce, handleMediaError };
}
