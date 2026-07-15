import { useState, useRef, useCallback, useEffect } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { useHistoryStore } from '../stores/historyStore';
import type { AnimeDetail } from '../../types';

const PROGRESS_INTERVAL = 250;

export function usePlayer(
  slug: string,
  episodeNumber: number,
  anime: AnimeDetail | null,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  onNavigateEpisode?: (num: number) => void,
) {
  const { streamUrl, isLoading, error } = usePlayerStore();
  const { addToHistory, lastViewed } = useHistoryStore();
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const progressTimer = useRef<ReturnType<typeof setInterval>>();
  const wasPlayingBeforeOffline = useRef(false);
  const lastSavedEp = useRef(episodeNumber);

  const episodes = [...(anime?.episodes ?? [])].sort((a, b) => a.number - b.number);
  const currentIdx = episodes.findIndex((e) => e.number === episodeNumber);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < episodes.length - 1;

  const saveProgress = useCallback(() => {
    if (videoRef.current) {
      addToHistory({
        title: anime?.title ?? '',
        image: anime?.image ?? '',
        url: slug,
        number: lastSavedEp.current,
        progress: videoRef.current.currentTime,
        duration: videoRef.current.duration || 0,
        timestamp: Date.now(),
      });
    }
  }, [slug, anime, addToHistory, videoRef]);

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
    const goOnline = () => {
      setOffline(false);
      if (wasPlayingBeforeOffline.current && videoRef.current) {
        videoRef.current.play().then(() => setPlaying(true)).catch(() => undefined);
      }
    };
    const goOffline = () => {
      wasPlayingBeforeOffline.current = playing;
      videoRef.current?.pause();
      setPlaying(false);
      setOffline(true);
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
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
    if (!videoRef.current) return;
    const historyItem = lastViewed.find(
      (item) => item.url === slug && item.number === episodeNumber,
    );
    if (historyItem && historyItem.progress > 0) {
      videoRef.current.currentTime = historyItem.progress;
    }
  }, [slug, episodeNumber, lastViewed, videoRef]);
  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    setCurrentTime(0);
    setDuration(0);

    const video = videoRef.current;
    video.src = streamUrl;
    video.load();
    setLoaded(true);
    lastSavedEp.current = episodeNumber;

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

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    video.play().then(() => setPlaying(true)).catch(() => undefined);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [streamUrl, videoRef, episodeNumber, hasNext, onNavigateEpisode, saveProgress]);
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
      saveProgress();
    };
  }, [slug, episodeNumber, anime, videoRef, saveProgress]);

  // Persist progress periodically so it survives app close
  const persistTimer = useRef<ReturnType<typeof setInterval>>();
  useEffect(() => {
    if (!streamUrl) return;
    persistTimer.current = setInterval(saveProgress, 10000);
    return () => {
      if (persistTimer.current) clearInterval(persistTimer.current);
    };
  }, [streamUrl, saveProgress]);

  return {
    playing,
    currentTime,
    duration,
    loaded,
    isLoading,
    streamUrl,
    error,
    offline,
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
