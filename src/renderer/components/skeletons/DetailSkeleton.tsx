import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';

interface DetailSkeletonProps {
  onBack?: () => void;
}

export const DetailSkeleton: React.FC<DetailSkeletonProps> = ({ onBack }) => {
  return (
    <div>
      <div
        className="relative w-full bg-neutral-900 overflow-hidden"
        style={{ height: '38vh', minHeight: 260 }}
      >
        <Skeleton className="absolute inset-0 rounded-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f11] via-[#0f0f11]/50 to-60%" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/30" />

        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 active:scale-95 transition-all z-10"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
            <Skeleton className="h-3 w-16 rounded-full" />
          </div>
          <Skeleton className="h-6 w-48 rounded mb-2" />
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-4 w-20 rounded-full" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
        </div>
      </div>

      <div className="px-6 pt-4">
        <div className="mb-5">
          <Skeleton className="h-5 w-16 rounded mb-3" />
          <div className="space-y-0.5">
            <Skeleton className="h-[20px] w-full rounded" />
            <Skeleton className="h-[20px] w-full rounded" />
            <Skeleton className="h-[20px] w-3/4 rounded" />
          </div>
        </div>

        <div className="mb-5">
          <Skeleton className="h-5 w-24 rounded mb-3" />
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-shrink-0 w-24">
                <div className="relative w-full aspect-[2/3] bg-neutral-800 rounded-md overflow-hidden mb-1">
                  <Skeleton className="absolute inset-0 rounded-none" />
                </div>
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
        <Skeleton className="h-5 w-32 rounded" />
        <Skeleton className="w-4 h-4 rounded" />
      </div>

      <div className="flex gap-2 px-6 py-3 overflow-x-auto scrollbar-none">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-7 w-16 rounded-md flex-shrink-0" />
        ))}
      </div>

      <div className="px-6 pt-3 pb-6 flex flex-col gap-1.5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-neutral-800/30 bg-neutral-900/40">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-neutral-700 flex-shrink-0">
              <Skeleton className="h-3 w-3 rounded-full" />
            </span>
            <div className="flex-1 min-w-0">
              <Skeleton className="h-4 w-24 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
