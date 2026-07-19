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

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
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
  const [slidingValue, setSlidingValue] = useState<number | null>(null);
  const [pendingSeek, setPendingSeek] = useState<number | null>(null);
  const { restartTimer, clearTimer } = useAutoHide(visible, playing, 3000, () => { setVisible(false); });
  const fadeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (fadeRef.current) {
      fadeRef.current.style.transition = 'opacity 200ms ease';
      fadeRef.current.style.opacity = visible ? '1' : '0';
    }
  }, [visible]);

  useEffect(() => {
    document.documentElement.style.cursor =
      isFullscreen && !visible ? 'none' : '';
    return () => { document.documentElement.style.cursor = ''; };
  }, [isFullscreen, visible]);

  const displayTime = slidingValue ?? pendingSeek ?? currentTime;
  const isSliding = slidingValue != null;

  useEffect(() => {
    if (pendingSeek != null && Math.abs(currentTime - pendingSeek) < 1) {
      setPendingSeek(null);
    }
  }, [currentTime, pendingSeek]);

  const handleMouseMove = useCallback(() => {
    if (!visible) {
      setVisible(true);
    }
    restartTimer();
  }, [visible, restartTimer]);

  const toggle = useCallback(() => {
    setVisible((v) => !v);
    clearTimer();
  }, [clearTimer]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearTimer();
    setSlidingValue(Number(e.target.value));
  };

  const handleSliderEnd = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    const value = Number((e.target as HTMLInputElement).value);
    if (loading) return;
    onSeek(value);
    setPendingSeek(value);
    setSlidingValue(null);
    restartTimer();
  };

  const progress = duration > 0 ? (displayTime / duration) * 100 : 0;

  return (
    <div className="absolute inset-0 z-40" onClick={toggle} onMouseMove={handleMouseMove} onDoubleClick={onToggleFullscreen}>
      <div
        ref={fadeRef}
        className="absolute inset-0"
        style={{ opacity: 1, pointerEvents: visible ? 'auto' : 'none' }}
      >
        <div className="absolute top-0 left-0 right-0 flex items-start px-4 pt-4 z-50 pointer-events-none">
          <button
            onClick={(e) => { e.stopPropagation(); onBack(); }}
            className="pointer-events-auto p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div className="ml-3 flex-1 min-w-0 pointer-events-auto">
            {animeTitle && (
              <p className="text-white font-semibold text-sm truncate drop-shadow-md">{animeTitle}</p>
            )}
            {episodeNumber != null && (
              <p className="text-neutral-300 text-xs drop-shadow-md">Episodio {episodeNumber}</p>
            )}
          </div>
        </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/10" />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center justify-center gap-5" onDoubleClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => { e.stopPropagation(); onPrev(); }}
              disabled={!hasPrev || loading}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30"
            >
              <SkipBack className="w-4 h-4 text-white drop-shadow-sm" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); onSeekBack(); }}
              disabled={loading}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30"
            >
              <RotateCcw className="w-4 h-4 text-white drop-shadow-sm" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); onPlayPause(); }}
              disabled={showLoader}
              className="flex items-center justify-center w-14 h-14 rounded-full bg-white/15 hover:bg-white/25 transition-colors disabled:opacity-70"
            >
              {showLoader ? (
                <Loader2 className="w-5 h-5 text-white drop-shadow-sm animate-spin" />
              ) : playing ? (
                <Pause className="w-5 h-5 text-white drop-shadow-sm ml-0.5" />
              ) : (
                <Play className="w-5 h-5 text-white drop-shadow-sm ml-0.5" />
              )}
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); onSeekForward(); }}
              disabled={loading}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30"
            >
              <RotateCw className="w-4 h-4 text-white drop-shadow-sm" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); onNext(); }}
              disabled={!hasNext || loading}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30"
            >
              <SkipForward className="w-4 h-4 text-white drop-shadow-sm" />
            </button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-5">
          <div className="flex items-center gap-2">
            <span className={`text-xs w-10 text-right tabular-nums drop-shadow-sm ${isSliding ? 'text-purple-400' : 'text-white/80'}`}>
              {formatTime(displayTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration > 0 ? duration : 1}
              value={displayTime}
              onMouseDown={() => clearTimer()}
              onTouchStart={() => clearTimer()}
              onChange={handleSliderChange}
              onMouseUp={handleSliderEnd}
              onTouchEnd={handleSliderEnd}
              className="flex-1 h-0.5 appearance-none bg-white/20 rounded-full cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-400
                [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-purple-500/40
                hover:h-1 transition-all duration-150"
              style={{
                background: `linear-gradient(to right, rgb(168,85,247) ${progress}%, rgba(255,255,255,0.2) ${progress}%)`,
              }}
            />
            <span className="text-xs text-white/70 w-10 tabular-nums drop-shadow-sm">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
