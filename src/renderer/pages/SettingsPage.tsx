import React, { useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { sessionManager } from '../services/session';
import { useUIStore } from '../stores/uiStore';
import { clearAllCache } from '../utils/cache';

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
      <div className="p-6">
        <h1 className="text-2xl font-bold text-neutral-100 mb-6">Ajustes</h1>

        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
          Datos
        </h2>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden">
          <button
            onClick={handleRefresh}
            disabled={isRefreshingSession}
            className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 text-purple-400 ${isRefreshingSession ? 'animate-spin' : ''}`}
            />
            <span className="text-sm text-neutral-200">
              {refreshed ? 'Datos actualizados' : 'Actualizar datos de la app'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
