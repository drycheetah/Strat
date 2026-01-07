const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Wallet data operations
  saveWalletData: (data) => ipcRenderer.invoke('save-wallet-data', data),
  loadWalletData: () => ipcRenderer.invoke('load-wallet-data'),
  walletExists: () => ipcRenderer.invoke('wallet-exists'),
  deleteWalletData: () => ipcRenderer.invoke('delete-wallet-data'),

  // Address book operations
  saveAddressBook: (data) => ipcRenderer.invoke('save-address-book', data),
  loadAddressBook: () => ipcRenderer.invoke('load-address-book'),

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
});
