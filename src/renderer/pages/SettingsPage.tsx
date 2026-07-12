import React, { useState, useCallback } from 'react';
import { sessionManager } from '../services/session';
import { useUIStore } from '../stores/uiStore';
import { clearAllCache } from '../utils/cache';

interface SettingsPageProps {
  onBack: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = () => {
  const isRefreshingSession = useUIStore((s) => s.isRefreshingSession);
  const setSessionRefreshing = useUIStore((s) => s.setSessionRefreshing);
  const [refreshed, setRefreshed] = useState(false);

  const handleRefresh = useCallback(async () => {
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
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
          Datos
        </h2>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden">
          <button
            onClick={handleRefresh}
            disabled={isRefreshingSession}
            className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            <svg
              className={`w-4 h-4 text-purple-400 ${isRefreshingSession ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="text-sm text-neutral-200">
              {refreshed ? 'Datos actualizados' : 'Actualizar datos de la app'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
