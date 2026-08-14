import React, { useEffect, useState, useCallback } from 'react';
import { HomePage } from './renderer/pages/HomePage';
import { SearchPage } from './renderer/pages/SearchPage';
import { DetailPage } from './renderer/pages/DetailPage';
import { PlayerPage } from './renderer/pages/PlayerPage';
import { SettingsPage } from './renderer/pages/SettingsPage';
import { useNavigationStack } from './renderer/hooks/useNavigationStack';
import { useAppInitStore } from './renderer/stores/appInitStore';
import { useUpdateStore } from './renderer/stores/updateStore';
import { useNetworkStatus } from './renderer/hooks/useNetworkStatus';
import { useReconnect } from './renderer/hooks/useReconnect';
import { NoConnectionOverlay } from './renderer/components/NoConnectionOverlay';
import { Sidebar } from './renderer/components/Sidebar';
import { sessionManager } from './renderer/services/session';

const App: React.FC = () => {
  const initialize = useAppInitStore((s) => s.initialize);
  const isInitialized = useAppInitStore((s) => s.isInitialized);
  const { isConnected } = useNetworkStatus();
  const [ready, setReady] = useState(false);

  const {
    current,
    navigate,
    push,
    navigateToPlayer,
    updatePlayerEpisode,
    replaceCurrentDetail,
    goBack,
  } = useNavigationStack();

  useReconnect(isConnected);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      await sessionManager.initialize();
      await initialize();
      sessionManager.refreshSession().catch((): void => undefined);
      if (!cancelled) setReady(true);

      const { updateCheckEnabled, checkForUpdates } = useUpdateStore.getState();
      if (updateCheckEnabled) {
        checkForUpdates().catch((): void => undefined);
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [initialize]);

  const openDetail = useCallback((item: { slug: string }) => {
    if (item.slug) {
      push('detail', item.slug);
    }
  }, [push]);

  if (!ready || !isInitialized) {
    return <div className="h-screen w-screen bg-[#0f0f11]" />;
  }

  const currentScreen = current.screen;
  const showNavbar = currentScreen === 'home' || currentScreen === 'search' || currentScreen === 'settings';

  return (
    <div className="h-screen w-screen bg-[#0f0f11] flex">
      <NoConnectionOverlay visible={isConnected === false} />

      {isConnected === false ? null : (
        <>
        {showNavbar && (
          <Sidebar currentScreen={currentScreen} onNavigate={navigate} />
        )}

        <div className="flex-1 overflow-hidden min-w-0">
          <div key={`${currentScreen}-${current.slug ?? ''}`} className="h-full">
            {currentScreen === 'home' && <HomePage onAnimePress={openDetail} onHistoryPress={openDetail} />}
            {currentScreen === 'search' && (
              <SearchPage onAnimePress={openDetail} />
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
