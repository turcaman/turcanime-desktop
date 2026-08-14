import React, { useState, useCallback, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { useHomeStore } from '../../stores/homeStore';
import { useUIStore } from '../../stores/uiStore';
import { renewSessionAndClearCache } from '../../utils/sessionRecovery';

export const ConnectionSection: React.FC = () => {
  const isRefreshingSession = useUIStore((s) => s.isRefreshingSession);
  const setSessionRefreshing = useUIStore((s) => s.setSessionRefreshing);
  const [refreshed, setRefreshed] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [confirmingRefresh, setConfirmingRefresh] = useState(false);
  const refreshButtonRef = useRef<HTMLButtonElement>(null);
  const confirmCancelRef = useRef<HTMLButtonElement>(null);

  // Keep keyboard focus inside the confirm row instead of leaving it on the
  // now-disabled button underneath.
  useEffect(() => {
    if (confirmingRefresh) {
      confirmCancelRef.current?.focus();
    }
  }, [confirmingRefresh]);

  const handleRefresh = useCallback(async () => {
    setSessionRefreshing(true);
    setRefreshed(false);
    setRefreshError(null);
    setConfirmingRefresh(false);
    // renewSessionAndClearCache never throws: a failed or cookie-less refresh
    // is reported via the returned flag.
    const ok = await renewSessionAndClearCache();
    if (!ok) {
      setRefreshError('No se pudo renovar la conexión. Espera un momento e inténtalo de nuevo.');
      setSessionRefreshing(false);
      return;
    }
    setRefreshed(true);
    setTimeout(() => setRefreshed(false), 2000);
    useHomeStore.getState().fetchHome(true).catch((): void => undefined);
    setSessionRefreshing(false);
  }, [setSessionRefreshing]);

  return (
    <div>
      <h2 className="text-[11px] font-medium text-neutral-300 uppercase tracking-[0.14em] mb-3">Conexión</h2>
      <div className="relative">
        <button
          ref={refreshButtonRef}
          onClick={() => setConfirmingRefresh(true)}
          disabled={isRefreshingSession || confirmingRefresh}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border border-neutral-800/70 bg-neutral-900/50 hover:bg-neutral-800/60 transition-colors disabled:opacity-50 disabled:hover:bg-neutral-900/50"
        >
          <RefreshCw
            className={`w-4 h-4 text-purple-400 flex-shrink-0 ${isRefreshingSession ? 'animate-spin' : ''}`}
          />
          <div className="flex flex-col items-start">
            <span className="text-sm text-neutral-200">
              {refreshed ? 'Conexión renovada' : 'Renovar conexión'}
            </span>
            <span className="text-[11px] text-neutral-400 mt-0.5">
              Refresca sesión y cache
            </span>
          </div>
        </button>
        {confirmingRefresh && !isRefreshingSession && (
          <div className="absolute inset-0 flex items-center gap-3 px-4 rounded-lg border border-neutral-700/60 bg-neutral-900 animate-fade-in">
            <span className="text-sm text-neutral-200 flex-1 min-w-0 leading-snug">
              Si el contenido no carga o ves errores, esto renueva la conexión con el servidor para intentar solucionarlo.
            </span>
            <button
              onClick={() => void handleRefresh()}
              className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-md transition-colors"
            >
              Sí
            </button>
            <button
              ref={confirmCancelRef}
              onClick={() => {
                setConfirmingRefresh(false);
                refreshButtonRef.current?.focus();
              }}
              className="flex-shrink-0 px-3 py-1.5 text-xs text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
      {refreshError && (
        <p className="text-[11px] text-red-400/80 mt-1.5 px-1">{refreshError}</p>
      )}
    </div>
  );
};
