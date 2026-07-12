import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useHomeScreen } from '../hooks/useHomeScreen';
import { ContinueWatching } from '../components/home/ContinueWatching';
import { AnimeGridSection } from '../components/home/AnimeGridSection';
import { HomeSkeleton } from '../components/skeletons/HomeSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import type { Anime, HistoryItem } from '../../types';

const CARD_GAP = 12;
const SIDE_PADDING = 48;
const CARD_COLUMNS = 3;

function calcCardWidth(containerWidth: number): number {
  const availableWidth = containerWidth - SIDE_PADDING;
  const totalGaps = CARD_GAP * (CARD_COLUMNS - 1);
  return Math.floor((availableWidth - totalGaps) / CARD_COLUMNS);
}

interface HomePageProps {
  onAnimePress?: (anime: Anime) => void;
  onHistoryPress?: (item: HistoryItem) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onAnimePress: externalAnimePress,
  onHistoryPress: externalHistoryPress,
}) => {
  const { sections, isLoading, error, fetchHome, hasContent } = useHomeScreen();
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

  const handleAnimePress = useCallback((anime: Anime) => {
    externalAnimePress?.(anime);
  }, [externalAnimePress]);

  const handleHistoryPress = useCallback((item: HistoryItem) => {
    externalHistoryPress?.(item);
  }, [externalHistoryPress]);

  const handleRetry = useCallback(() => {
    fetchHome(true);
  }, [fetchHome]);

  const showSkeleton = isLoading && !hasContent && !error;
  const showContent = hasContent && !error;
  const showError = !hasContent && error && !isLoading;

  return (
    <div ref={containerRef} className="h-full w-full bg-[#0f0f11] overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-end px-6 py-2 bg-[#0f0f11]/70 backdrop-blur-sm">
        <button
          onClick={handleRetry}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 bg-neutral-900/80 hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-40"
        >
          <svg
            className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isLoading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {showSkeleton && <HomeSkeleton cardWidth={cardWidth} />}

      {showContent && (
        <div>
          {sections.map((section, idx) => {
            if (section.type === 'CONTINUE') {
              return (
                <ContinueWatching
                  key="continue"
                  items={section.data}
                  onItemPress={handleHistoryPress}
                />
              );
            }
            return (
              <AnimeGridSection
                key={`section-${idx}`}
                label={section.title}
                items={section.data}
                cardWidth={cardWidth}
                onItemPress={handleAnimePress}
              />
            );
          })}

          <div className="h-8" />
        </div>
      )}

      {showError && <ErrorState onRetry={handleRetry} />}

      {!showSkeleton && !showContent && !showError && (
        <div className="flex items-center justify-center h-full text-neutral-500 text-sm select-none">
          Sin datos disponibles
        </div>
      )}
    </div>
  );
};
