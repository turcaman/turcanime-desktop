import React, { useCallback, useRef } from 'react';
import type { EpisodeRange } from '../../../types';

interface EpisodeRangeSelectorProps {
  ranges: EpisodeRange[];
  activeRangeIdx: number;
  onSelect: (idx: number) => void;
  isRestoring?: boolean;
}

export const EpisodeRangeSelector: React.FC<EpisodeRangeSelectorProps> = ({
  ranges,
  activeRangeIdx,
  onSelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback((idx: number) => {
    onSelect(idx);
    if (containerRef.current) {
      const child = containerRef.current.children[idx] as HTMLElement;
      if (child) {
        child.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [onSelect]);

  if (ranges.length <= 1) return null;

  return (
    <div
      ref={containerRef}
      className="flex gap-2 overflow-x-auto scrollbar-none"
    >
      {ranges.map((range, idx) => (
        <button
          key={idx}
          onClick={() => handleClick(idx)}
          className={`flex-shrink-0 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
            idx === activeRangeIdx
              ? 'bg-purple-500/15 text-purple-400'
              : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
};
