import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { usePlayer } from '../hooks/usePlayer';
import { useDetailsStore } from '../stores/detailsStore';
import { usePlayerStore } from '../stores/playerStore';
import { pickPreferredServer } from '../utils/servers';
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
  const fetchServers = usePlayerStore((s) => s.fetchServers);
  const resolveStream = usePlayerStore((s) => s.resolveStream);
  const reset = usePlayerStore((s) => s.reset);
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

  // Loads servers (skipping the fetch when the detail page already loaded them
  // for this slug+episode) and resolves the preferred stream. forceStream
  // bypasses the stream cache for user retries.
  const startPlayback = useCallback((forceStream = false) => {
    const state = usePlayerStore.getState();
    const alreadyLoaded = state.serversFor?.slug === slug
      && state.serversFor?.number === episodeNumber;

    if (alreadyLoaded) {
      usePlayerStore.setState({ streamUrl: '', error: null });
      const target = pickPreferredServer(state.servers, state.lastLanguage);
      if (!target) {
        usePlayerStore.setState({
          error: { type: 'SERVER_ERROR', message: 'No hay servidores disponibles para este episodio.' },
        });
        return;
      }
      resolveStream(target, forceStream ? { force: true } : undefined);
      return;
    }

    reset();
    fetchServers(slug, episodeNumber).then(() => {
      const s = usePlayerStore.getState();
      if (s.servers.length === 0) {
        usePlayerStore.setState({
          error: { type: 'SERVER_ERROR', message: 'No hay servidores disponibles para este episodio.' },
        });
        return;
      }
      const target = pickPreferredServer(s.servers, s.lastLanguage);
      if (target) resolveStream(target, forceStream ? { force: true } : undefined);
    });
  }, [slug, episodeNumber, reset, fetchServers, resolveStream]);

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

  // Re-run only when the episode (or anime) changes; startPlayback reads the
  // last language from the store, so it must not re-trigger on that change.
  useEffect(() => {
    const prev = prevEpisodeRef.current;
    prevEpisodeRef.current = episodeNumber;
    if (prev === episodeNumber) return;
    startPlayback();
  }, [slug, episodeNumber, startPlayback]);

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
                onClick={() => startPlayback(true)}
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
