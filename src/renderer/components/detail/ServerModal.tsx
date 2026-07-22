import React from 'react';
import { Skeleton } from '../ui/Skeleton';
import { X } from 'lucide-react';
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
  const code = (lang || '').toUpperCase();
  if (code.includes('SUB')) return 'Subtitulado';
  if (code.includes('LAT')) return 'Latino';
  if (code.includes('CAS')) return 'Castellano';
  return lang || 'Desconocido';
}

export const ServerModal: React.FC<ServerModalProps> = ({
  visible,
  episodeNumber,
  servers,
  isLoading,
  onServerSelect,
  onClose,
}) => {
  const deltaServers = servers.filter((s) =>
    s.title.toLowerCase().includes('delta'),
  );
  const displayServers = deltaServers.length > 0 ? deltaServers : servers;
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm bg-[#141416] rounded-xl border border-neutral-800/50 shadow-2xl overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800/60">
          <div>
            <h3 className="text-sm font-semibold text-neutral-200">
              Episodio {episodeNumber}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Selecciona un idioma
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4 text-neutral-400" />
          </button>
        </div>

        <div className="p-4">
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-11 rounded-lg w-full" />
              <Skeleton className="h-11 rounded-lg w-full" />
            </div>
          )}

          {!isLoading && displayServers.length === 0 && (
            <div className="flex items-center justify-center h-28">
              <p className="text-sm text-neutral-500">
                No hay servidor disponible
              </p>
            </div>
          )}

          {!isLoading && displayServers.length > 0 && (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {displayServers.map((server) => (
                <button
                  key={server.id}
                  onClick={() => onServerSelect(server)}
                  className="flex items-center w-full px-4 py-3 bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors border border-neutral-800/50 hover:border-neutral-700/60"
                >
                  <span className="text-sm text-neutral-200">
                    {mapLanguage(server.language)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
