import React from 'react';
import { Home, Search, Settings, ChevronLeft } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
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
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleCollapsed = useUIStore((s) => s.toggleSidebarCollapsed);
  const updateAvailable = useUpdateStore((s) => s.updateAvailable);

  return (
    <aside
      className={`flex flex-col shrink-0 border-r border-neutral-800/50 bg-[#0f0f11] transition-[width] duration-200 ease-out overflow-hidden ${
        collapsed ? 'w-[60px]' : 'w-[200px]'
      }`}
    >
      <div className={`flex items-center h-12 shrink-0 ${collapsed ? 'justify-center px-0' : 'justify-between px-3'}`}>
        {!collapsed && (
          <span className="text-sm font-bold text-neutral-200 select-none truncate">
            Turcanime
          </span>
        )}
        <button
          onClick={() => void toggleCollapsed()}
          aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          aria-expanded={!collapsed}
          className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-colors cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/70"
        >
          <ChevronLeft
            className={`w-4 h-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      <nav className="flex flex-col gap-0.5 px-2 pt-1">
        {NAV_ITEMS.map(({ screen, icon: Icon, label }) => {
          const isActive = currentScreen === screen;
          return (
            <button
              key={screen}
              onClick={() => onNavigate(screen)}
              aria-label={collapsed ? label : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex items-center rounded-md text-sm transition-colors duration-150 cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/70 ${
                collapsed ? 'justify-center w-11 h-10 mx-auto' : 'justify-start gap-2.5 w-full px-2.5 py-2'
              } ${
                isActive
                  ? 'bg-neutral-800/60 text-purple-400'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && (
                <span className={`truncate ${isActive ? 'font-medium' : ''}`}>{label}</span>
              )}
              {screen === 'settings' && updateAvailable && (
                <span
                  className={`absolute w-2 h-2 rounded-full bg-purple-400 ${
                    collapsed ? 'top-1 right-1' : 'top-1.5 right-2'
                  }`}
                />
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
