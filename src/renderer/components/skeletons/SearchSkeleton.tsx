import React from 'react';
import { Skeleton } from '../ui/Skeleton';
import { calcColumns, LAYOUT_CONFIG } from '../../config/layout';

interface SearchSkeletonProps {
  cardWidth: number;
  containerWidth: number;
  rows?: number;
}

export const SearchSkeleton: React.FC<SearchSkeletonProps> = ({
  cardWidth,
  containerWidth,
  rows = 5,
}) => {
  const columns = calcColumns(containerWidth);

  return (
    <div className="px-6 pt-3">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, ${cardWidth}px)`,
          gap: `${LAYOUT_CONFIG.cardGap}px`,
          justifyContent: 'center',
        }}
      >
        {Array.from({ length: rows * columns }).map((_, idx) => (
          <div key={idx} className="flex-shrink-0 text-left rounded-xl overflow-hidden active:scale-[0.97] transition-transform duration-150 animate-scale-in"
            style={{ width: cardWidth, animationDelay: `${idx * 50}ms` }}
          >
            <div
              className="relative bg-neutral-800 rounded-xl overflow-hidden mb-3 border border-neutral-800/50"
              style={{ height: cardWidth * 1.4 }}
            >
              <Skeleton className="absolute inset-0 rounded-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/0" />
            </div>
            <div className="flex flex-col gap-1.5 px-0.5">
              <Skeleton className="h-[19px] w-full rounded" />
              <Skeleton className="h-[19px] w-3/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
