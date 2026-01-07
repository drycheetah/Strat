import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // System info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),

  // Mining controls
  startMining: (config: any) => ipcRenderer.invoke('start-mining', config),
  stopMining: () => ipcRenderer.invoke('stop-mining'),
  getMiningStats: () => ipcRenderer.invoke('get-mining-stats'),

  // Event listeners
  onOpenSettings: (callback: () => void) => ipcRenderer.on('open-settings', callback),
  onToggleMining: (callback: () => void) => ipcRenderer.on('toggle-mining', callback),
  onViewStats: (callback: () => void) => ipcRenderer.on('view-stats', callback),
  onOpenDocs: (callback: () => void) => ipcRenderer.on('open-docs', callback),
  onOpenAbout: (callback: () => void) => ipcRenderer.on('open-about', callback),
});

// Type definitions for TypeScript
declare global {
  interface Window {
    electronAPI: {
      getSystemInfo: () => Promise<{
        platform: string;
        arch: string;
        cpus: number;
        totalMemory: number;
        freeMemory: number;
        hostname: string;
      }>;
      getAppVersion: () => Promise<string>;
      minimizeWindow: () => Promise<void>;
      maximizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
      startMining: (config: any) => Promise<{ success: boolean; message: string }>;
      stopMining: () => Promise<{ success: boolean; message: string }>;
      getMiningStats: () => Promise<any>;
      onOpenSettings: (callback: () => void) => void;
      onToggleMining: (callback: () => void) => void;
      onViewStats: (callback: () => void) => void;
      onOpenDocs: (callback: () => void) => void;
      onOpenAbout: (callback: () => void) => void;
    };
  }
}
