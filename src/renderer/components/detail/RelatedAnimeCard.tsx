import React from 'react';

interface RelatedAnimeCardProps {
  name: string;
  poster: string;
  label: string | null;
  onPress: () => void;
}

export const RelatedAnimeCard: React.FC<RelatedAnimeCardProps> = ({
  name,
  poster,
  label,
  onPress,
}) => {
  return (
    <button
      onClick={onPress}
      className="flex-shrink-0 w-24 text-left group"
    >
      <div className="relative w-full aspect-[2/3] bg-neutral-800 rounded-md overflow-hidden mb-1 border border-neutral-800/70 group-hover:border-neutral-700/60 transition-colors">
        {poster && (
          <img
            src={poster}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        {label && (
          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-purple-500 rounded text-[8px] text-white font-bold uppercase">
            {label}
          </div>
        )}
      </div>
      <p className="text-[10px] text-neutral-300 line-clamp-2 leading-tight min-h-[25px] group-hover:text-neutral-100 transition-colors">
        {name}
      </p>
    </button>
  );
};
