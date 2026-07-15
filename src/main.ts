import { app, BrowserWindow, Menu } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { hiddenSession } from './main/sessionHidden';
import { registerIpcHandlers, setMainWindow } from './main/ipcHandlers';
import { loadWindowState, saveWindowState } from './main/windowState';
import { logger } from './main/logger';

// On Linux/Wayland, match the WM_CLASS to the .desktop filename
// so the compositor associates the correct icon with the window.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('--class', 'turcanime-desktop');
}

if (started) {
  app.quit();
}

logger.info('App', 'Starting application');
registerIpcHandlers();

const createWindow = () => {
  const saved = loadWindowState();
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#0f0f11',
    icon: app.isPackaged
      ? path.join(process.resourcesPath, 'assets', 'icon.png')
      : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      partition: 'persist:anime-session',
    },
  });

  if (saved) {
    if (saved.maximized) {
      mainWindow.maximize();
    } else {
      mainWindow.setBounds(saved.bounds);
    }
  } else {
    mainWindow.maximize();
  }

  mainWindow.on('close', () => saveWindowState(mainWindow));

  mainWindow.on('enter-full-screen', () => {
    mainWindow.webContents.send('player:fullscreen', true);
  });
  mainWindow.on('leave-full-screen', () => {
    mainWindow.webContents.send('player:fullscreen', false);
  });

  setMainWindow(mainWindow);



  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
};

app.on('ready', () => {
  logger.info('App', 'App ready, creating window');
  Menu.setApplicationMenu(null);

  hiddenSession.create();
  createWindow();

  hiddenSession.refreshSession().then((session) => {
    if (session.cookies.length > 0) {
      logger.info('App', `Initial session acquired (${session.cookies.length} chars)`);
    } else {
      logger.warn('App', 'Initial session returned empty cookies');
    }
  }).catch((err) => {
    logger.error('App', 'Initial session refresh failed', err);
  });
});

app.on('window-all-closed', () => {
  logger.info('App', 'Window closed, quitting');
  if (process.platform !== 'darwin') {
    hiddenSession.destroy();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    logger.debug('App', 'Activate event, recreating window');
    createWindow();
  }
});
