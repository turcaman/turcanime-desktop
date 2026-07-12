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
          <Skeleton className="h-3 w-32 rounded" />
        </div>
      </div>

      <div className="px-6 pt-4 space-y-4">
        <div>
          <Skeleton className="h-3 w-20 rounded mb-3" />
          <Skeleton className="h-3 w-full rounded mb-2" />
          <Skeleton className="h-3 w-full rounded mb-2" />
          <Skeleton className="h-3 w-3/4 rounded" />
        </div>

        <div>
          <Skeleton className="h-3 w-24 rounded mb-3" />
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-20">
                <Skeleton className="w-full aspect-[2/3] rounded-md mb-1" />
                <Skeleton className="h-2 w-full rounded" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between py-3">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      </div>

      <div className="divide-y divide-neutral-800/40">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-3 px-6 py-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-3 flex-1 rounded" />
            <Skeleton className="w-4 h-4 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};
