import React, { useEffect } from 'react';
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

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        const idx = num - 1;
        if (idx < displayServers.length) {
          onServerSelect(displayServers[idx]);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, onClose, onServerSelect, displayServers]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-[#1a1a1e] rounded-xl border border-neutral-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800/60">
          <div>
            <h3 className="text-sm font-semibold text-neutral-200">
              Episodio {episodeNumber}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Selecciona un servidor
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4 text-neutral-400" />
          </button>
        </div>

        <div className="p-5">
          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-11 rounded-lg w-full" />
              <Skeleton className="h-11 rounded-lg w-full" />
            </div>
          )}

          {!isLoading && displayServers.length === 0 && (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-neutral-500">
                No hay servidor disponible
              </p>
            </div>
          )}

          {!isLoading && displayServers.length > 0 && (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {displayServers.map((server, idx) => (
                <button
                  key={server.id}
                  onClick={() => onServerSelect(server)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors group"
                >
                  <span className="w-5 h-5 rounded bg-neutral-800 flex items-center justify-center text-[11px] text-neutral-500 font-mono group-hover:text-neutral-400 transition-colors">
                    {idx + 1}
                  </span>
                  <span className="text-sm text-neutral-200 font-medium">
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
