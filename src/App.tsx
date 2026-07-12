import React, { useEffect, useState, useCallback } from 'react';
import { HomePage } from './renderer/pages/HomePage';
import { SearchPage } from './renderer/pages/SearchPage';
import { DetailPage } from './renderer/pages/DetailPage';
import { PlayerPage } from './renderer/pages/PlayerPage';
import { SettingsPage } from './renderer/pages/SettingsPage';
import { useUserInitializationStore } from './renderer/stores/userIndex';
import { sessionManager } from './renderer/services/session';
import { Skeleton } from './renderer/components/ui/Skeleton';
import type { Anime } from './types';

type Screen = 'home' | 'search' | 'detail' | 'player' | 'settings';

interface NavState {
  screen: Screen;
  slug?: string;
  episodeNumber?: number;
}

const App: React.FC = () => {
  const initialize = useUserInitializationStore((s) => s.initialize);
  const isInitialized = useUserInitializationStore((s) => s.isInitialized);
  const [ready, setReady] = useState(false);
  const [nav, setNav] = useState<NavState>({ screen: 'home' });

  useEffect(() => {
    const init = async () => {
      await sessionManager.initialize();
      await initialize();
      sessionManager.refreshSession().catch(() => {});
      setReady(true);
    };
    init();
  }, [initialize]);

  const navigate = useCallback((s: Screen, slug?: string) => {
    setNav({ screen: s, slug });
  }, []);

  const navigateToPlayer = useCallback((slug: string, episodeNumber: number) => {
    setNav({ screen: 'player', slug, episodeNumber });
  }, []);

  const goBack = useCallback(() => {
    setNav({ screen: 'home' });
  }, []);

  const handleAnimePress = useCallback((anime: Anime) => {
    setNav({ screen: 'detail', slug: anime.url });
  }, []);

  const handleHistoryPress = useCallback((item: { url: string }) => {
    if (item.url) {
      setNav({ screen: 'detail', slug: item.url });
    }
  }, []);

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

  const isRootScreen = nav.screen === 'home' || nav.screen === 'search' || nav.screen === 'settings';

  return (
    <div className="h-screen w-screen bg-[#0f0f11] flex flex-col">
      {isRootScreen && (
        <nav className="flex items-center gap-1 px-8 pt-3 pb-2 bg-[#0f0f11] border-b border-neutral-800/40">
          <button
            onClick={() => navigate('home')}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-xl transition-all duration-200 ${
              nav.screen === 'home'
                ? 'bg-purple-500/10 text-purple-400 font-medium shadow-sm shadow-purple-500/5'
                : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Inicio</span>
          </button>
          <button
            onClick={() => navigate('search')}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-xl transition-all duration-200 ${
              nav.screen === 'search'
                ? 'bg-purple-500/10 text-purple-400 font-medium shadow-sm shadow-purple-500/5'
                : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <span>Buscar</span>
          </button>
          <button
            onClick={() => navigate('settings')}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-xl transition-all duration-200 ${
              nav.screen === 'settings'
                ? 'bg-purple-500/10 text-purple-400 font-medium shadow-sm shadow-purple-500/5'
                : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Ajustes</span>
          </button>
        </nav>
      )}

      <div className="flex-1 overflow-hidden">
        {nav.screen === 'home' && <HomePage onAnimePress={handleAnimePress} onHistoryPress={handleHistoryPress} />}
        {nav.screen === 'search' && (
          <SearchPage
            onAnimePress={handleAnimePress}
            onNavigateDetail={handleAnimePress}
          />
        )}
        {nav.screen === 'detail' && nav.slug && (
          <DetailPage
            slug={nav.slug}
            onNavigateToPlayer={navigateToPlayer}
            onBack={goBack}
          />
        )}
        {nav.screen === 'player' && nav.slug && nav.episodeNumber && (
          <PlayerPage
            slug={nav.slug}
            episodeNumber={nav.episodeNumber}
            onBack={goBack}
            onNavigateToEpisode={(num) => navigateToPlayer(nav.slug!, num)}
          />
        )}
        {nav.screen === 'settings' && <SettingsPage onBack={goBack} />}
      </div>
    </div>
  );
};

export default App;
