import { useCallback, useState } from 'react';

export type Screen = 'home' | 'search' | 'detail' | 'player' | 'settings';

export interface NavEntry {
  screen: Screen;
  slug?: string;
  episodeNumber?: number;
}

// Navigation is a small stack of screens (home -> detail -> player -> back).
// All stack mutations live here so App.tsx only reads the top of the stack
// and renders the matching screen.
export function useNavigationStack() {
  const [navStack, setNavStack] = useState<NavEntry[]>([{ screen: 'home' }]);

  // Replaces the whole stack: used by the sidebar to switch main screens.
  const navigate = useCallback((screen: Screen) => {
    setNavStack([{ screen }]);
  }, []);

  const push = useCallback((screen: Screen, slug?: string, episodeNumber?: number) => {
    setNavStack((prev) => [...prev, { screen, slug, episodeNumber }]);
  }, []);

  const navigateToPlayer = useCallback((slug: string, episodeNumber: number) => {
    setNavStack((prev) => [...prev, { screen: 'player', slug, episodeNumber }]);
  }, []);

  // Keeps the player mounted while swapping its episode, so playback state
  // and the video element survive navigation between episodes.
  const updatePlayerEpisode = useCallback((episodeNumber: number) => {
    setNavStack((prev) => {
      const last = prev[prev.length - 1];
      if (last?.screen !== 'player') return prev;
      const copy = [...prev];
      copy[copy.length - 1] = { ...last, episodeNumber };
      return copy;
    });
  }, []);

  // Replaces the top detail entry when following a related anime, avoiding an
  // ever-growing stack when browsing related content.
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

  return {
    current: navStack[navStack.length - 1],
    navigate,
    push,
    navigateToPlayer,
    updatePlayerEpisode,
    replaceCurrentDetail,
    goBack,
  };
}
