import React, { useMemo } from 'react';
import { AnimeCard } from '../AnimeCard';
import { SectionTitle } from '../ui/SectionTitle';
import type { Anime } from '../../../types';

interface AnimeGridSectionProps {
  label: string;
  items: Anime[];
  cardWidth: number;
  onItemPress?: (anime: Anime) => void;
}

export const AnimeGridSection: React.FC<AnimeGridSectionProps> = ({
  label,
  items,
  cardWidth,
  onItemPress,
}) => {
  const rows = useMemo(() => {
    const result: Anime[][] = [];
    for (let i = 0; i < items.length; i += 3) {
      result.push(items.slice(i, i + 3));
    }
    return result;
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="select-none">
      <SectionTitle label={label} />
      <div className="px-6 flex flex-col gap-3">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-3">
            {row.map((anime) => (
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
        ))}
      </div>
    </div>
  );
};
