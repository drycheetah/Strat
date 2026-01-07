import { WalletData } from './wallet';
import { Encryption } from './encryption';

export interface AddressBookEntry {
  id: string;
  name: string;
  address: string;
  note?: string;
  createdAt: number;
}

export class WalletStorage {
  static async saveWallet(walletData: WalletData, password: string): Promise<void> {
    try {
      const jsonData = JSON.stringify(walletData);
      const encryptedData = Encryption.encrypt(jsonData, password);

      const result = await window.electronAPI.saveWalletData(encryptedData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to save wallet');
      }
    } catch (error) {
      console.error('Error saving wallet:', error);
      throw error;
    }
  }

  static async loadWallet(password: string): Promise<WalletData | null> {
    try {
      const result = await window.electronAPI.loadWalletData();

      if (!result.success) {
        return null;
      }

      const decryptedData = Encryption.decrypt(result.data, password);
      const walletData: WalletData = JSON.parse(decryptedData);

      return walletData;
    } catch (error) {
      console.error('Error loading wallet:', error);
      throw new Error('Failed to load wallet - incorrect password or corrupted data');
    }
  }

  static async walletExists(): Promise<boolean> {
    try {
      return await window.electronAPI.walletExists();
    } catch (error) {
      console.error('Error checking wallet existence:', error);
      return false;
    }
  }

  static async deleteWallet(): Promise<void> {
    try {
      const result = await window.electronAPI.deleteWalletData();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete wallet');
      }
    } catch (error) {
      console.error('Error deleting wallet:', error);
      throw error;
    }
  }

  static async saveAddressBook(entries: AddressBookEntry[]): Promise<void> {
    try {
      const result = await window.electronAPI.saveAddressBook(entries);

      if (!result.success) {
        throw new Error(result.error || 'Failed to save address book');
      }
    } catch (error) {
      console.error('Error saving address book:', error);
      throw error;
    }
  }

  static async loadAddressBook(): Promise<AddressBookEntry[]> {
    try {
      const result = await window.electronAPI.loadAddressBook();

      if (!result.success) {
        return [];
      }

      return result.data || [];
    } catch (error) {
      console.error('Error loading address book:', error);
      return [];
    }
  }

  static exportWallet(walletData: WalletData, password: string): string {
    const jsonData = JSON.stringify(walletData);
    const encryptedData = Encryption.encrypt(jsonData, password);
    return encryptedData;
  }

  static importWallet(encryptedData: string, password: string): WalletData {
    try {
      const decryptedData = Encryption.decrypt(encryptedData, password);
      const walletData: WalletData = JSON.parse(decryptedData);
      return walletData;
    } catch (error) {
      throw new Error('Failed to import wallet - incorrect password or invalid data');
    }
  }
}
