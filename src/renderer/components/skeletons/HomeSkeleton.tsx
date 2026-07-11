import React from 'react';
import { Skeleton } from '../ui/Skeleton';

interface HomeSkeletonProps {
  cardWidth: number;
}

export const HomeSkeleton: React.FC<HomeSkeletonProps> = ({ cardWidth }) => {
  return (
    <div className="p-6 select-none">
      {/* Continue Watching skeleton */}
      <Skeleton className="h-5 w-40 mb-4" />
      <div className="flex gap-3 mb-8">
        {[0, 1].map((i) => (
          <div key={i} className="flex-shrink-0" style={{ width: 144 }}>
            <Skeleton className="rounded-lg mb-1.5" style={{ height: 112 }} />
            <Skeleton className="h-3 w-full rounded" />
          </div>
        ))}
      </div>

      {/* Grid skeleton */}
      <Skeleton className="h-5 w-36 mb-4" />
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex gap-3 mb-3">
          {[0, 1, 2].map((col) => (
            <div key={col} style={{ width: cardWidth }}>
              <Skeleton
                className="rounded-lg mb-1.5"
                style={{ height: cardWidth * 1.4 }}
              />
              <Skeleton className="h-3 w-full rounded" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
