import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Play,
  Pause,
  Loader2,
} from 'lucide-react';
import { useAutoHide } from '../../hooks/useAutoHide';
import { SeekBar } from './SeekBar';

interface PlayerControlsProps {
  playing: boolean;
  buffering: boolean;
  currentTime: number;
  duration: number;
  loading: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  isFullscreen: boolean;
  animeTitle?: string;
  episodeNumber?: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSeekBack: () => void;
  onSeekForward: () => void;
  onPrev: () => void;
  onNext: () => void;
  onBack: () => void;
  onToggleFullscreen: () => void;
}

interface PlayerIconButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  size?: 'sm' | 'lg';
  children: React.ReactNode;
}

function PlayerIconButton({ onClick, disabled, size = 'sm', children }: PlayerIconButtonProps) {
  const sizeClass =
    size === 'lg'
      ? 'w-14 h-14 bg-white/15 hover:bg-white/25 disabled:opacity-70'
      : 'w-10 h-10 bg-white/10 hover:bg-white/20 disabled:opacity-30';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center rounded-full transition-colors cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${sizeClass}`}
    >
      {children}
    </button>
  );
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  playing,
  buffering,
  currentTime,
  duration,
  loading,
  hasPrev,
  hasNext,
  isFullscreen,
  animeTitle,
  episodeNumber,
  onPlayPause,
  onSeek,
  onSeekBack,
  onSeekForward,
  onPrev,
  onNext,
  onBack,
  onToggleFullscreen,
}) => {
  const [visible, setVisible] = useState(true);
  const showLoader = loading || buffering;
  const { restartTimer, clearTimer } = useAutoHide(visible, playing, 3000, () => { setVisible(false); });
  const fadeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (fadeRef.current) {
      fadeRef.current.style.transition = 'opacity 250ms ease';
      fadeRef.current.style.opacity = visible ? '1' : '0';
    }
  }, [visible]);

  useEffect(() => {
    document.documentElement.style.cursor =
      isFullscreen && !visible ? 'none' : '';
    return () => { document.documentElement.style.cursor = ''; };
  }, [isFullscreen, visible]);

  const handleMouseMove = useCallback(() => {
    if (!visible) setVisible(true);
    restartTimer();
  }, [visible, restartTimer]);

  const toggle = useCallback(() => {
    setVisible((v) => !v);
    clearTimer();
  }, [clearTimer]);

  return (
    <div
      className="absolute inset-0 z-40"
      onClick={toggle}
      onDoubleClick={onToggleFullscreen}
      onMouseMove={handleMouseMove}
    >
      <div
        ref={fadeRef}
        className="absolute inset-0"
        style={{
          opacity: 1,
          pointerEvents: visible ? 'auto' : 'none',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/10" />

        <div className="absolute top-0 left-0 right-0 flex items-start px-4 pt-4 z-50 pointer-events-none">
          <button
            onClick={(e) => { e.stopPropagation(); onBack(); }}
            className="pointer-events-auto p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <ChevronLeft className="w-6 h-6 text-white drop-shadow-lg" />
          </button>
          <div className="ml-3 flex-1 min-w-0 pointer-events-auto">
            {animeTitle && (
              <p className="text-white font-semibold text-sm truncate drop-shadow-lg">{animeTitle}</p>
            )}
            {episodeNumber != null && (
              <p className="text-neutral-200 text-xs drop-shadow-lg">Episodio {episodeNumber}</p>
            )}
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center justify-center gap-5" onDoubleClick={(e) => e.stopPropagation()}>
            <PlayerIconButton
              onClick={(e) => { e.stopPropagation(); onPrev(); }}
              disabled={!hasPrev || loading}
            >
              <SkipBack className="w-4 h-4 text-white drop-shadow-sm" />
            </PlayerIconButton>

            <PlayerIconButton
              onClick={(e) => { e.stopPropagation(); onSeekBack(); }}
              disabled={loading}
            >
              <RotateCcw className="w-4 h-4 text-white drop-shadow-sm" />
            </PlayerIconButton>

            <PlayerIconButton
              onClick={(e) => { e.stopPropagation(); onPlayPause(); }}
              disabled={showLoader}
              size="lg"
            >
              {showLoader ? (
                <Loader2 className="w-5 h-5 text-white drop-shadow-sm animate-spin" />
              ) : playing ? (
                <Pause className="w-5 h-5 text-white drop-shadow-sm ml-0.5" />
              ) : (
                <Play className="w-5 h-5 text-white drop-shadow-sm ml-0.5" />
              )}
            </PlayerIconButton>

            <PlayerIconButton
              onClick={(e) => { e.stopPropagation(); onSeekForward(); }}
              disabled={loading}
            >
              <RotateCw className="w-4 h-4 text-white drop-shadow-sm" />
            </PlayerIconButton>

            <PlayerIconButton
              onClick={(e) => { e.stopPropagation(); onNext(); }}
              disabled={!hasNext || loading}
            >
              <SkipForward className="w-4 h-4 text-white drop-shadow-sm" />
            </PlayerIconButton>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <SeekBar
            currentTime={currentTime}
            duration={duration}
            loading={loading}
            onSeek={onSeek}
            onInteractStart={clearTimer}
            onInteractEnd={restartTimer}
          />
        </div>
      </div>
    </div>
  );
};
