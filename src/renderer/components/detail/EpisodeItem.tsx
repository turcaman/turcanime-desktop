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
      className="group flex items-center gap-3 w-full px-4 py-3 rounded-lg border border-neutral-800/50 bg-neutral-900/40 hover:bg-neutral-800/60 transition-colors text-left"
    >
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-neutral-700 text-[11px] text-neutral-300 font-semibold group-hover:bg-neutral-600 group-hover:text-neutral-200 transition-colors flex-shrink-0">
        {episode.number}
      </span>
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
      <Play className="w-4 h-4 text-neutral-600 flex-shrink-0" />
    </button>
  );
};
