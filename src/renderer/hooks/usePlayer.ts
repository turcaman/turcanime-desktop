import { useState, useRef, useCallback, useEffect } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { useHistoryStore } from '../stores/historyStore';
import { attachHls, isHlsUrl } from '../services/hlsPlayback';
import { usePlaybackProgress } from './usePlaybackProgress';
import { usePlaybackRecovery } from './usePlaybackRecovery';
import type { AnimeDetail } from '../../types';

const PROGRESS_INTERVAL = 250;

// Orchestrates a playback session for one episode: media element wiring
// (source, HLS, events), position tracking and progress persistence
// (usePlaybackProgress) and stream recovery on network errors
// (usePlaybackRecovery), plus playback controls, shortcuts and prev/next
// navigation.
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
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const progressTimer = useRef<ReturnType<typeof setInterval>>();
  const wasPlayingBeforeOffline = useRef(false);
  // Current hls.js instance for HLS streams; destroyed before every source swap.
  const hlsRef = useRef<ReturnType<typeof attachHls> | null>(null);

  const setMediaState = useCallback((time: number, dur: number) => {
    setCurrentTime(time);
    setDuration(dur);
  }, []);

  const { saveProgress, updateMediaState } = usePlaybackProgress({
    slug,
    anime,
    episodeNumber,
    videoRef,
    streamUrl,
    onMediaState: setMediaState,
  });
  const { reloadNonce, handleMediaError } = usePlaybackRecovery(streamUrl);

  const episodes = [...(anime?.episodes ?? [])].sort((a, b) => a.number - b.number);
  const currentIdx = episodes.findIndex((e) => e.number === episodeNumber);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < episodes.length - 1;

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

  // Wires the media source, restores progress and attaches the video element
  // events. Runs whenever the stream URL or episode changes.
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

    const handleTimeUpdate = () => updateMediaState(video.currentTime, video.duration || 0);
    const handleLoadedMetadata = () => updateMediaState(video.currentTime, video.duration || 0);
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
    const handleError = () => handleMediaError(video);

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
      const hls = attachHls(video, streamUrl, (err) => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        usePlayerStore.setState({ error: err });
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
  }, [streamUrl, videoRef, slug, episodeNumber, hasNext, onNavigateEpisode, saveProgress, updateMediaState, handleMediaError, reloadNonce]);

  // Keep the UI position in sync while playing (timeupdate also fires, but
  // the timer keeps updates flowing while paused or during slow events).
  useEffect(() => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    progressTimer.current = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        updateMediaState(videoRef.current.currentTime, videoRef.current.duration || 0);
      }
    }, PROGRESS_INTERVAL);

    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [episodeNumber, videoRef, updateMediaState]);

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
