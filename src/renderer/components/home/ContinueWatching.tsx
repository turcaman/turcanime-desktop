import React from 'react';
import { SectionTitle } from '../ui/SectionTitle';
import type { HistoryItem } from '../../../types';

interface ContinueWatchingProps {
  items: HistoryItem[];
  cardWidth: number;
  onItemPress?: (item: HistoryItem) => void;
}

export const ContinueWatching: React.FC<ContinueWatchingProps> = ({
  items,
  cardWidth,
  onItemPress,
}) => {
  if (items.length === 0) return null;

  const itemWidth = Math.round(cardWidth * 0.6);

  return (
    <div className="select-none">
      <SectionTitle label="Continuar viendo" />
      <div className="flex gap-3 px-6 overflow-x-auto pb-4 scrollbar-none">
        {items.map((item) => {
          const progress =
            item.duration && item.duration > 0
              ? Math.min((item.progress ?? 0) / item.duration, 1)
              : 0;

          return (
            <button
              key={item.url}
              onClick={() => onItemPress?.(item)}
              className="flex-shrink-0 text-left rounded-xl overflow-hidden bg-neutral-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 border border-neutral-800/50 hover:border-neutral-700/60"
              style={{ width: itemWidth }}
            >
              <div className="relative w-full" style={{ aspectRatio: `${itemWidth}/${Math.round(itemWidth * 1.5)}` }}>
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 pb-2 pt-4">
                  <p className="text-[11px] font-medium text-neutral-300 mb-0.5 leading-tight">
                    Ep. {item.number}
                  </p>
                  <p className="text-sm font-semibold text-white leading-tight truncate">
                    {item.title}
                  </p>
                  <div className="h-1 bg-neutral-800/60 mt-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all duration-300"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
