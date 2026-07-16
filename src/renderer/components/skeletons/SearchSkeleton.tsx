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
    <div className="px-6 pt-4">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, ${cardWidth}px)`,
          gap: `${LAYOUT_CONFIG.cardGap}px`,
          justifyContent: 'center',
        }}
      >
        {Array.from({ length: rows * columns }).map((_, idx) => (
          <div key={idx} className="flex flex-col">
            <Skeleton
              className="rounded-xl mb-2.5"
              style={{ width: cardWidth, height: cardWidth * 1.4 }}
            />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-3/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
