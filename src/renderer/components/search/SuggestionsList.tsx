import React from 'react';
import { Film } from 'lucide-react';
import { SOURCE_CONFIG } from '../../config/source';
import type { AutocompleteAnime } from '../../../types';

const TMDB_POSTER_W92 = 'https://image.tmdb.org/t/p/w92';

function resolvePoster(poster: string): string {
  if (!poster) return '';
  if (poster.startsWith('http://') || poster.startsWith('https://')) return poster;
  if (poster.startsWith('/')) return `${TMDB_POSTER_W92}${poster}`;
  return `${SOURCE_CONFIG.baseUrl}/${poster}`;
}

interface SuggestionsListProps {
  suggestions: AutocompleteAnime[];
  onSelect: (anime: AutocompleteAnime) => void;
}

export const SuggestionsList: React.FC<SuggestionsListProps> = ({
  suggestions,
  onSelect,
}) => {
  if (suggestions.length === 0) return null;

  return (
    <div className="px-6 pt-2">
      <div className="divide-y divide-neutral-800/60">
        {suggestions.map((item) => (
          <button
            key={item.slug}
            onClick={() => onSelect(item)}
            className="flex items-center gap-3 py-3 w-full text-left hover:bg-neutral-900/50 rounded-lg px-2 -mx-2 transition-colors"
          >
            <div className="w-10 h-14 rounded-md bg-neutral-800 overflow-hidden flex-shrink-0">
              {item.poster ? (
                <img
                  src={resolvePoster(item.poster)}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-600">
                  <Film className="w-4 h-4" />
                </div>
              )}
            </div>
            <span className="text-sm text-neutral-200 truncate">
              {item.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
