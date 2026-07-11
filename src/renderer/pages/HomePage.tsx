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

export const HomePage: React.FC = () => {
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
    console.log('[HomePage] Navigate to anime:', anime.url);
  }, []);

  const handleHistoryPress = useCallback((item: HistoryItem) => {
    console.log('[HomePage] Navigate to history item:', item.url);
  }, []);

  const handleRetry = useCallback(() => {
    fetchHome(true);
  }, [fetchHome]);

  const showSkeleton = isLoading && !hasContent && !error;
  const showContent = hasContent && !error;
  const showError = !hasContent && error && !isLoading;

  return (
    <div ref={containerRef} className="h-full w-full bg-[#0f0f11] overflow-y-auto">
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
