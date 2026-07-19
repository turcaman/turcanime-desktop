import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, WifiOff } from 'lucide-react';
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
  const { activeAnime } = useDetailsStore();
  const { fetchServers, lastLanguage, resolveStream, reset } = usePlayerStore();
  const [fullscreen, setFullscreen] = useState(false);
  const fullscreenRef = useRef(false);
  fullscreenRef.current = fullscreen;

  useEffect(() => {
    const off = window.electronAPI.fullscreen.onChanged((flag: boolean) => setFullscreen(flag));
    return off;
  }, []);

  useEffect(() => {
    const syncFs = () => {
      const isFs = document.fullscreenElement != null || (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement != null;
      if (!isFs && fullscreenRef.current) {
        window.electronAPI.fullscreen.set(false);
      }
    };
    document.addEventListener('fullscreenchange', syncFs);
    document.addEventListener('webkitfullscreenchange', syncFs);
    return () => {
      document.removeEventListener('fullscreenchange', syncFs);
      document.removeEventListener('webkitfullscreenchange', syncFs);
    };
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
    offline,
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
  } = usePlayer(slug, episodeNumber, activeAnime, videoRef, onNavigateToEpisode);

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

  useEffect(() => {
    const prev = prevEpisodeRef.current;
    prevEpisodeRef.current = episodeNumber;
    if (prev === episodeNumber) return;

    reset();
    fetchServers(slug, episodeNumber).then(() => {
      const s = usePlayerStore.getState().servers;
      if (s.length === 0) return;
      const preferred = lastLanguage
        ? s.find((sv) => sv.language.toLowerCase() === lastLanguage.toLowerCase())
        : null;
      resolveStream(preferred ?? s[0]);
    });
  }, [slug, episodeNumber, fetchServers, lastLanguage, resolveStream]);

  return (
    <div
      className="bg-black flex flex-col h-full w-full"
    >
      <div className="relative bg-black flex-1 flex items-center justify-center">
        <video
          ref={videoRef}
          className="w-full h-full"
          style={{ maxHeight: '100vh', objectFit: 'contain' }}
          preload="auto"
          playsInline
        />

        {error && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-red-500/15 backdrop-blur-sm border border-red-500/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-200">{error}</span>
              <button
                onClick={onBack}
                className="text-xs text-red-300 hover:text-red-200 underline ml-2 transition-colors"
              >
                Volver
              </button>
            </div>
          </div>
        )}

        {offline && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-yellow-500/15 backdrop-blur-sm border border-yellow-500/20 rounded-lg">
              <WifiOff className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              <span className="text-sm text-yellow-200">Sin conexión — el video se reanudará cuando haya red</span>
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
