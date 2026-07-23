import { useState, useRef, useCallback, useEffect } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { useHistoryStore } from '../stores/historyStore';
import { sessionManager } from '../services/session';
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
  const [loaded, setLoaded] = useState(false);
  const progressTimer = useRef<ReturnType<typeof setInterval>>();
  const wasPlayingBeforeOffline = useRef(false);
  const lastSavedEp = useRef(episodeNumber);
  const animeInfoRef = useRef({ title: '', image: '' });
  animeInfoRef.current = { title: anime?.title ?? '', image: anime?.image ?? '' };

  const refreshRetryCount = useRef(0);
  const lastRecoveredStreamUrl = useRef<string>('');

  const episodes = [...(anime?.episodes ?? [])].sort((a, b) => a.number - b.number);
  const currentIdx = episodes.findIndex((e) => e.number === episodeNumber);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < episodes.length - 1;

  const saveProgress = useCallback(() => {
    if (videoRef.current) {
      const rawDuration = videoRef.current.duration;
      let duration = (
        typeof rawDuration === 'number' &&
        isFinite(rawDuration) &&
        rawDuration > 0
      ) ? rawDuration : 0;

      if (!duration) {
        const prev = useHistoryStore.getState().lastViewed.find(
          (item) => item.url === slug && item.number === lastSavedEp.current,
        );
        if (prev?.duration && isFinite(prev.duration) && prev.duration > 0) {
          duration = prev.duration;
        }
      }

      let progress = videoRef.current.currentTime;
      if (duration > 0 && progress / duration >= 0.9) {
        progress = duration;
      }

      addToHistory({
        title: animeInfoRef.current.title,
        image: animeInfoRef.current.image,
        url: slug,
        number: lastSavedEp.current,
        progress,
        duration,
        timestamp: Date.now(),
      });
    }
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
      if (videoRef.current && videoRef.current.src) {
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
      return;
    }

    if (streamUrl !== lastRecoveredStreamUrl.current) {
      refreshRetryCount.current = 0;
    }

    setCurrentTime(0);
    setDuration(0);
    setBuffering(false);

    const video = videoRef.current;
    video.src = streamUrl;
    video.load();
    setLoaded(true);
    lastSavedEp.current = episodeNumber;

    const restoredItems = useHistoryStore.getState().lastViewed;
    const historyItem = restoredItems.find(
      (item) => item.url === slug && item.number === episodeNumber,
    );
    if (historyItem && historyItem.progress > 0) {
      video.currentTime = historyItem.progress;
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);
    };

    const handleEnded = () => {
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

      if (!NETWORK_ERROR_CODES.includes(code)) return;
      if (refreshRetryCount.current >= PLAYER_REFRESH_MAX_RETRIES) {
        logger.warn('Player', `refresh retries exhausted (${PLAYER_REFRESH_MAX_RETRIES}), giving up`);
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
        const servers = state.servers;
        if (servers.length === 0) return;
        const preferred = state.lastLanguage
          ? servers.find((sv) => sv.language.toLowerCase() === state.lastLanguage.toLowerCase())
          : null;
        const target = preferred ?? servers[0];
        try {
          await resolveStream(target);
          lastRecoveredStreamUrl.current = usePlayerStore.getState().streamUrl;
        } catch (e) {
          logger.warn('Player', 'stream re-resolve failed', e);
        }
      })();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleError);

    video.play().then(() => setPlaying(true)).catch((): void => undefined);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('error', handleError);
    };
  }, [streamUrl, videoRef, episodeNumber, hasNext, onNavigateEpisode, saveProgress, resolveStream]);
  useEffect(() => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    lastSavedEp.current = episodeNumber;
    progressTimer.current = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        const ct = videoRef.current.currentTime;
        const dur = videoRef.current.duration || 0;
        setCurrentTime(ct);
        setDuration(dur);
      }
    }, PROGRESS_INTERVAL);

    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [slug, episodeNumber, videoRef, saveProgress]);

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
    loaded,
    isLoading,
    streamUrl,
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
    saveProgress,
  };
}
