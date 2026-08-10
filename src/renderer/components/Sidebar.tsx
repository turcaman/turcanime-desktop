import React from 'react';
import { Home, Search, Settings } from 'lucide-react';
import { useUpdateStore } from '../stores/updateStore';

type AppScreen = 'home' | 'search' | 'detail' | 'player' | 'settings';
type MainScreen = 'home' | 'search' | 'settings';

interface SidebarProps {
  // Only rendered on the main screens, but accepts the full union so callers
  // don't need to narrow before passing the current screen down.
  currentScreen: AppScreen;
  onNavigate: (screen: MainScreen) => void;
}

const NAV_ITEMS: { screen: MainScreen; icon: typeof Home; label: string }[] = [
  { screen: 'home', icon: Home, label: 'Inicio' },
  { screen: 'search', icon: Search, label: 'Buscar' },
  { screen: 'settings', icon: Settings, label: 'Ajustes' },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentScreen, onNavigate }) => {
  const updateAvailable = useUpdateStore((s) => s.updateAvailable);

  return (
    <aside className="flex flex-col shrink-0 w-[60px] border-r border-neutral-800/50 bg-[#0f0f11]">
      <nav className="flex flex-col gap-0.5 w-full px-2 pt-2">
        {NAV_ITEMS.map(({ screen, icon: Icon, label }) => {
          const isActive = currentScreen === screen;
          return (
            <button
              key={screen}
              onClick={() => onNavigate(screen)}
              title={label}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex items-center justify-center w-full h-10 rounded-md text-sm transition-colors duration-150 cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/70 ${
                isActive
                  ? 'bg-neutral-800/60 text-purple-400'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {screen === 'settings' && updateAvailable && (
                <span className="absolute w-2 h-2 rounded-full bg-purple-400 top-1.5 right-2" />
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
