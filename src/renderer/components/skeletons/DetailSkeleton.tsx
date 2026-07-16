import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export const DetailSkeleton: React.FC = () => {
  return (
    <div>
      <div
        className="relative w-full bg-neutral-900"
        style={{ height: '38vh', minHeight: 260 }}
      >
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <Skeleton className="h-3 w-16 rounded-full mb-3" />
          <Skeleton className="h-5 w-48 rounded mb-2" />
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-4 w-20 rounded-full" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
        </div>
      </div>

      <div className="px-6 pt-4 space-y-4">
        <div>
          <Skeleton className="h-3 w-20 rounded mb-2" />
          <div className="space-y-0.5">
            <Skeleton className="h-[23px] w-full rounded" />
            <Skeleton className="h-[23px] w-full rounded" />
            <Skeleton className="h-[23px] w-3/4 rounded" />
          </div>
        </div>

        <div>
          <Skeleton className="h-3 w-24 rounded mb-2" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-24">
                <Skeleton className="w-full aspect-[2/3] rounded-md mb-1" />
                <div className="space-y-0.5">
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-3 w-3/4 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-800/60">
        <Skeleton className="h-4 w-32 rounded" />
        <Skeleton className="h-3 w-20 rounded" />
      </div>

      <div className="flex gap-3 px-6 py-3 overflow-x-auto scrollbar-none">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-7 w-16 rounded-lg flex-shrink-0" />
        ))}
      </div>

      <div>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-3 px-6 py-3 border-b border-neutral-800/40">
            <Skeleton className="h-3 flex-1 rounded" />
            <Skeleton className="w-4 h-4 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};
