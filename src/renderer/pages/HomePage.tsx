import React, { useCallback, useRef } from 'react';
import { useHomeScreen } from '../hooks/useHomeScreen';
import { useCardLayout } from '../hooks/useCardLayout';
import { ContinueWatching } from '../components/home/ContinueWatching';
import { AnimeGridSection } from '../components/home/AnimeGridSection';
import { HomeSkeleton } from '../components/skeletons/HomeSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import type { Anime, HistoryItem } from '../../types';

interface HomePageProps {
  onAnimePress?: (anime: Anime) => void;
  onHistoryPress?: (item: HistoryItem) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onAnimePress: externalAnimePress,
  onHistoryPress: externalHistoryPress,
}) => {
  const { sections, isLoading, error, fetchHome, hasContent, isEmpty } = useHomeScreen();
  const containerRef = useRef<HTMLDivElement>(null);
  const { cardWidth, columns } = useCardLayout(containerRef);

  const handleRetry = useCallback(() => {
    fetchHome(true);
  }, [fetchHome]);

  const showSkeleton = isLoading && !hasContent && !error;
  const showContent = hasContent && !error;
  const showError = !hasContent && error && !isLoading;
  const showEmpty = isEmpty;

  return (
    <div ref={containerRef} className="h-full w-full bg-[#0f0f11] overflow-y-auto">
      {showSkeleton && <HomeSkeleton cardWidth={cardWidth} columns={columns} />}

      {showContent && (
        <div>
          {sections.map((section, idx) => {
            if (section.type === 'CONTINUE') {
              return (
                <div key="continue">
                  <ContinueWatching
                    items={section.items}
                    cardWidth={cardWidth}
                    onItemPress={externalHistoryPress}
                  />
                </div>
              );
            }
            return (
              <div key={`section-${idx}`}>
                <AnimeGridSection
                  label={section.title}
                  items={section.items}
                  cardWidth={cardWidth}
                  columns={columns}
                  onItemPress={externalAnimePress}
                />
              </div>
            );
          })}

          <div className="h-8" />
        </div>
      )}

      {showError && <ErrorState onRetry={handleRetry} />}

      {showEmpty && (
        <div className="flex items-center justify-center h-full text-neutral-500 text-sm select-none">
          Sin datos disponibles
        </div>
      )}

      {/* Any uncovered state keeps the skeleton, never a blank screen. */}
      {!showSkeleton && !showContent && !showError && !showEmpty && (
        <HomeSkeleton cardWidth={cardWidth} columns={columns} />
      )}
    </div>
  );
};