import React from 'react';

interface PlayerLoadingOverlayProps {
  visible: boolean;
}

export const PlayerLoadingOverlay: React.FC<PlayerLoadingOverlayProps> = ({
  visible,
}) => {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 pointer-events-none">
      <div className="flex flex-col items-center gap-3">
        <svg
          className="w-10 h-10 text-purple-400 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span className="text-sm text-neutral-300">Cargando video...</span>
      </div>
    </div>
  );
};
