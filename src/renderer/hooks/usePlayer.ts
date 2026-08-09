import { useState, useRef, useCallback, useEffect } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { useHistoryStore } from '../stores/historyStore';
import { sessionManager } from '../services/session';
import { attachHls, isHlsUrl } from '../services/hlsPlayback';
import { pickPreferredServer } from '../utils/servers';
import { logger } from '../utils/logger';
import type { AnimeDetail } from '../../types';

const PROGRESS_INTERVAL = 250;
const PLAYER_REFRESH_MAX_RETRIES = 2;
const NETWORK_ERROR_CODES = [2, 3];

export function usePlayer(
  slug: string,
  episodeNumber: number,
  anime: AnimeDetail | null,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  onNavigateEpisode?: (num: number) => void,
) {
  const streamUrl = usePlayerStore((s) => s.streamUrl);
  const isLoading = usePlayerStore((s) => s.isLoading);
  const error = usePlayerStore((s) => s.error);
  const resolveStream = usePlayerStore((s) => s.resolveStream);
  const addToHistory = useHistoryStore((s) => s.addToHistory);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const progressTimer = useRef<ReturnType<typeof setInterval>>();
  const wasPlayingBeforeOffline = useRef(false);
  const lastSavedEp = useRef(episodeNumber);
  const animeInfoRef = useRef({ title: '', image: '' });
  animeInfoRef.current = { title: anime?.title ?? '', image: anime?.image ?? '' };

  const refreshRetryCount = useRef(0);
  const lastRecoveredStreamUrl = useRef<string>('');
  // Current hls.js instance for HLS streams; destroyed before every source swap.
  const hlsRef = useRef<ReturnType<typeof attachHls> | null>(null);
  // Bumped after a forced stream re-resolve so the video reloads even when the
  // resolved URL is identical to the failed one (same URL would not change the
  // streamUrl state and the effect would never re-run).
  const [reloadNonce, setReloadNonce] = useState(0);
  // Last known media position, used by saveProgress during unmount cleanup
  // when the video ref is already null.
  const lastMediaState = useRef({ time: 0, duration: 0 });

  const episodes = [...(anime?.episodes ?? [])].sort((a, b) => a.number - b.number);
  const currentIdx = episodes.findIndex((e) => e.number === episodeNumber);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < episodes.length - 1;

  const saveProgress = useCallback(() => {
    const video = videoRef.current;
    const rawTime = video ? video.currentTime : lastMediaState.current.time;
    let duration = video
      ? (typeof video.duration === 'number' &&
        isFinite(video.duration) &&
        video.duration > 0
        ? video.duration
        : 0)
      : lastMediaState.current.duration;

    if (!duration) {
      const prev = useHistoryStore.getState().lastViewed.find(
        (item) => item.slug === slug && item.number === lastSavedEp.current,
      );
      if (prev?.duration && isFinite(prev.duration) && prev.duration > 0) {
        duration = prev.duration;
      }
    }

    let progress = rawTime;
    if (duration > 0 && progress / duration >= 0.9) {
      progress = duration;
    }

    addToHistory({
      title: animeInfoRef.current.title,
      image: animeInfoRef.current.image,
      slug,
      number: lastSavedEp.current,
      progress,
      duration,
      timestamp: Date.now(),
    });
  }, [slug, addToHistory, videoRef]);

  const navigatePrev = useCallback(() => {
    if (hasPrev) {
      saveProgress();
      onNavigateEpisode?.(episodeNumber - 1);
    }
  }, [hasPrev, episodeNumber, onNavigateEpisode, saveProgress]);

  const navigateNext = useCallback(() => {
    if (hasNext) {
      saveProgress();
      onNavigateEpisode?.(episodeNumber + 1);
    }
  }, [hasNext, episodeNumber, onNavigateEpisode, saveProgress]);

  useEffect(() => {
    const goOffline = () => {
      wasPlayingBeforeOffline.current = playing;
      videoRef.current?.pause();
      setPlaying(false);
    };
    const goOnline = () => {
      if (wasPlayingBeforeOffline.current && videoRef.current) {
        videoRef.current.play().then(() => setPlaying(true)).catch((): void => undefined);
      }
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, [playing, videoRef]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  }, [videoRef]);

  const seek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, [videoRef]);

  const seekBack10 = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
    }
  }, [videoRef]);

  const seekForward10 = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 10);
    }
  }, [videoRef]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        seekBack10();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        seekForward10();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seekBack10, seekForward10]);

  useEffect(() => {
    if (!streamUrl || !videoRef.current) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (videoRef.current && videoRef.current.src) {
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
      return;
    }

    if (streamUrl !== lastRecoveredStreamUrl.current) {
      refreshRetryCount.current = 0;
      lastRecoveredStreamUrl.current = streamUrl;
    }

    setCurrentTime(0);
    setDuration(0);
    setBuffering(false);

    const video = videoRef.current;
    // Tear down any previous HLS session before switching source.
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = isHlsUrl(streamUrl);
    // For HLS, leave the element alone: hls.js assigns video.src to its own
    // MediaSource blob URL internally.
    if (!isHls) {
      video.src = streamUrl;
      video.load();
    }
    lastSavedEp.current = episodeNumber;

    const restoredItems = useHistoryStore.getState().lastViewed;
    const historyItem = restoredItems.find(
      (item) => item.slug === slug && item.number === episodeNumber,
    );
    const restoreProgress = historyItem && historyItem.progress > 0 ? historyItem.progress : 0;
    // Removed in the cleanup below so a failed HLS episode cannot leave a
    // stale listener that seeks the next stream to the previous position.
    let restoreOnReady: (() => void) | null = null;
    if (isHls) {
      // currentTime is not reliable until the manifest is parsed and media is
      // attached; apply the restored position once metadata is available.
      if (restoreProgress > 0) {
        restoreOnReady = () => {
          video.currentTime = restoreProgress;
          if (restoreOnReady) {
            video.removeEventListener('loadedmetadata', restoreOnReady);
          }
        };
        video.addEventListener('loadedmetadata', restoreOnReady);
      }
    } else if (restoreProgress > 0) {
      video.currentTime = restoreProgress;
    }

    const handleTimeUpdate = () => {
      lastMediaState.current = { time: video.currentTime, duration: video.duration || 0 };
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);
    };

    const handleLoadedMetadata = () => {
      lastMediaState.current = { ...lastMediaState.current, duration: video.duration || 0 };
      setDuration(video.duration || 0);
    };

    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);

    const handleEnded = () => {
      setPlaying(false);
      if (hasNext) {
        saveProgress();
        onNavigateEpisode?.(episodeNumber + 1);
      }
    };

    const handleWaiting = () => setBuffering(true);
    const handleCanPlay = () => setBuffering(false);
    const handlePlaying = () => setBuffering(false);

    const handleError = () => {
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
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleError);

    if (isHls) {
      const hls = attachHls(video, streamUrl, (error) => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        usePlayerStore.setState({ error });
      });
      hlsRef.current = hls;
    }

    video.play().catch((): void => undefined);

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (restoreOnReady) {
        video.removeEventListener('loadedmetadata', restoreOnReady);
      }
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('error', handleError);
    };
  }, [streamUrl, videoRef, slug, episodeNumber, hasNext, onNavigateEpisode, saveProgress, resolveStream, reloadNonce]);
  useEffect(() => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    lastSavedEp.current = episodeNumber;
    progressTimer.current = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        const ct = videoRef.current.currentTime;
        const dur = videoRef.current.duration || 0;
        lastMediaState.current = { time: ct, duration: dur };
        setCurrentTime(ct);
        setDuration(dur);
      }
    }, PROGRESS_INTERVAL);

    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [episodeNumber, videoRef]);

  // Periodically save progress (state + disk) so it survives app close
  const persistTimer = useRef<ReturnType<typeof setInterval>>();
  useEffect(() => {
    if (!streamUrl) return;
    persistTimer.current = setInterval(saveProgress, 10000);
    return () => {
      if (persistTimer.current) clearInterval(persistTimer.current);
      saveProgress();
    };
  }, [streamUrl, saveProgress]);

  return {
    playing,
    buffering,
    currentTime,
    duration,
    isLoading,
    error,
    hasPrev,
    hasNext,
    animeTitle: anime?.title,
    episodeNumber,
    togglePlay,
    seek,
    seekBack10,
    seekForward10,
    navigatePrev,
    navigateNext,
  };
}
