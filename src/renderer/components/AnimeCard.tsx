import React from 'react';

interface AnimeCardProps {
  title: string;
  image: string;
  url: string;
  width: number;
  episodeNumber?: number;
  variant?: 'default' | 'continue';
  index?: number;
  onPress?: () => void;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({
  title,
  image,
  width,
  episodeNumber,
  variant = 'default',
  index,
  onPress,
}) => {
  const height = variant === 'continue' ? width * 0.75 : width * 1.4;

  return (
    <button
      onClick={onPress}
      className="group flex-shrink-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-xl overflow-hidden active:scale-[0.97] transition-transform duration-150 animate-scale-in"
      style={{ width, animationDelay: index != null ? `${index * 50}ms` : '0ms' }}
    >
      <div
        className="relative bg-neutral-800 rounded-xl overflow-hidden mb-2.5 border border-transparent group-hover:border-neutral-700/60 transition-all duration-300"
        style={{ height }}
      >
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/0" />
        {episodeNumber !== undefined && (
          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/70 rounded-md text-[11px] text-purple-400 font-semibold tracking-wide">
            Ep. {episodeNumber}
          </div>
        )}
      </div>
      <p className="text-sm text-neutral-300 group-hover:text-neutral-100 line-clamp-2 leading-snug h-10 transition-colors duration-200">
        {title}
      </p>
    </button>
  );
};
