import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../public/icon.png'),
    backgroundColor: '#0f172a',
    show: false,
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu
  createMenu();
}

function createMenu() {
  const template: any = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow?.webContents.send('open-settings');
          },
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Mining',
      submenu: [
        {
          label: 'Start Mining',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            mainWindow?.webContents.send('toggle-mining');
          },
        },
        { type: 'separator' },
        {
          label: 'View Statistics',
          click: () => {
            mainWindow?.webContents.send('view-stats');
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => {
            mainWindow?.webContents.send('open-docs');
          },
        },
        {
          label: 'About',
          click: () => {
            mainWindow?.webContents.send('open-about');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('get-system-info', async () => {
  const os = await import('os');
  return {
    platform: process.platform,
    arch: process.arch,
    cpus: os.cpus().length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    hostname: os.hostname(),
  };
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('minimize-window', () => {
  mainWindow?.minimize();
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('close-window', () => {
  mainWindow?.close();
});

// Mining control handlers
let miningWorker: any = null;

ipcMain.handle('start-mining', async (event, config) => {
  try {
    // In production, this would start actual mining
    // For now, we'll simulate it
    return { success: true, message: 'Mining started successfully' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('stop-mining', async () => {
  try {
    if (miningWorker) {
      miningWorker.terminate();
      miningWorker = null;
    }
    return { success: true, message: 'Mining stopped successfully' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('get-mining-stats', async () => {
  // Return simulated stats - in production this would come from the mining worker
  return {
    hashrate: Math.random() * 100,
    shares: Math.floor(Math.random() * 1000),
    accepted: Math.floor(Math.random() * 950),
    rejected: Math.floor(Math.random() * 50),
    earnings: Math.random() * 10,
    uptime: Date.now(),
  };
});
