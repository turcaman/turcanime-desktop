import React from 'react';
import { Play } from 'lucide-react';
import type { Episode } from '../../../types';

interface EpisodeItemProps {
  episode: Episode;
  onPress: (episode: Episode) => void;
}

export const EpisodeItem: React.FC<EpisodeItemProps> = ({ episode, onPress }) => {
  return (
    <button
      onClick={() => onPress(episode)}
      className="flex items-center gap-3 w-full px-6 py-3 border-b border-neutral-800/40 hover:bg-neutral-900/50 transition-colors text-left"
    >
      <span className="text-sm text-neutral-300 truncate flex-1 font-medium">
        Episodio {episode.number}
      </span>
      <Play className="w-4 h-4 text-purple-500 flex-shrink-0" />
    </button>
  );
};
