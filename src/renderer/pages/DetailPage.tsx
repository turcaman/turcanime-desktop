import React from 'react';
import { useAnimeDetail } from '../hooks/useAnimeDetail';
import { usePlayerStore } from '../stores/playerStore';
import { DetailHeader } from '../components/detail/DetailHeader';
import { EpisodeRangeSelector } from '../components/detail/EpisodeRangeSelector';
import { EpisodeItem } from '../components/detail/EpisodeItem';
import { ServerModal } from '../components/detail/ServerModal';
import { DetailSkeleton } from '../components/skeletons/DetailSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useHistoryStore } from '../stores/historyStore';

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
  const setLastLanguage = usePlayerStore((s) => s.setLastLanguage);
  const lastViewed = useHistoryStore((s) => s.lastViewed);
  const progressMap = React.useMemo(() => {
    const map = new Map<number, { progress: number; duration: number }>();
    for (const item of lastViewed) {
      if (item.url === slug) {
        map.set(item.number, { progress: item.progress, duration: item.duration });
      }
    }
    return map;
  }, [slug, lastViewed]);
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
        <DetailSkeleton onBack={onBack} />
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="h-full w-full bg-[#0f0f11] flex items-center justify-center">
        <ErrorState onRetry={retry} onBack={onBack} />
      </div>
    );
  }

  const handleServerSelectAndNavigate = (server: Parameters<typeof handleServerSelect>[0]) => {
    setLastLanguage(server.language);
    closeModal();
    if (selectedEpisode && anime) {
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

      <div className="px-6 pt-3 pb-6 flex flex-col gap-3">
        <EpisodeRangeSelector
          ranges={ranges}
          activeRangeIdx={activeRangeIdx}
          onSelect={setActiveRangeIdx}
          isRestoring={isRestoring}
        />
        {episodes.map((ep) => (
          <EpisodeItem
            key={ep.id}
            episode={ep}
            onPress={handleEpisodePress}
            {...progressMap.get(ep.number)}
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
