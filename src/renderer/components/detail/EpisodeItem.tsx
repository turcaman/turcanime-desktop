import React from 'react';
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
      <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-medium text-neutral-400">
          {episode.number}
        </span>
      </div>
      <span className="text-sm text-neutral-300 truncate flex-1">
        Episodio {episode.number}
      </span>
      <svg
        className="w-4 h-4 text-neutral-600 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      </svg>
    </button>
  );
};
