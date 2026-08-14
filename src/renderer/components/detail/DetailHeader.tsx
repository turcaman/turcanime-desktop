import React, { useState } from 'react';
import { ChevronLeft, ChevronUp } from 'lucide-react';
import { ImageWithLoader } from '../ui/ImageWithLoader';
import { RelatedAnimeCard } from './RelatedAnimeCard';
import { buildRelationsList } from '../../utils/relations';
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
  // The parser normalizes status to 'En emisión'/'Finalizado'; fall back to
  // 'Finalizado' when the source did not report one.
  const isAiring = /emisi[oó]n/i.test(anime.status ?? '');
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
            style={{
              maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/30" />

        {onBack && (
          <button
            onClick={onBack}
            aria-label="Volver"
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/70"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        )}

        <div className="absolute top-4 right-4 z-10 rounded-lg bg-neutral-950/80 px-2.5 py-1">
          <span className={`text-[11px] font-semibold tracking-wider ${isAiring ? 'text-purple-400' : 'text-neutral-300'}`}>
            {statusLabel.toUpperCase()}
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h1 className="text-xl font-bold text-white leading-tight line-clamp-2 drop-shadow-lg">
            {anime.title}
          </h1>
          {anime.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {anime.genres.slice(0, 4).map((g) => (
                <span
                  key={g}
                  className="text-[10px] font-semibold text-white/80 bg-white/10 rounded-md px-2.5 py-1"
                >
                  {g.toUpperCase()}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 pt-5">
        {anime.synopsis && (
          <div className="mb-5">
            <h3 className="text-[11px] font-medium text-neutral-400 uppercase tracking-[0.14em] mb-3">Sinopsis</h3>
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
              {hasLongSynopsis && !expanded && (
                <span className="text-xs text-neutral-300 hover:text-neutral-100 mt-1 transition-colors block">
                  Leer más
                </span>
              )}
            </button>
          </div>
        )}

        {anime.relations && (anime.relations.prequel.length > 0 || anime.relations.sequel.length > 0 || anime.relations.related.length > 0) && (
          <div className="mb-3">
            <h3 className="text-[11px] font-medium text-neutral-400 uppercase tracking-[0.14em] mb-3">Relacionados</h3>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {buildRelationsList(anime.relations).map((r) => (
                <RelatedAnimeCard
                  key={r.slug}
                  name={r.name}
                  poster={r.poster}
                  label={r.label}
                  onPress={() => onRelatedPress?.(r.slug)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-800/60">
        <h3 className="text-[11px] font-medium text-neutral-400 uppercase tracking-[0.14em]">
          Episodios ({anime.episodes.length})
        </h3>
        <button
          onClick={onToggleSort}
          className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/70"
          aria-label={isAscending ? 'Orden descendente' : 'Orden ascendente'}
        >
          <ChevronUp className={`w-4 h-4 transition-transform ${isAscending ? '' : 'rotate-180'}`} />
        </button>
      </div>
    </div>
  );
};
