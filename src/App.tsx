import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Home, Search, Settings } from 'lucide-react';
import { HomePage } from './renderer/pages/HomePage';
import { SearchPage } from './renderer/pages/SearchPage';
import { DetailPage } from './renderer/pages/DetailPage';
import { PlayerPage } from './renderer/pages/PlayerPage';
import { SettingsPage } from './renderer/pages/SettingsPage';
import { useUserInitializationStore, useUpdateStore, useSettingsStore } from './renderer/stores/userIndex';
import { useHomeStore } from './renderer/stores/homeStore';
import { useNetworkStatus } from './renderer/hooks/useNetworkStatus';
import { NoConnectionOverlay } from './renderer/components/NoConnectionOverlay';
import { sessionManager } from './renderer/services/session';
import { storage } from './renderer/utils/storage';
import { logger } from './renderer/utils/logger';
import type { Anime } from './types';

type Screen = 'home' | 'search' | 'detail' | 'player' | 'settings';

interface NavEntry {
  screen: Screen;
  slug?: string;
  episodeNumber?: number;
}

const INITIAL_STACK: NavEntry[] = [{ screen: 'home' }];

const CACHE_PREFIXES_TO_CLEAR = ['ch_', 'search_', 'anime_', 'suggestions_', 'stream_', 'servers_'];

const App: React.FC = () => {
  const initialize = useUserInitializationStore((s) => s.initialize);
  const isInitialized = useUserInitializationStore((s) => s.isInitialized);
  const updateAvailable = useUpdateStore((s) => s.updateAvailable);
  const { isConnected } = useNetworkStatus();
  const [ready, setReady] = useState(false);
  const [navStack, setNavStack] = useState<NavEntry[]>(INITIAL_STACK);
  const prevConnected = useRef<boolean | null>(null);

  const current = navStack[navStack.length - 1];

  useEffect(() => {
    const init = async () => {
      await sessionManager.initialize();
      await initialize();
      sessionManager.refreshSession().catch((): void => undefined);
      setReady(true);

      const { updateCheckEnabled, checkForUpdates } = useUpdateStore.getState();
      if (updateCheckEnabled) {
        checkForUpdates().catch((): void => undefined);
      }
    };
    init();
  }, [initialize]);

  // When connection restores, wait 2s then refresh (mirrors mobile layout behavior)
  useEffect(() => {
    const prev = prevConnected.current;
    prevConnected.current = isConnected;
    if (prev === false && isConnected === true) {
      const timer = setTimeout(() => {
        const doRefresh = async () => {
          try {
            useHomeStore.getState().prepareRefresh();

            let sessionOk = false;
            try {
              await sessionManager.refreshSession();
              sessionOk = true;
            } catch {
              logger.warn('App', 'Session refresh failed, skipping cache clear and using stale cache');
            }

            if (sessionOk) {
              const allKeys = await window.electronAPI.store.getAllKeys();
              const cacheKeys = allKeys.filter((k) =>
                CACHE_PREFIXES_TO_CLEAR.some((prefix) => k.startsWith(prefix)),
              );
              await Promise.all(cacheKeys.map((k) => storage.remove(k)));
              useHomeStore.getState().fetchHome(true).catch((): void => undefined);
              useSettingsStore.getState().invalidateCache();
            } else {
              useHomeStore.getState().fetchHome(false).catch((): void => undefined);
            }
          } finally {
            useSettingsStore.getState().invalidateCache();
          }
        };
        doRefresh();
      }, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isConnected]);

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
    return <div className="h-screen w-screen bg-[#0f0f11]" />;
  }

  const currentScreen = current.screen;
  const showNavbar = currentScreen === 'home' || currentScreen === 'search' || currentScreen === 'settings';

  return (
    <div className="h-screen w-screen bg-[#0f0f11] flex flex-col">
      <NoConnectionOverlay visible={!isConnected} />

      {!isConnected ? null : (
        <>
        {showNavbar && (
          <nav className="flex items-center gap-1 px-6 bg-[#0f0f11] border-b border-neutral-800/40">
            {[
              { screen: 'home' as const, icon: Home, label: 'Inicio' },
              { screen: 'search' as const, icon: Search, label: 'Buscar' },
              { screen: 'settings' as const, icon: Settings, label: 'Ajustes' },
            ].map(({ screen, icon: Icon, label }) => {
              const isActive = currentScreen === screen;
              return (
                <button
                  key={screen}
                  onClick={() => navigate(screen)}
                  className={`relative flex items-center gap-2 px-3 py-2.5 text-sm transition-colors duration-200 ${
                    isActive
                      ? 'text-purple-400'
                      : 'text-neutral-500 hover:text-neutral-200'
                  }`}
                >
                  {screen === 'settings' ? (
                    <span className="relative inline-flex">
                      <Icon className="w-4 h-4" />
                      {updateAvailable && (
                        <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-purple-400" />
                      )}
                    </span>
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  <span className={isActive ? 'font-medium' : ''}>{label}</span>

                </button>
              );
            })}
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
        </>
      )}
    </div>
  );
};

export default App;
