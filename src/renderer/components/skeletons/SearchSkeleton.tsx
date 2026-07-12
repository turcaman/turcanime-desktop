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
          <div key={idx} className="flex flex-col gap-2">
            <Skeleton
              className="rounded-lg"
              style={{ width: cardWidth, height: cardWidth * 1.4 }}
            />
            <Skeleton className="h-3 w-4/5 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};
