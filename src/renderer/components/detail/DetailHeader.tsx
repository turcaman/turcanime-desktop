import React, { useState } from 'react';
import { ChevronLeft, ChevronUp } from 'lucide-react';
import { ImageWithLoader } from '../ui/ImageWithLoader';
import type { AnimeDetail } from '../../../types';

interface DetailHeaderProps {
  anime: AnimeDetail;
  isAscending: boolean;
  onToggleSort: () => void;
  onRelatedPress?: (slug: string) => void;
  onBack?: () => void;
}

export const DetailHeader: React.FC<DetailHeaderProps> = ({
  anime,
  isAscending,
  onToggleSort,
  onRelatedPress,
  onBack,
}) => {
  const [expanded, setExpanded] = useState(false);
  const banner = anime.banner || anime.image;
  const hasLongSynopsis = anime.synopsis.length > 200;
  const statusLower = anime.status?.toLowerCase();
  const isAiring = statusLower != null && (statusLower.includes('emisión') || statusLower.includes('emision'));
  const statusLabel = isAiring ? 'En emisión' : 'Finalizado';

  return (
    <div>
      <div
        className="relative w-full bg-neutral-900 overflow-hidden"
        style={{ height: '38vh', minHeight: 260 }}
      >
        {banner && (
          <ImageWithLoader
            src={banner}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f11] via-[#0f0f11]/50 to-60%" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/30" />

        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 active:scale-95 transition-all z-10"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-neutral-300 uppercase">
              <span className={`w-1.5 h-1.5 rounded-full ${isAiring ? 'bg-green-500' : 'bg-neutral-500'}`} />
              {statusLabel}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white leading-tight line-clamp-2 drop-shadow-sm">
            {anime.title}
          </h1>
          {anime.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {anime.genres.slice(0, 4).map((g) => (
                <span
                  key={g}
                  className="text-[10px] text-neutral-300 bg-black/60 px-2 py-0.5 rounded-full border border-white/10"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 pt-5">
        {anime.synopsis && (
          <div className="mb-5">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Sinopsis</h3>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-left w-full"
            >
              <p
                className={`text-sm text-neutral-300 leading-relaxed ${
                  !expanded && hasLongSynopsis ? 'line-clamp-3' : ''
                }`}
              >
                {anime.synopsis}
              </p>
              {hasLongSynopsis && (
                <span className="text-xs text-purple-400 hover:text-purple-300 mt-1 transition-colors block">
                  {expanded ? 'Mostrar menos' : 'Leer más'}
                </span>
              )}
            </button>
          </div>
        )}

        {anime.relations && (anime.relations.prequel.length > 0 || anime.relations.sequel.length > 0 || anime.relations.related.length > 0) && (
          <div className="mb-3">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Relacionados</h3>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {[
                ...anime.relations.prequel.map((r) => ({ ...r, _label: 'Precuela' as const })),
                ...anime.relations.sequel.map((r) => ({ ...r, _label: 'Secuela' as const })),
                ...anime.relations.related.map((r) => ({ ...r, _label: null as string | null })),
              ].map((r) => (
                <button
                  key={r.slug}
                  onClick={() => onRelatedPress?.(r.slug)}
                  className="flex-shrink-0 w-24 text-left group"
                >
                  <div className="relative w-full aspect-[2/3] bg-neutral-800 rounded-md overflow-hidden mb-1 border border-transparent group-hover:border-neutral-700/60 transition-colors">
                    {r.poster && (
                      <img
                        src={r.poster}
                        alt={r.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    )}
                    {r._label && (
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-purple-500/80 rounded text-[8px] text-white font-bold uppercase">
                        {r._label}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-400 line-clamp-2 leading-tight min-h-[25px] group-hover:text-neutral-300 transition-colors">
                    {r.name}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-800/60">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          Episodios ({anime.episodes.length})
        </h3>
        <button
          onClick={onToggleSort}
          className="p-1.5 rounded-md text-purple-400 hover:text-purple-300 hover:bg-neutral-800/50 active:scale-95 transition-all"
          aria-label={isAscending ? 'Orden descendente' : 'Orden ascendente'}
        >
          <ChevronUp className={`w-4 h-4 transition-transform ${isAscending ? '' : 'rotate-180'}`} />
        </button>
      </div>
    </div>
  );
};
