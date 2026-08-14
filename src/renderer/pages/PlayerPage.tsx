import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { usePlayer } from '../hooks/usePlayer';
import { useDetailsStore } from '../stores/detailsStore';
import { usePlayerStore } from '../stores/playerStore';
import { PlayerControls } from '../components/player/PlayerControls';

interface PlayerPageProps {
  slug: string;
  episodeNumber: number;
  onBack: () => void;
  onNavigateToEpisode: (num: number) => void;
}

export const PlayerPage: React.FC<PlayerPageProps> = ({
  slug,
  episodeNumber,
  onBack,
  onNavigateToEpisode,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeAnime = useDetailsStore((s) => s.activeAnime);
  // Only trust the detail store when it belongs to this slug; otherwise the
  // player would show the wrong title and no prev/next navigation.
  const anime = activeAnime?.slug === slug ? activeAnime : null;
  const startPlayback = usePlayerStore((s) => s.startPlayback);
  const [fullscreen, setFullscreen] = useState(false);
  const fullscreenRef = useRef(false);
  fullscreenRef.current = fullscreen;

  useEffect(() => {
    const off = window.electronAPI.fullscreen.onChanged((flag: boolean) => setFullscreen(flag));
    return off;
  }, []);

  useEffect(() => () => {
    if (fullscreenRef.current) {
      window.electronAPI.fullscreen.set(false);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    window.electronAPI.fullscreen.set(!fullscreenRef.current);
  }, []);

  const {
    playing,
    buffering,
    currentTime,
    duration,
    isLoading,
    error,
    hasPrev,
    hasNext,
    animeTitle,
    episodeNumber: currentEpNumber,
    togglePlay,
    seek,
    seekBack10,
    seekForward10,
    navigatePrev,
    navigateNext,
  } = usePlayer(slug, episodeNumber, anime, videoRef, onNavigateToEpisode);

  // Starts playback for the current episode through the store (which decides
  // whether to reuse already-fetched servers); force bypasses the stream
  // cache for user retries.
  const beginPlayback = useCallback((force = false) => {
    startPlayback(slug, episodeNumber, force);
  }, [slug, episodeNumber, startPlayback]);

  const prevEpisodeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        window.electronAPI.fullscreen.set(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [toggleFullscreen]);

  // Re-run only when the episode (or anime) changes; beginPlayback reads the
  // last language from the store, so it must not re-trigger on that change.
  useEffect(() => {
    const prev = prevEpisodeRef.current;
    prevEpisodeRef.current = episodeNumber;
    if (prev === episodeNumber) return;
    beginPlayback();
  }, [slug, episodeNumber, beginPlayback]);

  return (
    <div
      className="bg-black flex flex-col h-full w-full"
    >
      <div className="relative bg-black flex-1 flex items-center justify-center">
        <video
          ref={videoRef}
          className="w-full h-full bg-black"
          style={{ maxHeight: '100vh', objectFit: 'contain' }}
          preload="auto"
          playsInline
        />

        {error && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-red-500/15 backdrop-blur-sm border border-red-500/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-200">{error.message || 'Error desconocido'}</span>
              <button
                onClick={() => beginPlayback(true)}
                className="text-xs text-red-300 hover:text-red-200 underline ml-2 transition-colors"
              >
                Reintentar
              </button>
              <button
                onClick={onBack}
                className="text-xs text-red-300 hover:text-red-200 underline transition-colors"
              >
                Volver
              </button>
            </div>
          </div>
        )}

          <PlayerControls
            playing={playing}
            buffering={buffering}
            currentTime={currentTime}
            duration={duration}
            loading={isLoading}
            hasPrev={hasPrev}
            hasNext={hasNext}
            isFullscreen={fullscreen}
            animeTitle={animeTitle}
            episodeNumber={currentEpNumber}
            onPlayPause={togglePlay}
            onSeek={seek}
            onSeekBack={seekBack10}
            onSeekForward={seekForward10}
            onPrev={navigatePrev}
            onNext={navigateNext}
            onBack={onBack}
            onToggleFullscreen={toggleFullscreen}
          />
      </div>
    </div>
  );
};
