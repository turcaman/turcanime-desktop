import React from 'react';
import { cardGridStyle } from '../../config/layout';
import { SkeletonCard } from './SkeletonCard';

interface SearchSkeletonProps {
  cardWidth: number;
  columns: number;
  rows?: number;
}

export const SearchSkeleton: React.FC<SearchSkeletonProps> = ({
  cardWidth,
  columns,
  rows = 5,
}) => {
  return (
    <div className="px-6 pt-3">
      <div
        className="grid"
        style={{ ...cardGridStyle(columns, cardWidth), justifyContent: 'center' }}
      >
        {Array.from({ length: rows * columns }).map((_, idx) => (
          <SkeletonCard key={idx} cardWidth={cardWidth} />
        ))}
      </div>
    </div>
  );
};