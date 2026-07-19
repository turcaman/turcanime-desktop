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
        <div className="flex items-center gap-2">
          <span className="w-0.5 h-3 bg-purple-500 rounded-full flex-shrink-0" />
          <h2 className="text-sm font-semibold text-neutral-300">
            Búsquedas recientes
          </h2>
        </div>
        {onClearAll && (
          <button
            onClick={onClearAll}
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      {searches.map((term) => (
        <div
          key={term}
          className="flex items-center gap-3 py-2.5 group -mx-2 px-2 rounded-lg hover:bg-neutral-900/50 transition-colors"
        >
          <button
            onClick={() => onSelect(term)}
            className="flex items-center gap-3 flex-1 min-w-0 text-left"
          >
            <Clock className="w-4 h-4 text-neutral-500 flex-shrink-0" />
            <span className="text-sm text-neutral-400 truncate group-hover:text-neutral-300 transition-colors">
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
  );
};
