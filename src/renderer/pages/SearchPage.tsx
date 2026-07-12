import React, { useState, useEffect, useRef } from 'react';
import { useSearchScreen } from '../hooks/useSearchScreen';
import { SearchBar } from '../components/search/SearchBar';
import { RecentSearches } from '../components/search/RecentSearches';
import { SuggestionsList } from '../components/search/SuggestionsList';
import { SearchSkeleton } from '../components/skeletons/SearchSkeleton';
import { AnimeCard } from '../components/AnimeCard';
import { ErrorState } from '../components/ui/ErrorState';
import type { Anime, AutocompleteAnime } from '../../types';

const CARD_GAP = 12;
const SIDE_PADDING = 48;
const CARD_COLUMNS = 3;

function calcCardWidth(containerWidth: number): number {
  const availableWidth = containerWidth - SIDE_PADDING;
  const totalGaps = CARD_GAP * (CARD_COLUMNS - 1);
  return Math.floor((availableWidth - totalGaps) / CARD_COLUMNS);
}

interface SearchPageProps {
  onAnimePress?: (anime: Anime) => void;
  onNavigateDetail?: (anime: Anime) => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  onAnimePress: externalAnimePress,
  onNavigateDetail: externalNavigateDetail,
}) => {
  const {
    term,
    status,
    searchAnimes,
    suggestions,
    recentSearches,
    isSearchLoading,
    error,
    handleTextChange,
    handleSearch,
    retrySearch,
    handleSelectSuggestion,
    handleSelectRecent,
    handleClear,
    removeRecentSearch,
    clearRecentSearches,
  } = useSearchScreen();

  const [cardWidth, setCardWidth] = useState(200);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setCardWidth(calcCardWidth(containerRef.current.offsetWidth));
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleAnimePress = (anime: Anime) => {
    externalAnimePress?.(anime);
    externalNavigateDetail?.(anime);
  };

  const handleSuggestionSelect = (item: AutocompleteAnime) => {
    handleSelectSuggestion(item);
    if (externalNavigateDetail) {
      externalNavigateDetail({ title: item.name, image: item.poster, url: item.slug, status: '' });
    }
  };

  const ContentArea: React.FC = () => {
    if (status === 'searching' || isSearchLoading) {
      return <SearchSkeleton cardWidth={cardWidth} />;
    }

    if (status === 'typing') {
      return (
        <SuggestionsList
          suggestions={suggestions}
          onSelect={handleSuggestionSelect}
        />
      );
    }

    if (status === 'idle') {
      if (recentSearches.length > 0) {
        return (
          <RecentSearches
            searches={recentSearches}
            onSelect={handleSelectRecent}
            onRemove={removeRecentSearch}
            onClearAll={clearRecentSearches}
          />
        );
      }
      return (
        <div className="flex flex-col items-center justify-center pt-20 select-none">
          <svg
            className="w-12 h-12 text-neutral-700 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
            />
          </svg>
          <p className="text-sm text-neutral-500">
            Busca tu anime favorito
          </p>
        </div>
      );
    }

    if (status === 'searched') {
      if (error) {
        return <ErrorState onRetry={retrySearch} />;
      }

      if (searchAnimes.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center pt-20 select-none">
            <svg
              className="w-12 h-12 text-neutral-700 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-neutral-500">
              Sin resultados para &quot;{term}&quot;
            </p>
          </div>
        );
      }

      return (
        <div className="px-6 pt-4">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${CARD_COLUMNS}, ${cardWidth}px)`,
              gap: `${CARD_GAP}px`,
            }}
          >
            {searchAnimes.map((anime) => (
              <AnimeCard
                key={anime.url}
                title={anime.title}
                image={anime.image}
                url={anime.url}
                width={cardWidth}
                onPress={() => handleAnimePress(anime)}
              />
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div ref={containerRef} className="h-full w-full bg-[#0f0f11] overflow-y-auto">
      <SearchBar
        value={term}
        onChangeText={handleTextChange}
        onSubmit={handleSearch}
        onClear={handleClear}
        autoFocus
      />
      <ContentArea />
    </div>
  );
};
