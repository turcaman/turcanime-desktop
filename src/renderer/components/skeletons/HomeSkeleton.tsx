import React from 'react';
import { Skeleton } from '../ui/Skeleton';
import { cardGridStyle } from '../../config/layout';
import { SkeletonCard } from './SkeletonCard';

interface HomeSkeletonProps {
  cardWidth: number;
  columns: number;
}

export const HomeSkeleton: React.FC<HomeSkeletonProps> = ({ cardWidth, columns }) => {
  return (
    <div className="select-none">
      <div className="px-6 pt-6 pb-3 select-none">
        <Skeleton className="h-5 w-32 rounded" />
      </div>
      <div className="flex gap-3 px-6 overflow-x-auto pb-4 scrollbar-none">
        {[0, 1, 2].map((i) => {
          const itemWidth = Math.round(cardWidth * 0.6);
          return (
            <div
              key={i}
              className="flex-shrink-0 rounded-xl overflow-hidden bg-neutral-950"
              style={{ width: itemWidth }}
            >
              <div className="relative w-full" style={{ aspectRatio: `${itemWidth}/${Math.round(itemWidth * 1.5)}` }}>
                <Skeleton className="absolute inset-0 rounded-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/0" />
                <div className="absolute bottom-0 left-0 right-0 px-2 pb-2 pt-6">
                  <Skeleton className="h-[14px] w-12 rounded mb-0.5" />
                  <Skeleton className="h-[18px] w-full rounded" />
                  <div className="h-1 bg-neutral-800/60 mt-1.5 rounded-full overflow-hidden">
                    <Skeleton className="h-full rounded-full" style={{ width: `${40 + i * 15}%` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-6 pt-6 pb-3 select-none">
        <Skeleton className="h-5 w-32 rounded" />
      </div>
      <div className="px-6">
        <div className="grid" style={cardGridStyle(columns, cardWidth)}>
          {Array.from({ length: columns * 3 }).map((_, idx) => (
            <SkeletonCard key={idx} cardWidth={cardWidth} />
          ))}
        </div>
      </div>
    </div>
  );
};