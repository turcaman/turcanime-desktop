import React from 'react';
import { SectionTitle } from '../ui/SectionTitle';
import type { HistoryItem } from '../../../types';

interface ContinueWatchingProps {
  items: HistoryItem[];
  onItemPress?: (item: HistoryItem) => void;
}

export const ContinueWatching: React.FC<ContinueWatchingProps> = ({
  items,
  onItemPress,
}) => {
  if (items.length === 0) return null;

  return (
    <div className="select-none">
      <SectionTitle label="Continuar viendo" />
      <div className="flex gap-3 px-6 overflow-x-auto pb-2 scrollbar-none">
        {items.map((item) => {
          const progress =
            item.duration > 0
              ? Math.min(item.progress / item.duration, 1)
              : 0;

          return (
            <button
              key={item.url}
              onClick={() => onItemPress?.(item)}
              className="flex-shrink-0 w-36 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-lg overflow-hidden"
            >
              <div className="relative bg-neutral-800 rounded-lg overflow-hidden mb-1.5 h-28">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-700">
                  <div
                    className="h-full bg-purple-500 transition-all"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/80 rounded text-[10px] text-neutral-200 font-medium">
                  Ep. {item.number}
                </div>
              </div>
              <p className="text-xs text-neutral-300 line-clamp-2 leading-tight">
                {item.title}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
