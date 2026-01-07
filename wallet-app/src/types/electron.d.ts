export interface ElectronAPI {
  saveWalletData: (data: string) => Promise<{ success: boolean; error?: string }>;
  loadWalletData: () => Promise<{ success: boolean; data?: string; error?: string }>;
  walletExists: () => Promise<boolean>;
  deleteWalletData: () => Promise<{ success: boolean; error?: string }>;
  saveAddressBook: (data: any[]) => Promise<{ success: boolean; error?: string }>;
  loadAddressBook: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
