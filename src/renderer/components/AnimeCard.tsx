import React from 'react';

interface AnimeCardProps {
  title: string;
  image: string;
  url: string;
  width: number;
  episodeNumber?: number;
  variant?: 'default' | 'continue';
  onPress?: () => void;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({
  title,
  image,
  width,
  episodeNumber,
  variant = 'default',
  onPress,
}) => {
  const height = variant === 'continue' ? width * 0.75 : width * 1.4;

  return (
    <button
      onClick={onPress}
      className="flex-shrink-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-lg overflow-hidden"
      style={{ width }}
    >
      <div
        className="relative bg-neutral-800 rounded-lg overflow-hidden mb-1.5"
        style={{ height }}
      >
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {episodeNumber !== undefined && (
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 rounded text-[10px] text-neutral-200 font-medium">
            Ep. {episodeNumber}
          </div>
        )}
      </div>
      <p className="text-xs text-neutral-300 line-clamp-2 leading-tight">
        {title}
      </p>
    </button>
  );
};
