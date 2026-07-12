import React from 'react';
import { Clock, X } from 'lucide-react';

interface RecentSearchesProps {
  searches: string[];
  onSelect: (term: string) => void;
  onRemove: (term: string) => void;
  onClearAll?: () => void;
}

export const RecentSearches: React.FC<RecentSearchesProps> = ({
  searches,
  onSelect,
  onRemove,
  onClearAll,
}) => {
  if (searches.length === 0) return null;

  return (
    <div className="px-6 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-neutral-300">
          Búsquedas recientes
        </h2>
        {onClearAll && (
          <button
            onClick={onClearAll}
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="divide-y divide-neutral-800/60">
        {searches.map((term) => (
          <div
            key={term}
            className="flex items-center gap-3 py-3 group"
          >
            <button
              onClick={() => onSelect(term)}
              className="flex items-center gap-3 flex-1 min-w-0 text-left"
            >
              <Clock className="w-4 h-4 text-neutral-500 flex-shrink-0" />
              <span className="text-sm text-neutral-400 truncate">
                {term}
              </span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(term);
              }}
              className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-neutral-800 transition-all"
              aria-label={`Eliminar ${term}`}
            >
              <X className="w-3.5 h-3.5 text-neutral-500" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
