import React from 'react';
import { Skeleton } from '../ui/Skeleton';
import { calcColumns, LAYOUT_CONFIG } from '../../config/layout';

interface HomeSkeletonProps {
  cardWidth: number;
  containerWidth: number;
}

export const HomeSkeleton: React.FC<HomeSkeletonProps> = ({ cardWidth, containerWidth }) => {
  const columns = calcColumns(containerWidth);

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
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${columns}, ${cardWidth}px)`,
            gap: `${LAYOUT_CONFIG.cardGap}px`,
          }}
        >
          {Array.from({ length: columns * 3 }).map((_, idx) => (
            <div key={idx} className="flex-shrink-0 text-left rounded-xl overflow-hidden active:scale-[0.97] transition-transform duration-150"
              style={{ width: cardWidth }}
            >
              <div
                className="relative bg-neutral-800 rounded-xl overflow-hidden mb-3 border border-neutral-800/50"
                style={{ height: cardWidth * 1.4 }}
              >
                <Skeleton className="absolute inset-0 rounded-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/0" />
              </div>
              <div className="flex flex-col gap-0.5 px-0.5">
                <Skeleton className="h-[19px] w-full rounded" />
                <Skeleton className="h-[19px] w-3/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
