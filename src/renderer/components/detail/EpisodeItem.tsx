import React from 'react';
import { Play } from 'lucide-react';
import type { Episode } from '../../../types';

interface EpisodeItemProps {
  episode: Episode;
  onPress: (episode: Episode) => void;
  progress?: number;
  duration?: number;
}

export const EpisodeItem: React.FC<EpisodeItemProps> = ({ episode, onPress, progress, duration }) => {
  const pct = progress != null && duration != null && duration > 0
    ? Math.min(progress / duration, 1)
    : null;

  return (
    <button
      onClick={() => onPress(episode)}
      className="group flex items-center gap-3 w-full px-4 py-3 rounded-lg border border-neutral-800/70 bg-neutral-900/40 hover:bg-neutral-800/60 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/70"
    >
      <div className="flex-1 min-w-0">
        <span className="text-sm text-neutral-300 truncate group-hover:text-neutral-100 transition-colors">
          Episodio {episode.number}
        </span>
        {pct != null && (
          <div className="w-full h-1 bg-neutral-800 rounded-full mt-1.5 overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${pct * 100}%` }}
            />
          </div>
        )}
      </div>
      <Play className="w-4 h-4 text-neutral-500 group-hover:text-purple-400 flex-shrink-0 transition-colors" />
    </button>
  );
};
