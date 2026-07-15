import React from 'react';
import { useAnimeDetail } from '../hooks/useAnimeDetail';
import { useHistoryStore } from '../stores/historyStore';
import { DetailHeader } from '../components/detail/DetailHeader';
import { EpisodeRangeSelector } from '../components/detail/EpisodeRangeSelector';
import { EpisodeItem } from '../components/detail/EpisodeItem';
import { ServerModal } from '../components/detail/ServerModal';
import { DetailSkeleton } from '../components/skeletons/DetailSkeleton';
import { ErrorState } from '../components/ui/ErrorState';

interface DetailPageProps {
  slug: string;
  onNavigateToPlayer: (slug: string, episodeNumber: number) => void;
  onBack: () => void;
  onRelatedPress?: (slug: string) => void;
}

export const DetailPage: React.FC<DetailPageProps> = ({
  slug,
  onNavigateToPlayer,
  onBack,
  onRelatedPress,
}) => {
  const { addToHistory, lastViewed } = useHistoryStore();
  const {
    anime,
    isLoading,
    error,
    episodes,
    ranges,
    activeRangeIdx,
    setActiveRangeIdx,
    isRestoring,
    ascending,
    selectedEpisode,
    servers,
    serverLoading,
    handleEpisodePress,
    handleServerSelect,
    closeModal,
    handleToggleSort,
    retry,
  } = useAnimeDetail(slug);

  if (isLoading) {
    return (
      <div className="h-full w-full bg-[#0f0f11] overflow-y-auto">
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="h-full w-full bg-[#0f0f11] flex items-center justify-center">
        <ErrorState onRetry={retry} />
      </div>
    );
  }

  const handleServerSelectAndNavigate = (server: Parameters<typeof handleServerSelect>[0]) => {
    closeModal();
    if (selectedEpisode && anime) {
      const existing = lastViewed.find(
        (h) => h.url === slug && h.number === selectedEpisode.number,
      );
      addToHistory({
        title: anime.title,
        image: anime.image,
        url: slug,
        number: selectedEpisode.number,
        progress: existing?.progress ?? 0,
        duration: existing?.duration ?? 0,
        timestamp: Date.now(),
      });
      onNavigateToPlayer(slug, selectedEpisode.number);
    }
  };

  return (
    <div className="h-full w-full bg-[#0f0f11] overflow-y-auto">
      <DetailHeader
        anime={anime}
        isAscending={ascending}
        onToggleSort={handleToggleSort}
        onRelatedPress={onRelatedPress}
        onBack={onBack}
      />

      <EpisodeRangeSelector
        ranges={ranges}
        activeRangeIdx={activeRangeIdx}
        onSelect={setActiveRangeIdx}
        isRestoring={isRestoring}
      />

      <div className="pb-8">
        {episodes.map((ep) => (
          <EpisodeItem
            key={ep.id}
            episode={ep}
            onPress={handleEpisodePress}
          />
        ))}
      </div>

      <ServerModal
        visible={selectedEpisode !== null}
        episodeNumber={selectedEpisode?.number ?? 0}
        servers={servers}
        isLoading={serverLoading}
        onServerSelect={handleServerSelectAndNavigate}
        onClose={closeModal}
      />
    </div>
  );
};
