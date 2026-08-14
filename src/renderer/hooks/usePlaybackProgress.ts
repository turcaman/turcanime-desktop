import { useCallback, useEffect, useRef } from 'react';
import { useHistoryStore } from '../stores/historyStore';
import type { AnimeDetail } from '../../types';

const PERSIST_INTERVAL = 10000;

interface UsePlaybackProgressOptions {
  slug: string;
  anime: AnimeDetail | null;
  episodeNumber: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  streamUrl: string;
  onMediaState: (time: number, duration: number) => void;
}

// Owns the progress bookkeeping: keeps the last known media position (also
// used by saveProgress once the video element is already torn down), mirrors
// position changes into the player UI state via onMediaState, and persists
// progress to history every 10s while a stream is active (plus once on
// cleanup) so it survives app close.
export function usePlaybackProgress({
  slug,
  anime,
  episodeNumber,
  videoRef,
  streamUrl,
  onMediaState,
}: UsePlaybackProgressOptions) {
  const addToHistory = useHistoryStore((s) => s.addToHistory);
  const lastMediaState = useRef({ time: 0, duration: 0 });
  // Read via ref inside saveProgress so a save triggered right before a
  // navigation records the episode that is actually playing.
  const episodeRef = useRef(episodeNumber);
  episodeRef.current = episodeNumber;
  const animeInfoRef = useRef({ title: '', image: '' });
  animeInfoRef.current = { title: anime?.title ?? '', image: anime?.image ?? '' };
  const persistTimer = useRef<ReturnType<typeof setInterval>>();

  const updateMediaState = useCallback((time: number, duration: number) => {
    lastMediaState.current = { time, duration };
    onMediaState(time, duration);
  }, [onMediaState]);

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
        (item) => item.slug === slug && item.number === episodeRef.current,
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
      number: episodeRef.current,
      progress,
      duration,
      timestamp: Date.now(),
    });
  }, [slug, addToHistory, videoRef]);

  // Persist progress periodically (state + disk) so it survives app close.
  useEffect(() => {
    if (!streamUrl) return;
    persistTimer.current = setInterval(saveProgress, PERSIST_INTERVAL);
    return () => {
      if (persistTimer.current) clearInterval(persistTimer.current);
      saveProgress();
    };
  }, [streamUrl, saveProgress]);

  return { saveProgress, updateMediaState };
}
