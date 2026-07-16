import React, { useEffect, useState, useCallback } from 'react';
import { Home, Search, Settings } from 'lucide-react';
import { HomePage } from './renderer/pages/HomePage';
import { SearchPage } from './renderer/pages/SearchPage';
import { DetailPage } from './renderer/pages/DetailPage';
import { PlayerPage } from './renderer/pages/PlayerPage';
import { SettingsPage } from './renderer/pages/SettingsPage';
import { useUserInitializationStore } from './renderer/stores/userIndex';
import { sessionManager } from './renderer/services/session';
import type { Anime } from './types';

type Screen = 'home' | 'search' | 'detail' | 'player' | 'settings';

interface NavEntry {
  screen: Screen;
  slug?: string;
  episodeNumber?: number;
}

const INITIAL_STACK: NavEntry[] = [{ screen: 'home' }];

const App: React.FC = () => {
  const initialize = useUserInitializationStore((s) => s.initialize);
  const isInitialized = useUserInitializationStore((s) => s.isInitialized);
  const [ready, setReady] = useState(false);
  const [navStack, setNavStack] = useState<NavEntry[]>(INITIAL_STACK);

  const current = navStack[navStack.length - 1];

  useEffect(() => {
    const init = async () => {
      await sessionManager.initialize();
      await initialize();
      sessionManager.refreshSession().catch((): void => undefined);
      setReady(true);
    };
    init();
  }, [initialize]);

  const navigate = useCallback((s: Screen, slug?: string) => {
    setNavStack([{ screen: s, slug }]);
  }, []);

  const push = useCallback((s: Screen, slug?: string, episodeNumber?: number) => {
    setNavStack((prev) => [...prev, { screen: s, slug, episodeNumber }]);
  }, []);

  const navigateToPlayer = useCallback((slug: string, episodeNumber: number) => {
    setNavStack((prev) => [...prev, { screen: 'player', slug, episodeNumber }]);
  }, []);

  const updatePlayerEpisode = useCallback((episodeNumber: number) => {
    setNavStack((prev) => {
      const last = prev[prev.length - 1];
      if (last?.screen !== 'player') return prev;
      const copy = [...prev];
      copy[copy.length - 1] = { ...last, episodeNumber };
      return copy;
    });
  }, []);

  const replaceCurrentDetail = useCallback((slug: string) => {
    setNavStack((prev) => {
      const last = prev[prev.length - 1];
      if (last?.screen === 'detail') {
        const copy = [...prev];
        copy[copy.length - 1] = { screen: 'detail', slug };
        return copy;
      }
      return [...prev, { screen: 'detail', slug }];
    });
  }, []);

  const goBack = useCallback(() => {
    setNavStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const handleAnimePress = useCallback((anime: Anime) => {
    push('detail', anime.url);
  }, [push]);

  const handleHistoryPress = useCallback((item: { url: string }) => {
    if (item.url) {
      push('detail', item.url);
    }
  }, [push]);

  if (!ready || !isInitialized) {
    return (
      <div className="h-screen w-screen bg-[#0f0f11] flex flex-col items-center justify-center gap-5 animate-fade-in">
        <svg className="w-[72px] h-[72px]" viewBox="0 0 80 80" fill="none" aria-hidden="true">
          <rect width="80" height="80" rx="20" fill="url(#splashGradient)" />
          <path d="M32 26v28l22-14z" fill="white" />
          <defs>
            <linearGradient id="splashGradient" x1="0" y1="0" x2="80" y2="80">
              <stop stopColor="#A855F7" />
              <stop offset="1" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
        </svg>
        <span className="text-lg font-semibold text-neutral-200 tracking-tight select-none">
          Turcanime Desktop
        </span>
        <div className="flex gap-1.5 mt-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-neutral-600 animate-dot-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const currentScreen = current.screen;
  const showNavbar = currentScreen === 'home' || currentScreen === 'search' || currentScreen === 'settings';

  return (
    <div className="h-screen w-screen bg-[#0f0f11] flex flex-col">
      {showNavbar && (
        <nav className="flex items-center gap-1 px-8 pt-3 pb-2 bg-[#0f0f11] border-b border-neutral-800/40">
          <button
            onClick={() => navigate('home')}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-xl transition-all duration-200 ${
              currentScreen === 'home'
                ? 'bg-purple-500/10 text-purple-400 font-medium shadow-sm shadow-purple-500/5'
                : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Inicio</span>
          </button>
          <button
            onClick={() => navigate('search')}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-xl transition-all duration-200 ${
              currentScreen === 'search'
                ? 'bg-purple-500/10 text-purple-400 font-medium shadow-sm shadow-purple-500/5'
                : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Buscar</span>
          </button>
          <button
            onClick={() => navigate('settings')}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-xl transition-all duration-200 ${
              currentScreen === 'settings'
                ? 'bg-purple-500/10 text-purple-400 font-medium shadow-sm shadow-purple-500/5'
                : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Ajustes</span>
          </button>
        </nav>
      )}

      <div className="flex-1 overflow-hidden">
        <div key={`${currentScreen}-${current.slug ?? ''}`} className="h-full animate-fade-in">
          {currentScreen === 'home' && <HomePage onAnimePress={handleAnimePress} onHistoryPress={handleHistoryPress} />}
          {currentScreen === 'search' && (
            <SearchPage
              onAnimePress={handleAnimePress}
              onNavigateDetail={handleAnimePress}
            />
          )}
          {currentScreen === 'detail' && current.slug && (
            <DetailPage
              slug={current.slug}
              onNavigateToPlayer={navigateToPlayer}
              onBack={goBack}
              onRelatedPress={replaceCurrentDetail}
            />
          )}
          {currentScreen === 'player' && current.slug && current.episodeNumber != null && (
            <PlayerPage
              slug={current.slug}
              episodeNumber={current.episodeNumber}
              onBack={goBack}
              onNavigateToEpisode={updatePlayerEpisode}
            />
          )}
          {currentScreen === 'settings' && <SettingsPage />}
        </div>
      </div>
    </div>
  );
};

export default App;
