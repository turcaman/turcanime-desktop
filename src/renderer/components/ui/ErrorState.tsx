import React from 'react';

interface ErrorStateProps {
  onRetry: () => void;
  onBack?: () => void;
  title?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  onRetry,
  onBack,
  title = 'Error al cargar',
}) => {
  return (
    <div className="flex-1 flex items-center justify-center p-6 select-none">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="w-14 h-14 rounded-full bg-neutral-800/80 flex items-center justify-center">
          <svg
            className="w-7 h-7 text-neutral-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        <p className="text-sm text-neutral-400">{title}</p>
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 text-xs text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              Volver
            </button>
          )}
          <button
            onClick={onRetry}
            className="px-4 py-2 text-xs text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );
};
