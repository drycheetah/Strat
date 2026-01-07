/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
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
