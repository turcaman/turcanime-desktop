import React from 'react';
import { Skeleton } from '../ui/Skeleton';
import { SectionTitle } from '../ui/SectionTitle';
import { calcColumns, LAYOUT_CONFIG } from '../../config/layout';

interface HomeSkeletonProps {
  cardWidth: number;
  containerWidth: number;
}

export const HomeSkeleton: React.FC<HomeSkeletonProps> = ({ cardWidth, containerWidth }) => {
  const columns = calcColumns(containerWidth);

  return (
    <div className="select-none">
      <SectionTitle label="Continuar viendo" />
      <div className="flex gap-3 px-5 overflow-x-auto pb-4 scrollbar-none">
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
                <div className="absolute bottom-0 left-0 right-0 bg-neutral-950/80 px-2 pb-2 pt-1.5">
                  <Skeleton className="h-[14px] w-12 rounded mb-0.5" />
                  <Skeleton className="h-[18px] w-full rounded" />
                  <Skeleton className="h-0.5 w-full rounded mt-1" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <SectionTitle label="&nbsp;" />
      <div className="px-5">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${columns}, ${cardWidth}px)`,
            gap: `${LAYOUT_CONFIG.cardGap}px`,
          }}
        >
          {Array.from({ length: columns * 3 }).map((_, idx) => (
            <div key={idx} className="flex flex-col">
              <Skeleton
                className="rounded-xl mb-2.5"
                style={{ width: cardWidth, height: cardWidth * 1.4 }}
              />
              <div className="flex flex-col gap-0.5">
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
