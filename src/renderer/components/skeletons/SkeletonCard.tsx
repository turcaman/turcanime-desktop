import React from 'react';
import { Skeleton } from '../ui/Skeleton';

interface SkeletonCardProps {
  cardWidth: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ cardWidth }) => {
  return (
    <div
      className="flex-shrink-0 text-left rounded-xl overflow-hidden"
      style={{ width: cardWidth }}
    >
      <div
        className="relative bg-neutral-800 rounded-xl overflow-hidden mb-3 border border-neutral-800/50"
        style={{ height: cardWidth * 1.4 }}
      >
        <Skeleton className="absolute inset-0 rounded-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/0" />
      </div>
      <div className="flex flex-col gap-0.5 px-0.5">
        <Skeleton className="h-[19px] w-full rounded" />
        <Skeleton className="h-[19px] w-3/5 rounded" />
      </div>
    </div>
  );
};