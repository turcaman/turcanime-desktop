import { screen, type BrowserWindow, type Rectangle } from 'electron';
import { store } from './store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const electronStore = store as any;

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
  const state = electronStore.get(WINDOW_STATE_KEY) as WindowState | undefined;
  if (!state || !state.bounds) return null;
  if (!isVisible(state.bounds)) return null;
  return state;
}

export function saveWindowState(win: BrowserWindow): void {
  const state: WindowState = {
    bounds: win.getBounds(),
    maximized: win.isMaximized(),
  };
  electronStore.set(WINDOW_STATE_KEY, state);
}
