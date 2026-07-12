import { useState, useRef, useCallback, useEffect } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { useHistoryStore } from '../stores/historyStore';
import type { AnimeDetail } from '../../types';

const PROGRESS_INTERVAL = 10_000;

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

  const episodes = anime?.episodes ?? [];
  const currentIdx = episodes.findIndex((e) => e.number === episodeNumber);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < episodes.length - 1;

  const navigatePrev = useCallback(() => {
    if (hasPrev) onNavigateEpisode?.(episodeNumber - 1);
  }, [hasPrev, episodeNumber, onNavigateEpisode]);

  const navigateNext = useCallback(() => {
    if (hasNext) onNavigateEpisode?.(episodeNumber + 1);
  }, [hasNext, episodeNumber, onNavigateEpisode]);

  useEffect(() => {
    const goOnline = () => {
      setOffline(false);
      if (wasPlayingBeforeOffline.current && videoRef.current) {
        videoRef.current.play().then(() => setPlaying(true)).catch(() => {});
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigatePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, navigatePrev, navigateNext]);

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

    const video = videoRef.current;
    video.src = streamUrl;
    video.load();
    setLoaded(true);

    video.play().then(() => setPlaying(true)).catch(() => {
      // Autoplay blocked by browser, user must press play manually
    });
  }, [streamUrl, videoRef]);
  useEffect(() => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    progressTimer.current = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        const ct = videoRef.current.currentTime;
        const dur = videoRef.current.duration || 0;
        setCurrentTime(ct);
        setDuration(dur);
        addToHistory({
          title: anime?.title ?? '',
          image: anime?.image ?? '',
          url: slug,
          number: episodeNumber,
          progress: ct,
          duration: dur,
          timestamp: Date.now(),
        });
      }
    }, PROGRESS_INTERVAL);

    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
      if (videoRef.current) {
        addToHistory({
          title: anime?.title ?? '',
          image: anime?.image ?? '',
          url: slug,
          number: episodeNumber,
          progress: videoRef.current.currentTime,
          duration: videoRef.current.duration || 0,
          timestamp: Date.now(),
        });
      }
    };
  }, [slug, episodeNumber, anime, addToHistory, videoRef]);

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
    togglePlay,
    seek,
    navigatePrev,
    navigateNext,
  };
}
