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
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-shrink-0" style={{ width: Math.round(cardWidth * 0.6) }}>
            <Skeleton className="rounded-lg mb-1.5" style={{ height: Math.round(cardWidth * 0.6 * 1.5) }} />
            <Skeleton className="h-3 w-full rounded" />
          </div>
        ))}
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
    </div>
  );
};
