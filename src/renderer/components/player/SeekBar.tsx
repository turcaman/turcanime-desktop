import React, { useEffect, useState } from 'react';
import { TimeDisplay } from './TimeDisplay';

interface SeekBarProps {
  currentTime: number;
  duration: number;
  loading: boolean;
  onSeek: (time: number) => void;
  // Keep the controls' auto-hide timer alive while interacting.
  onInteractStart: () => void;
  onInteractEnd: () => void;
}

// Slider + time labels. Owns the local "sliding" state so dragging does not
// fight the media time updates: while dragging or right after a seek, the
// slider shows the user's value until the video catches up.
export const SeekBar: React.FC<SeekBarProps> = ({
  currentTime,
  duration,
  loading,
  onSeek,
  onInteractStart,
  onInteractEnd,
}) => {
  const [slidingValue, setSlidingValue] = useState<number | null>(null);
  const [pendingSeek, setPendingSeek] = useState<number | null>(null);

  const displayTime = slidingValue ?? pendingSeek ?? currentTime;
  const isSliding = slidingValue != null;

  useEffect(() => {
    if (pendingSeek != null && Math.abs(currentTime - pendingSeek) < 1) {
      setPendingSeek(null);
    }
  }, [currentTime, pendingSeek]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onInteractStart();
    setSlidingValue(Number(e.target.value));
  };

  const handleSliderEnd = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    const value = Number((e.target as HTMLInputElement).value);
    if (loading) return;
    onSeek(value);
    setPendingSeek(value);
    setSlidingValue(null);
    onInteractEnd();
  };

  const progress = duration > 0 ? (displayTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2">
      <TimeDisplay
        seconds={displayTime}
        className={`text-right ${isSliding ? 'text-purple-400' : 'text-white/80'}`}
      />
      <input
        type="range"
        min={0}
        max={duration > 0 ? duration : 1}
        value={displayTime}
        onMouseDown={onInteractStart}
        onTouchStart={onInteractStart}
        onChange={handleSliderChange}
        onMouseUp={handleSliderEnd}
        onTouchEnd={handleSliderEnd}
        className="flex-1 h-1 appearance-none bg-white/20 rounded-full cursor-default
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-400
          [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-purple-500/40
          hover:h-1.5 transition-all duration-150"
        style={{
          background: `linear-gradient(to right, rgb(168,85,247) ${progress}%, rgba(255,255,255,0.15) ${progress}%)`,
        }}
      />
      <TimeDisplay seconds={duration} className="text-white/80" />
    </div>
  );
};
