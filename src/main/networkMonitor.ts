import { net, powerMonitor, type BrowserWindow } from 'electron';
import { logger } from './logger';

const REACHABILITY_URL = 'https://clients3.google.com/generate_204';
const REACHABILITY_TIMEOUT = 5000;
const POLL_INTERVAL = 30_000;
const POLL_JITTER = 5_000;
// The network can still be reconnecting when the resume event fires;
// a second probe catches the restored link without waiting a full poll.
const RESUME_RECHECK_DELAY_MS = 1_000;
const MAX_RESUME_PROBES = 4;

let lastIsReachable = true;
let mainWindow: BrowserWindow | undefined;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPromise: Promise<boolean> | null = null;
let resumeTimer: ReturnType<typeof setTimeout> | null = null;
let resumeProbes = 0;

function jitteredInterval(): number {
  return POLL_INTERVAL + Math.floor(Math.random() * POLL_JITTER * 2) - POLL_JITTER;
}

function schedulePoll(): void {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = setTimeout(() => {
    pollTimer = null;
    // net.online is a hint, not the source of truth. After a suspend it
    // can stay false after the link is back, so every poll must probe.
    void refreshAndNotify().finally(schedulePoll);
  }, jitteredInterval());
}

// Optional chaining does not protect against destroyed windows, which throw
// "Object has been destroyed" when reaching into a closed BrowserWindow.
function notify(online: boolean): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('network:status-changed', online);
  }
}

function notifyResume(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('network:resume');
  }
}

// Probe immediately, then once per second while the link is still
// settling. The resume event reaches the renderer only after a probe
// succeeds, so recovery never fires against a network that is still down.
function probeAfterResume(): void {
  void refreshAndNotify().then((reachable) => {
    if (reachable) {
      resumeProbes = 0;
      notifyResume();
      return;
    }
    resumeProbes += 1;
    if (resumeProbes < MAX_RESUME_PROBES) {
      resumeTimer = setTimeout(probeAfterResume, RESUME_RECHECK_DELAY_MS);
    }
  });
}

function handleSystemResume(): void {
  logger.info('Network', 'System resumed, probing connectivity');
  resumeProbes = 0;
  if (resumeTimer) clearTimeout(resumeTimer);
  resumeTimer = null;
  probeAfterResume();
}

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
  if (pendingPromise) return pendingPromise;
  pendingPromise = (async () => {
    const reachable = await checkReachable();
    if (reachable !== lastIsReachable) {
      logger.info('Network', `Reachability changed: ${reachable ? 'online' : 'offline'}`);
      lastIsReachable = reachable;
      notify(reachable);
    }
    return reachable;
  })();
  try {
    return await pendingPromise;
  } finally {
    pendingPromise = null;
  }
}

export const networkMonitor = {
  setMainWindow(win: BrowserWindow): void {
    mainWindow = win;
  },

  start(): void {
    if (pollTimer) return;
    lastIsReachable = true;
    powerMonitor.on('resume', handleSystemResume);
    void refreshAndNotify();
    schedulePoll();
  },

  stop(): void {
    powerMonitor.removeListener('resume', handleSystemResume);
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
    if (resumeTimer) {
      clearTimeout(resumeTimer);
      resumeTimer = null;
    }
    resumeProbes = 0;
  },

  async check(): Promise<boolean> {
    return refreshAndNotify();
  },
};
