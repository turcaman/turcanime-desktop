import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useHomeScreen } from '../hooks/useHomeScreen';
import { ContinueWatching } from '../components/home/ContinueWatching';
import { AnimeGridSection } from '../components/home/AnimeGridSection';
import { HomeSkeleton } from '../components/skeletons/HomeSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { calcCardWidth } from '../config/layout';
import type { Anime, HistoryItem } from '../../types';

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
      {showSkeleton && <HomeSkeleton cardWidth={cardWidth} containerWidth={containerRef.current?.offsetWidth ?? 0} />}

      {showContent && (
        <div>
          {sections.map((section, idx) => {
            if (section.type === 'CONTINUE') {
              return (
                <div key="continue">
                  <ContinueWatching
                    items={section.data}
                    cardWidth={cardWidth}
                    onItemPress={handleHistoryPress}
                  />
                </div>
              );
            }
            return (
              <div key={`section-${idx}`}>
                <AnimeGridSection
                  label={section.title}
                  items={section.data}
                  cardWidth={cardWidth}
                  containerWidth={containerRef.current?.offsetWidth ?? 0}
                  onItemPress={handleAnimePress}
                />
              </div>
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
