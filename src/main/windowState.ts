import { screen, type BrowserWindow, type Rectangle } from 'electron';
import { store } from './store';

interface WindowState {
  bounds: Rectangle;
  maximized: boolean;
}

const WINDOW_STATE_KEY = 'windowState';

function isVisible(bounds: Rectangle): boolean {
  return screen.getAllDisplays().some((display) => {
    const { x, y, width, height } = display.workArea;
    return (
      bounds.x < x + width &&
      bounds.x + bounds.width > x &&
      bounds.y < y + height &&
      bounds.y + bounds.height > y
    );
  });
}

export function loadWindowState(): WindowState | null {
  const state = store.get(WINDOW_STATE_KEY) as WindowState | undefined;
  if (!state || !state.bounds) return null;
  if (!isVisible(state.bounds)) return null;
  return state;
}

export function saveWindowState(win: BrowserWindow): void {
  const state: WindowState = {
    bounds: win.getBounds(),
    maximized: win.isMaximized(),
  };
  store.set(WINDOW_STATE_KEY, state);
}
