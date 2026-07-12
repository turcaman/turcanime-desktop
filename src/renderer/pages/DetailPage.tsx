import React from 'react';
import { useAnimeDetail } from '../hooks/useAnimeDetail';
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
}

export const DetailPage: React.FC<DetailPageProps> = ({
  slug,
  onNavigateToPlayer,
  onBack,
}) => {
  const {
    anime,
    isLoading,
    error,
    episodes,
    ranges,
    activeRangeIdx,
    setActiveRangeIdx,
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

  const handleServerSelectAndNavigate = async (server: Parameters<typeof handleServerSelect>[0]) => {
    await handleServerSelect(server);
    if (selectedEpisode) {
      onNavigateToPlayer(slug, selectedEpisode.number);
    }
  };

  return (
    <div className="h-full w-full bg-[#0f0f11] overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center px-4 py-2 bg-[#0f0f11]/90 backdrop-blur-sm border-b border-neutral-800/40">
        <button
          onClick={onBack}
          className="p-1.5 rounded-md hover:bg-neutral-800 transition-colors"
        >
          <svg className="w-5 h-5 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <DetailHeader
        anime={anime}
        isAscending={ascending}
        onToggleSort={handleToggleSort}
      />

      <EpisodeRangeSelector
        ranges={ranges}
        activeRangeIdx={activeRangeIdx}
        onSelect={setActiveRangeIdx}
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
