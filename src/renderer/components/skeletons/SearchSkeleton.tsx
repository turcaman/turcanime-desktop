import React from 'react';
import { Skeleton } from '../ui/Skeleton';

interface SearchSkeletonProps {
  cardWidth: number;
  rows?: number;
}

export const SearchSkeleton: React.FC<SearchSkeletonProps> = ({
  cardWidth,
  rows = 5,
}) => {
  const cardHeight = cardWidth * 1.4;
  const widths = [85, 75, 65, 80, 70, 60, 75, 65, 55, 70, 60, 50, 65, 55, 45];
  const items = Array.from({ length: rows * 3 });

  return (
    <div className="px-6 pt-4">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(3, ${cardWidth}px)`,
          gap: '12px',
        }}
      >
        {items.map((_, idx) => (
          <div key={idx} className="flex flex-col gap-2">
            <Skeleton
              className="rounded-lg"
              style={{ width: cardWidth, height: cardHeight }}
            />
            <Skeleton className="h-3 rounded" style={{ width: `${widths[idx * 2 % widths.length]}%` }} />
            <Skeleton className="h-2 rounded" style={{ width: `${widths[(idx * 2 + 1) % widths.length]}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
};
