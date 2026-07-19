import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', style }) => {
  return (
    <div
      className={`bg-neutral-800 rounded overflow-hidden ${className}`}
      style={style}
    >
      <div className="w-full h-full animate-shimmer" />
    </div>
  );
};
