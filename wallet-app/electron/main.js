const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const isDev = process.env.NODE_ENV === 'development';

// User data paths
const userDataPath = app.getPath('userData');
const walletDataPath = path.join(userDataPath, 'wallet-data');

// Ensure wallet data directory exists
if (!fs.existsSync(walletDataPath)) {
  fs.mkdirSync(walletDataPath, { recursive: true });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#0f172a',
    show: false,
    autoHideMenuBar: true,
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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

// IPC Handlers for secure file operations

// Save encrypted wallet data
ipcMain.handle('save-wallet-data', async (event, data) => {
  try {
    const filePath = path.join(walletDataPath, 'wallet.dat');
    fs.writeFileSync(filePath, data, 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Error saving wallet data:', error);
    return { success: false, error: error.message };
  }
});

// Load encrypted wallet data
ipcMain.handle('load-wallet-data', async () => {
  try {
    const filePath = path.join(walletDataPath, 'wallet.dat');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return { success: true, data };
    }
    return { success: false, error: 'Wallet file not found' };
  } catch (error) {
    console.error('Error loading wallet data:', error);
    return { success: false, error: error.message };
  }
});

// Check if wallet exists
ipcMain.handle('wallet-exists', async () => {
  try {
    const filePath = path.join(walletDataPath, 'wallet.dat');
    return fs.existsSync(filePath);
  } catch (error) {
    console.error('Error checking wallet existence:', error);
    return false;
  }
});

// Delete wallet data
ipcMain.handle('delete-wallet-data', async () => {
  try {
    const filePath = path.join(walletDataPath, 'wallet.dat');
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { success: true };
  } catch (error) {
    console.error('Error deleting wallet data:', error);
    return { success: false, error: error.message };
  }
});

// Save address book
ipcMain.handle('save-address-book', async (event, data) => {
  try {
    const filePath = path.join(walletDataPath, 'address-book.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Error saving address book:', error);
    return { success: false, error: error.message };
  }
});

// Load address book
ipcMain.handle('load-address-book', async () => {
  try {
    const filePath = path.join(walletDataPath, 'address-book.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return { success: true, data: JSON.parse(data) };
    }
    return { success: true, data: [] };
  } catch (error) {
    console.error('Error loading address book:', error);
    return { success: false, error: error.message };
  }
});

// Get app version
ipcMain.handle('get-app-version', async () => {
  return app.getVersion();
});

// Get platform
ipcMain.handle('get-platform', async () => {
  return process.platform;
});
