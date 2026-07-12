import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePlayer } from '../hooks/usePlayer';
import { useDetailsStore } from '../stores/detailsStore';
import { PlayerControls } from '../components/player/PlayerControls';
import { PlayerLoadingOverlay } from '../components/player/PlayerLoadingOverlay';

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
  const [fullscreen, setFullscreen] = useState(false);

  const {
    playing,
    currentTime,
    duration,
    loaded,
    isLoading,
    error,
    hasPrev,
    hasNext,
    togglePlay,
    seek,
  } = usePlayer(slug, episodeNumber, activeAnime, videoRef);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        setFullscreen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePrev = useCallback(() => {
    onNavigateToEpisode(episodeNumber - 1);
  }, [episodeNumber, onNavigateToEpisode]);

  const handleNext = useCallback(() => {
    onNavigateToEpisode(episodeNumber + 1);
  }, [episodeNumber, onNavigateToEpisode]);

  const handleTimeUpdate = useCallback(() => {
    // Player hook handles time updates via progress timer
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    // handled by player hook
  }, []);

  if (error) {
    return (
      <div className="h-full w-full bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-neutral-400 mb-3">Error al cargar el video</p>
          <button
            onClick={onBack}
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-black flex flex-col ${
        fullscreen ? 'fixed inset-0 z-50' : 'h-full w-full'
      }`}
    >
      <div className="relative bg-black flex-1 flex items-center justify-center">
        <video
          ref={videoRef}
          className="w-full h-full"
          style={{ maxHeight: '100vh', objectFit: 'contain' }}
          onClick={togglePlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          preload="auto"
          playsInline
        />

        {(!loaded || isLoading) && (
          <PlayerLoadingOverlay visible={!loaded || isLoading} />
        )}

        <PlayerControls
          playing={playing}
          currentTime={currentTime}
          duration={duration}
          loading={isLoading}
          hasPrev={hasPrev}
          hasNext={hasNext}
          onPlayPause={togglePlay}
          onSeek={seek}
          onPrev={handlePrev}
          onNext={handleNext}
          onBack={onBack}
        />
      </div>
    </div>
  );
};
