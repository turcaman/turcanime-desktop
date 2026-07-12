import React from 'react';
import { Skeleton } from '../ui/Skeleton';
import type { VideoServer } from '../../../types';

interface ServerModalProps {
  visible: boolean;
  episodeNumber: number;
  servers: VideoServer[];
  isLoading: boolean;
  onServerSelect: (server: VideoServer) => void;
  onClose: () => void;
}

function mapLanguage(lang: string): string {
  switch (lang.toLowerCase()) {
    case 'sub': return 'Subtitulado';
    case 'dub': case 'lat': return 'Latino';
    case 'eng': case 'en': return 'Inglés';
    case 'jpn': case 'jp': return 'Japonés';
    default: return lang;
  }
}

export const ServerModal: React.FC<ServerModalProps> = ({
  visible,
  episodeNumber,
  servers,
  isLoading,
  onServerSelect,
  onClose,
}) => {
  if (!visible) return null;

  const deltaServers = servers.filter((s) =>
    s.title.toLowerCase().includes('delta'),
  );
  const displayServers = deltaServers.length > 0 ? deltaServers : servers;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-[#0f0f11] rounded-t-2xl border border-neutral-800 px-6 pb-8 pt-5 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-neutral-200">
            Servidores — Episodio {episodeNumber}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-neutral-800 transition-colors"
          >
            <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-12 rounded-lg w-full" />
            <Skeleton className="h-12 rounded-lg w-full" />
          </div>
        )}

        {!isLoading && displayServers.length === 0 && (
          <p className="text-sm text-neutral-500 text-center py-6">
            No hay servidor disponible
          </p>
        )}

        {!isLoading && displayServers.length > 0 && (
          <div className="space-y-2">
            {displayServers.map((server) => (
              <button
                key={server.id}
                onClick={() => onServerSelect(server)}
                className="flex items-center justify-between w-full px-4 py-3 bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <span className="text-sm text-neutral-200 font-medium">
                  {server.title}
                </span>
                <span className="text-[11px] text-neutral-500">
                  {mapLanguage(server.language)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
