import React, { useEffect, useRef } from 'react';
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
  isRestoring,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isRestoring) return;
    if (containerRef.current) {
      const child = containerRef.current.children[activeRangeIdx] as HTMLElement;
      if (child) {
        child.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activeRangeIdx, isRestoring]);

  if (ranges.length <= 1) return null;

  return (
    <div
      ref={containerRef}
      className="flex gap-3 px-6 py-3 overflow-x-auto scrollbar-none"
    >
      {ranges.map((range, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(idx)}
          className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            idx === activeRangeIdx
              ? 'bg-purple-500/15 text-purple-400'
              : 'bg-neutral-900 text-neutral-500 hover:text-neutral-300'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
};
