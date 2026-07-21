import React, { useState, useCallback } from 'react';
import { RefreshCw, Bell, ExternalLink, CheckCircle2, Download, Info } from 'lucide-react';
import { sessionManager } from '../services/session';
import { useUIStore } from '../stores/uiStore';
import { useUpdateStore } from '../stores/updateStore';
import { clearAllCache } from '../utils/cache';

export const SettingsPage: React.FC = () => {
  const isRefreshingSession = useUIStore((s) => s.isRefreshingSession);
  const setSessionRefreshing = useUIStore((s) => s.setSessionRefreshing);
  const [refreshed, setRefreshed] = useState(false);

  const updateCheckEnabled = useUpdateStore((s) => s.updateCheckEnabled);
  const setUpdateCheckEnabled = useUpdateStore((s) => s.setUpdateCheckEnabled);
  const updateAvailable = useUpdateStore((s) => s.updateAvailable);
  const checkingForUpdates = useUpdateStore((s) => s.checkingForUpdates);
  const lastCheckError = useUpdateStore((s) => s.lastCheckError);
  const currentVersion = useUpdateStore((s) => s.currentVersion);
  const checkForUpdates = useUpdateStore((s) => s.checkForUpdates);

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

  const handleManualCheck = useCallback(async () => {
    await checkForUpdates();
  }, [checkForUpdates]);

  const handleDownload = useCallback(async () => {
    await window.electronAPI.app.openExternal(
      'https://turcanime.pages.dev',
    );
  }, []);

  return (
    <div className="h-full w-full bg-[#0f0f11] overflow-y-auto">
      <div className="p-6 pt-4 space-y-8">

        <div>
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Conexión</h2>
          <button
            onClick={handleRefresh}
            disabled={isRefreshingSession}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800/60 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 text-purple-400 flex-shrink-0 ${isRefreshingSession ? 'animate-spin' : ''}`}
            />
            <div className="flex flex-col items-start">
              <span className="text-sm text-neutral-200">
                {refreshed ? 'Conexión renovada' : 'Renovar conexión'}
              </span>
              <span className="text-[11px] text-neutral-500 mt-0.5">
                Refresca sesión y cache
              </span>
            </div>
          </button>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Actualizaciones</h2>
          <div className="space-y-1.5">
            <label className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800/60 transition-colors cursor-pointer">
              <Bell className="w-4 h-4 text-neutral-500 flex-shrink-0" />
              <div className="flex flex-col items-start flex-1 min-w-0">
                <span className="text-sm text-neutral-200">Buscar actualizaciones</span>
                <span className="text-[11px] text-neutral-500 mt-0.5">Al iniciar la app</span>
              </div>
              <button
                role="switch"
                aria-checked={updateCheckEnabled}
                onClick={() => setUpdateCheckEnabled(!updateCheckEnabled)}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 ${
                  updateCheckEnabled ? 'bg-purple-500' : 'bg-neutral-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-all duration-200 mt-0.5 ml-0.5 ${
                    updateCheckEnabled ? 'translate-x-4 shadow-sm' : 'translate-x-0'
                  }`}
                />
              </button>
            </label>
            <button
              onClick={handleManualCheck}
              disabled={checkingForUpdates}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800/60 transition-colors disabled:opacity-50"
            >
              <Download
                className={`w-4 h-4 text-purple-400 flex-shrink-0 ${checkingForUpdates ? 'animate-pulse' : ''}`}
              />
              <div className="flex flex-col items-start flex-1 min-w-0">
                <span className="text-sm text-neutral-200">
                  {checkingForUpdates ? 'Buscando...' : 'Buscar actualización'}
                </span>
                <div className="h-[18px] flex items-center mt-0.5">
                  {checkingForUpdates && (
                    <span className="text-[11px] text-neutral-500">Buscando...</span>
                  )}
                  {!checkingForUpdates && lastCheckError && (
                    <span className="text-[11px] text-red-400/70">{lastCheckError}</span>
                  )}
                  {!checkingForUpdates && !lastCheckError && updateAvailable && (
                    <span className="text-[11px] text-purple-400">v{updateAvailable} disponible</span>
                  )}
                  {!checkingForUpdates && !lastCheckError && !updateAvailable && currentVersion && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Estás al día
                    </span>
                  )}
                </div>
              </div>
              {!checkingForUpdates && !lastCheckError && updateAvailable && (
                <span
                  onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                  className="flex items-center gap-1.5 text-[11px] text-purple-400 hover:text-purple-300 font-medium transition-colors ml-auto flex-shrink-0 cursor-pointer"
                >
                  Descargar
                  <ExternalLink className="w-3 h-3" />
                </span>
              )}
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Acerca de</h2>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Info className="w-4 h-4 text-neutral-500 flex-shrink-0" />
              <div className="flex flex-col items-start">
                <span className="text-sm text-neutral-300">Versión {currentVersion ?? '—'}</span>
                <span className="text-[11px] text-neutral-500 mt-0.5">Turcanime Desktop</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
