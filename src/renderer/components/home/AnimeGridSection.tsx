import React from 'react';
import { AnimeCard } from '../AnimeCard';
import { SectionTitle } from '../ui/SectionTitle';
import { cardGridStyle } from '../../config/layout';
import type { Anime } from '../../../types';

interface AnimeGridSectionProps {
  label: string;
  items: Anime[];
  cardWidth: number;
  columns: number;
  onItemPress?: (anime: Anime) => void;
}

export const AnimeGridSection: React.FC<AnimeGridSectionProps> = ({
  label,
  items,
  cardWidth,
  columns,
  onItemPress,
}) => {
  if (items.length === 0) return null;

  return (
    <div className="select-none">
      <SectionTitle label={label} />
      <div className="px-6">
        <div className="grid" style={cardGridStyle(columns, cardWidth)}>
          {items.map((anime) => (
            <AnimeCard
              key={anime.slug}
              title={anime.title}
              image={anime.image}
              width={cardWidth}
              onPress={() => onItemPress?.(anime)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};