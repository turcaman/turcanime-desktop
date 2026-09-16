import { useCallback, useRef, useState } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { sessionManager } from '../services/session';
import { pickPreferredServer } from '../utils/servers';
import { logger } from '../utils/logger';

const PLAYER_RECOVERY_MAX_ATTEMPTS = 2;
const NETWORK_ERROR_CODES = [2, 3];

// Owns the stream-recovery machinery: a retry budget for network errors during
// playback, reset whenever the failing stream URL actually changes. On a
// recoverable error it refreshes the session and re-resolves the preferred
// stream, bumping reloadNonce so the video reloads even when the resolved URL
// is identical to the failed one (same URL would not change the store and the
// effect would never re-run).
export function usePlaybackRecovery() {
  const resolveStream = usePlayerStore((s) => s.resolveStream);
  const lastFailedUrl = useRef<string>('');
  const recoveryAttempts = useRef(0);
  const [reloadNonce, setReloadNonce] = useState(0);

  // Shared by media-level errors (video.onerror) and hls.js network errors
  // (expired 403 links, fatal timeouts). The budget counts consecutive
  // attempts against the *same* failing URL so a re-minted stream starts fresh
  // while a CDN stuck on 403 cannot loop forever.
  const recoverStream = useCallback(async (): Promise<void> => {
    const state = usePlayerStore.getState();
    const currentUrl = state.streamUrl;

    if (currentUrl !== lastFailedUrl.current) {
      recoveryAttempts.current = 0;
      lastFailedUrl.current = currentUrl;
    }
    if (recoveryAttempts.current >= PLAYER_RECOVERY_MAX_ATTEMPTS) {
      logger.warn('Player', `stream recovery attempts exhausted (${PLAYER_RECOVERY_MAX_ATTEMPTS}), giving up`);
      usePlayerStore.setState({
        error: { type: 'NETWORK_ERROR', message: 'La reproducción se interrumpió y no se pudo recuperar.' },
      });
      return;
    }

    recoveryAttempts.current += 1;
    logger.info('Player', `recovering stream (attempt ${recoveryAttempts.current}/${PLAYER_RECOVERY_MAX_ATTEMPTS})`);

    try {
      await sessionManager.refreshSession();
    } catch (e) {
      logger.warn('Player', 'session refresh failed before stream re-resolve', e);
    }
    const target = pickPreferredServer(state.servers, state.lastLanguage);
    if (!target) return;
    try {
      // force bypasses the stream cache: re-resolving a cached URL would set
      // the same streamUrl, no effect re-run, and a silent dead player.
      await resolveStream(target, { force: true });
      lastFailedUrl.current = usePlayerStore.getState().streamUrl;
      setReloadNonce((n) => n + 1);
    } catch (e) {
      logger.warn('Player', 'stream re-resolve failed', e);
    }
  }, [resolveStream]);

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

    recoverStream();
  }, [recoverStream]);

  return { reloadNonce, handleMediaError, recoverStream };
}
