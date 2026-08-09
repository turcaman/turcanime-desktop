import React from 'react';

interface AnimeCardProps {
  title: string;
  image: string;
  width: number;
  onPress?: () => void;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({
  title,
  image,
  width,
  onPress,
}) => {
  const height = width * 1.4;

  return (
    <button
      onClick={onPress}
      className="group flex-shrink-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f11] rounded-xl overflow-hidden"
      style={{ width }}
    >
      <div
        className="relative bg-neutral-800 rounded-xl overflow-hidden mb-3 border border-neutral-800/70 group-hover:border-neutral-700/60 transition-colors duration-300"
        style={{ height }}
      >
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/0" />
        <div className="absolute inset-0 bg-neutral-100/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </div>
      <p className="text-sm text-neutral-300 group-hover:text-neutral-100 line-clamp-2 leading-snug h-10 transition-colors duration-200">
        {title}
      </p>
    </button>
  );
};