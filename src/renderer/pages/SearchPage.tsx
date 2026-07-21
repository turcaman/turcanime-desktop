import React, { useState, useEffect, useRef } from 'react';
import { Search, Frown } from 'lucide-react';
import { useSearchScreen } from '../hooks/useSearchScreen';
import { SearchBar } from '../components/search/SearchBar';
import { RecentSearches } from '../components/search/RecentSearches';
import { SuggestionsList } from '../components/search/SuggestionsList';
import { SearchSkeleton } from '../components/skeletons/SearchSkeleton';
import { AnimeCard } from '../components/AnimeCard';
import { ErrorState } from '../components/ui/ErrorState';
import { calcCardWidth, calcColumns, LAYOUT_CONFIG } from '../config/layout';
import type { Anime, AutocompleteAnime } from '../../types';

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
  };

  const handleSuggestionSelect = (item: AutocompleteAnime) => {
    handleSelectSuggestion(item);
    if (externalNavigateDetail) {
      externalNavigateDetail({ title: item.name, image: item.poster, url: item.slug, status: '' });
    }
  };

  const ContentArea: React.FC = () => {
    if (status === 'searching' || isSearchLoading) {
      return <SearchSkeleton cardWidth={cardWidth} containerWidth={containerRef.current?.offsetWidth ?? 800} />;
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
          <Search className="w-12 h-12 text-neutral-700 mb-4" />
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
            <Frown className="w-12 h-12 text-neutral-700 mb-4" />
            <p className="text-sm text-neutral-500">
              Sin resultados para &quot;{term}&quot;
            </p>
          </div>
        );
      }

      return (
        <div className="px-6 pt-3">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${calcColumns(containerRef.current?.offsetWidth ?? 800)}, ${cardWidth}px)`,
              gap: `${LAYOUT_CONFIG.cardGap}px`,
              justifyContent: 'center',
            }}
          >
            {searchAnimes.map((anime, idx) => (
              <AnimeCard
                key={anime.url}
                title={anime.title}
                image={anime.image}
                url={anime.url}
                width={cardWidth}
                index={idx}
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
