import React, { useEffect, useState } from 'react';
import { HomePage } from './renderer/pages/HomePage';
import { SearchPage } from './renderer/pages/SearchPage';
import { useUserInitializationStore } from './renderer/stores/userIndex';
import { sessionManager } from './renderer/services/session';
import { Skeleton } from './renderer/components/ui/Skeleton';

type Screen = 'home' | 'search';

const App: React.FC = () => {
  const initialize = useUserInitializationStore((s) => s.initialize);
  const isInitialized = useUserInitializationStore((s) => s.isInitialized);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>('home');

  useEffect(() => {
    const init = async () => {
      await sessionManager.initialize();
      await initialize();
      sessionManager.refreshSession().catch(() => {});
      setReady(true);
    };
    init();
  }, [initialize]);

  if (!ready || !isInitialized) {
    return (
      <div className="h-screen w-screen bg-[#0f0f11] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="w-48 h-4 rounded" />
          <Skeleton className="w-32 h-3 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#0f0f11] flex flex-col">
      <div className="flex items-center gap-1 px-6 pt-2 pb-1 bg-[#0f0f11] border-b border-neutral-800/50">
        <button
          onClick={() => setScreen('home')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            screen === 'home'
              ? 'bg-purple-500/10 text-purple-400 font-medium'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
          }`}
        >
          <svg className="w-4 h-4 inline mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Inicio
        </button>
        <button
          onClick={() => setScreen('search')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            screen === 'search'
              ? 'bg-purple-500/10 text-purple-400 font-medium'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
          }`}
        >
          <svg className="w-4 h-4 inline mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          Buscar
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {screen === 'home' && <HomePage />}
        {screen === 'search' && <SearchPage />}
      </div>
    </div>
  );
};

export default App;
