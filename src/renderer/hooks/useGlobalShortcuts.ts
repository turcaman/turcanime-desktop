import { useEffect } from 'react';
import { useSearchStore } from '../stores/searchStore';
import type { Screen } from './useNavigationStack';

interface GlobalShortcutsOptions {
  navigate: (screen: Screen) => void;
  goBack: () => void;
}

// Ctrl/Command + number maps to the same main screens as the sidebar.
const MAIN_SCREENS: Record<number, Screen> = {
  1: 'home',
  2: 'search',
  3: 'settings',
};

// App-wide keyboard shortcuts: Ctrl+K focuses search, Ctrl+1/2/3 switch main
// screens and Backspace walks back through the navigation stack. Backspace is
// ignored while typing so it keeps deleting characters inside inputs.
export function useGlobalShortcuts({ navigate, goBack }: GlobalShortcutsOptions): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        useSearchStore.getState().requestSearchFocus();
        navigate('search');
        return;
      }

      if (mod && e.key >= '1' && e.key <= '3') {
        e.preventDefault();
        navigate(MAIN_SCREENS[Number(e.key)]);
        return;
      }

      if (e.key === 'Backspace' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        const isTyping =
          target !== null &&
          (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
        if (isTyping) return;
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, goBack]);
}