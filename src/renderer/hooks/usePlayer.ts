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
) {
  const { streamUrl, isLoading, error } = usePlayerStore();
  const { addToHistory, lastViewed } = useHistoryStore();
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const progressTimer = useRef<ReturnType<typeof setInterval>>();

  const episodes = anime?.episodes ?? [];
  const currentIdx = episodes.findIndex((e) => e.number === episodeNumber);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < episodes.length - 1;

  // Restore progress from history
  useEffect(() => {
    if (!videoRef.current) return;
    const historyItem = lastViewed.find(
      (item) => item.url === `${slug}/${episodeNumber}`,
    );
    if (historyItem && historyItem.progress > 0) {
      videoRef.current.currentTime = historyItem.progress;
    }
  }, [slug, episodeNumber, lastViewed, videoRef]);

  // Native HLS playback via Chromium's FFmpeg + autoplay
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

  // Progress tracking
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
          url: `${slug}/${episodeNumber}`,
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
          url: `${slug}/${episodeNumber}`,
          number: episodeNumber,
          progress: videoRef.current.currentTime,
          duration: videoRef.current.duration || 0,
          timestamp: Date.now(),
        });
      }
    };
  }, [slug, episodeNumber, anime, addToHistory, videoRef]);

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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  return {
    playing,
    currentTime,
    duration,
    loaded,
    isLoading,
    streamUrl,
    error,
    hasPrev,
    hasNext,
    togglePlay,
    seek,
  };
}
