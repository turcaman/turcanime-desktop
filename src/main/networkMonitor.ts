import { net, type BrowserWindow } from 'electron';
import { logger } from './logger';

const REACHABILITY_URL = 'https://clients3.google.com/generate_204';
const REACHABILITY_TIMEOUT = 5000;
const POLL_INTERVAL = 10_000;

let lastIsReachable: boolean | null = null;
let mainWindow: BrowserWindow | undefined;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let pendingCheck = false;

async function checkReachable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REACHABILITY_TIMEOUT);
    const res = await net.fetch(REACHABILITY_URL, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeout);
    return res.status === 204 || res.ok;
  } catch {
    return false;
  }
}

async function refreshAndNotify(): Promise<boolean> {
  if (pendingCheck) return lastIsReachable ?? false;
  pendingCheck = true;
  const reachable = await checkReachable();
  pendingCheck = false;
  if (reachable !== lastIsReachable) {
    logger.info('Network', `Reachability changed: ${reachable ? 'online' : 'offline'}`);
    lastIsReachable = reachable;
    mainWindow?.webContents.send('network:status-changed', reachable);
  }
  return reachable;
}

export const networkMonitor = {
  setMainWindow(win: BrowserWindow): void {
    mainWindow = win;
  },

  start(): void {
    if (pollTimer) return;
    lastIsReachable = null;
    void refreshAndNotify();
    pollTimer = setInterval(() => {
      const onlineFlag = net.online;
      if (!onlineFlag) {
        if (lastIsReachable !== false) {
          lastIsReachable = false;
          logger.info('Network', 'OS reports offline');
          mainWindow?.webContents.send('network:status-changed', false);
        }
        return;
      }
      void refreshAndNotify();
    }, POLL_INTERVAL);
  },

  stop(): void {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  },

  async check(): Promise<boolean> {
    return refreshAndNotify();
  },
};
