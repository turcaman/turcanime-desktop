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
    offline,
    hasPrev,
    hasNext,
    togglePlay,
    seek,
    navigatePrev,
    navigateNext,
  } = usePlayer(slug, episodeNumber, activeAnime, videoRef, onNavigateToEpisode);

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

  const handleTimeUpdate = useCallback(() => {}, []);
  const handleLoadedMetadata = useCallback(() => {}, []);

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

        {/* Error overlay at bottom */}
        {error && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-red-500/15 backdrop-blur-sm border border-red-500/20 rounded-lg">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
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

        {/* Offline overlay at bottom */}
        {offline && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-yellow-500/15 backdrop-blur-sm border border-yellow-500/20 rounded-lg">
              <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 4.243a1 1 0 010-1.414" />
              </svg>
              <span className="text-sm text-yellow-200">Sin conexión — el video se reanudará cuando haya red</span>
            </div>
          </div>
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
          onPrev={navigatePrev}
          onNext={navigateNext}
          onBack={onBack}
        />
      </div>
    </div>
  );
};
