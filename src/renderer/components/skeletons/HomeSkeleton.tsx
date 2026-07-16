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
