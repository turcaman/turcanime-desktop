import React, { useState, useEffect, useRef, useCallback } from 'react';

interface PlayerControlsProps {
  playing: boolean;
  currentTime: number;
  duration: number;
  loading: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onBack: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  playing,
  currentTime,
  duration,
  loading,
  hasPrev,
  hasNext,
  onPlayPause,
  onSeek,
  onPrev,
  onNext,
  onBack,
}) => {
  const [visible, setVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const showControls = useCallback(() => {
    setVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(Number(e.target.value));
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col justify-between"
      onClick={showControls}
    >
      <div
        className={`transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between px-4 pt-2">
          <button
            onClick={(e) => { e.stopPropagation(); onBack(); }}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className={`transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {loading && (
          <div className="flex items-center justify-center py-8">
            <svg className="w-8 h-8 text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        <div className="flex items-center justify-center gap-6 py-4">
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            disabled={!hasPrev}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
            </svg>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onPlayPause(); }}
            className="p-3 rounded-full bg-white/90 hover:bg-white transition-colors"
          >
            {playing ? (
              <svg className="w-7 h-7 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-7 h-7 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            disabled={!hasNext}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
            </svg>
          </button>
        </div>

        <div
          className={`transition-opacity duration-300 ${
            visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="px-4 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/70 w-10 text-right tabular-nums">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={currentTime}
                onChange={handleSliderChange}
                className="flex-1 h-1 appearance-none bg-white/20 rounded-full cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                style={{
                  background: `linear-gradient(to right, rgb(168,85,247) ${progress}%, rgba(255,255,255,0.2) ${progress}%)`,
                }}
              />
              <span className="text-xs text-white/70 w-10 tabular-nums">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
