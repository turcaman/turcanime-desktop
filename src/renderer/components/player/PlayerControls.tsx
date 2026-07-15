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
  Maximize,
  Minimize,
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
  containerRef: React.RefObject<HTMLDivElement | null>;
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
  containerRef,
}) => {
  const [visible, setVisible] = useState(true);
  const showLoader = loading || buffering;
  const [slidingValue, setSlidingValue] = useState<number | null>(null);
  const [pendingSeek, setPendingSeek] = useState<number | null>(null);
  const { restartTimer, clearTimer } = useAutoHide(visible, playing, 3000, () => { setVisible(false); });
  const fadeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.cursor = isFullscreen && !visible ? 'none' : '';
    return () => { el.style.cursor = ''; };
  }, [isFullscreen, visible, containerRef]);

  useEffect(() => {
    if (fadeRef.current) {
      fadeRef.current.style.transition = 'opacity 200ms ease';
      fadeRef.current.style.opacity = visible ? '1' : '0';
    }
  }, [visible]);

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

  const btnClass = 'flex items-center justify-center w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30';

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
              <p className="text-white font-semibold text-sm truncate">{animeTitle}</p>
            )}
            {episodeNumber != null && (
              <p className="text-neutral-400 text-xs">Episodio {episodeNumber}</p>
            )}
          </div>
        </div>

        <div className="absolute inset-0 bg-black/40" />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center justify-center gap-6" onDoubleClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => { e.stopPropagation(); onPrev(); }}
              disabled={!hasPrev || loading}
              className={`${btnClass} disabled:opacity-30`}
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); onSeekBack(); }}
              disabled={loading}
              className={`${btnClass} disabled:opacity-30`}
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); onPlayPause(); }}
              disabled={showLoader}
              className={`${btnClass} w-16 h-16 disabled:opacity-70`}
            >
              {showLoader ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : playing ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); onSeekForward(); }}
              disabled={loading}
              className={`${btnClass} disabled:opacity-30`}
            >
              <RotateCw className="w-5 h-5" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); onNext(); }}
              disabled={!hasNext || loading}
              className={`${btnClass} disabled:opacity-30`}
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-6">
          <div className="flex items-center gap-2">
            <span className={`text-xs w-10 text-right tabular-nums ${isSliding ? 'text-purple-400' : 'text-white/70'}`}>
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
              className="flex-1 h-1 appearance-none bg-white/20 rounded-full cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-400
                [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-purple-500/30"
              style={{
                background: `linear-gradient(to right, rgb(168,85,247) ${progress}%, rgba(255,255,255,0.2) ${progress}%)`,
              }}
            />
            <span className="text-xs text-white/70 w-10 tabular-nums">
              {formatTime(duration)}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFullscreen(); }}
              className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-white/70 hover:text-white"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
