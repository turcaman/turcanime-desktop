import React from 'react';
import { AnimeCard } from '../AnimeCard';
import { SectionTitle } from '../ui/SectionTitle';
import { calcColumns, LAYOUT_CONFIG } from '../../config/layout';
import type { Anime } from '../../../types';

interface AnimeGridSectionProps {
  label: string;
  items: Anime[];
  cardWidth: number;
  containerWidth: number;
  onItemPress?: (anime: Anime) => void;
}

export const AnimeGridSection: React.FC<AnimeGridSectionProps> = ({
  label,
  items,
  cardWidth,
  containerWidth,
  onItemPress,
}) => {
  const columns = calcColumns(containerWidth);

  if (items.length === 0) return null;

  return (
    <div className="select-none">
      <SectionTitle label={label} />
      <div className="px-5">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${columns}, ${cardWidth}px)`,
            gap: `${LAYOUT_CONFIG.cardGap}px`,
          }}
        >
          {items.map((anime) => (
            <AnimeCard
              key={anime.url}
              title={anime.title}
              image={anime.image}
              url={anime.url}
              width={cardWidth}
              onPress={() => onItemPress?.(anime)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
