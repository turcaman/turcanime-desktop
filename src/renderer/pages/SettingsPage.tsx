import React, { useState, useCallback } from 'react';
import { RefreshCw, Database } from 'lucide-react';
import { sessionManager } from '../services/session';
import { useUIStore } from '../stores/uiStore';
import { clearAllCache } from '../utils/cache';

const APP_VERSION = '1.0.6';

export const SettingsPage: React.FC = () => {
  const isRefreshingSession = useUIStore((s) => s.isRefreshingSession);
  const setSessionRefreshing = useUIStore((s) => s.setSessionRefreshing);
  const [refreshed, setRefreshed] = useState(false);

  const handleRefresh = useCallback(async () => {
    const ok = window.confirm(
      'Si el contenido no carga o ves errores, esto renueva la conexión con el servidor para intentar solucionarlo.',
    );
    if (!ok) return;

    setSessionRefreshing(true);
    await clearAllCache();
    await sessionManager.refreshSession();
    setSessionRefreshing(false);
    setRefreshed(true);
    setTimeout(() => setRefreshed(false), 2000);
  }, [setSessionRefreshing]);

  return (
    <div className="h-full w-full bg-[#0f0f11] overflow-y-auto">
      <div className="p-6 space-y-8">
        <h1 className="text-2xl font-bold text-neutral-100">Ajustes</h1>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-0.5 h-3 bg-purple-500 rounded-full flex-shrink-0" />
            <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Datos</h2>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 overflow-hidden">
            <button
              onClick={handleRefresh}
              disabled={isRefreshingSession}
              className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-neutral-800/60 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 text-purple-400 ${isRefreshingSession ? 'animate-spin' : ''}`}
              />
              <div className="flex flex-col items-start">
                <span className="text-sm text-neutral-200">
                  {refreshed ? 'Datos actualizados' : 'Actualizar datos de la app'}
                </span>
                <span className="text-[11px] text-neutral-500 mt-0.5">
                  Renueva la conexión con el servidor
                </span>
              </div>
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-0.5 h-3 bg-purple-500 rounded-full flex-shrink-0" />
            <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Información</h2>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 overflow-hidden divide-y divide-neutral-800/60">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Database className="w-4 h-4 text-neutral-500" />
              <div className="flex flex-col items-start">
                <span className="text-sm text-neutral-300">Versión</span>
                <span className="text-[11px] text-neutral-500 mt-0.5">{APP_VERSION}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
