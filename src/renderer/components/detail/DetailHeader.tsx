import React, { useState } from 'react';
import type { AnimeDetail } from '../../../types';

interface DetailHeaderProps {
  anime: AnimeDetail;
  isAscending: boolean;
  onToggleSort: () => void;
}

export const DetailHeader: React.FC<DetailHeaderProps> = ({
  anime,
  isAscending,
  onToggleSort,
}) => {
  const [expanded, setExpanded] = useState(false);
  const banner = anime.banner || anime.image;
  const hasLongSynopsis = anime.synopsis.length > 200;

  return (
    <div>
      <div
        className="relative w-full bg-neutral-900 overflow-hidden"
        style={{ height: '38vh', minHeight: 260 }}
      >
        {banner && (
          <img
            src={banner}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f11] via-[#0f0f11]/60 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                anime.status === 'Finalizado'
                  ? 'bg-green-500/15 text-green-400'
                  : 'bg-yellow-500/15 text-yellow-400'
              }`}
            >
              {anime.status || 'En emisión'}
            </span>
          </div>
          <h1 className="text-lg font-bold text-neutral-100 leading-tight line-clamp-2">
            {anime.title}
          </h1>
          {anime.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {anime.genres.slice(0, 4).map((g) => (
                <span
                  key={g}
                  className="text-[10px] text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded-full"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 pt-4">
        {anime.synopsis && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Sinopsis
            </h3>
            <p
              className={`text-sm text-neutral-300 leading-relaxed ${
                !expanded && hasLongSynopsis ? 'line-clamp-3' : ''
              }`}
            >
              {anime.synopsis}
            </p>
            {hasLongSynopsis && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-purple-400 hover:text-purple-300 mt-1 transition-colors"
              >
                {expanded ? 'Mostrar menos' : 'Leer más'}
              </button>
            )}
          </div>
        )}

        {anime.relations && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Relacionados
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {[
                ...anime.relations.prequel.map((r) => ({ ...r, _label: 'Precuela' as const })),
                ...anime.relations.sequel.map((r) => ({ ...r, _label: 'Secuela' as const })),
                ...anime.relations.related.map((r) => ({ ...r, _label: null as string | null })),
              ].map((r) => (
                <div
                  key={r.slug}
                  className="flex-shrink-0 w-24"
                >
                  <div className="relative w-full aspect-[2/3] bg-neutral-800 rounded-md overflow-hidden mb-1">
                    {r.poster && (
                      <img
                        src={r.poster}
                        alt={r.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                    {r._label && (
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-purple-500/80 rounded text-[8px] text-white font-bold uppercase">
                        {r._label}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-400 line-clamp-2 leading-tight">
                    {r.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-800/60">
        <span className="text-sm font-semibold text-neutral-300">
          Episodios ({anime.episodes.length})
        </span>
        <button
          onClick={onToggleSort}
          className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform ${isAscending ? '' : 'rotate-180'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
          {isAscending ? 'Ascendente' : 'Descendente'}
        </button>
      </div>
    </div>
  );
};
