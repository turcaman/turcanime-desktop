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
      className="group flex-shrink-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-xl overflow-hidden active:scale-[0.97] transition-transform duration-150"
      style={{ width }}
    >
      <div
        className="relative bg-neutral-800 rounded-xl overflow-hidden mb-2.5 shadow-lg shadow-black/20 group-hover:shadow-purple-500/10 group-hover:shadow-xl transition-all duration-300"
        style={{ height }}
      >
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-transparent to-black/0 group-hover:from-black/10 transition-colors duration-300" />
        {episodeNumber !== undefined && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-[11px] text-purple-400 font-bold tracking-wide shadow-sm">
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
