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
      className="group flex items-center gap-3 w-full px-6 py-3 hover:bg-neutral-900/50 transition-colors text-left"
    >
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-neutral-700 text-[11px] text-neutral-300 font-semibold group-hover:bg-neutral-600 group-hover:text-neutral-200 transition-colors flex-shrink-0">
        {episode.number}
      </span>
      <span className="text-sm text-neutral-300 truncate flex-1 group-hover:text-neutral-100 transition-colors">
        Episodio {episode.number}
      </span>
      <Play className="w-4 h-4 text-purple-500 flex-shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
    </button>
  );
};
