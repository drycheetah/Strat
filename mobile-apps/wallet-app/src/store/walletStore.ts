import { create } from 'zustand';
import WalletService, { Wallet } from '../services/WalletService';
import ApiService, { Transaction } from '../services/ApiService';

interface WalletState {
  wallet: Wallet | null;
  balance: number;
  unconfirmedBalance: number;
  stakingBalance: number;
  transactions: Transaction[];
  loading: boolean;
  error: string | null;

  // Actions
  createWallet: (password: string) => Promise<void>;
  importWallet: (mnemonic: string, password: string) => Promise<void>;
  loadWallet: (password: string) => Promise<void>;
  refreshBalance: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  sendTransaction: (to: string, amount: number) => Promise<string>;
  logout: () => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallet: null,
  balance: 0,
  unconfirmedBalance: 0,
  stakingBalance: 0,
  transactions: [],
  loading: false,
  error: null,

  createWallet: async (password: string) => {
    try {
      set({ loading: true, error: null });

      const wallet = await WalletService.generateWallet();
      await WalletService.saveWallet(wallet, password);

      // Connect to WebSocket
      ApiService.connectWebSocket(wallet.address);

      set({
        wallet,
        loading: false
      });

      // Refresh balance
      await get().refreshBalance();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create wallet',
        loading: false
      });
    }
  },

  importWallet: async (mnemonic: string, password: string) => {
    try {
      set({ loading: true, error: null });

      const wallet = await WalletService.createWalletFromMnemonic(mnemonic);
      await WalletService.saveWallet(wallet, password);

      // Connect to WebSocket
      ApiService.connectWebSocket(wallet.address);

      set({
        wallet,
        loading: false
      });

      // Refresh balance
      await get().refreshBalance();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to import wallet',
        loading: false
      });
    }
  },

  loadWallet: async (password: string) => {
    try {
      set({ loading: true, error: null });

      const wallet = await WalletService.loadWallet(password);

      if (!wallet) {
        throw new Error('No wallet found');
      }

      // Connect to WebSocket
      ApiService.connectWebSocket(wallet.address);

      set({
        wallet,
        loading: false
      });

      // Refresh data
      await Promise.all([
        get().refreshBalance(),
        get().refreshTransactions()
      ]);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load wallet',
        loading: false
      });
    }
  },

  refreshBalance: async () => {
    try {
      const { wallet } = get();
      if (!wallet) return;

      const balanceData = await ApiService.getBalance(wallet.address);

      set({
        balance: balanceData.balance,
        unconfirmedBalance: balanceData.unconfirmedBalance,
        stakingBalance: balanceData.stakingBalance
      });
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    }
  },

  refreshTransactions: async () => {
    try {
      const { wallet } = get();
      if (!wallet) return;

      const transactions = await ApiService.getTransactions(wallet.address);

      set({ transactions });
    } catch (error) {
      console.error('Failed to refresh transactions:', error);
    }
  },

  sendTransaction: async (to: string, amount: number) => {
    try {
      const { wallet } = get();
      if (!wallet) throw new Error('No wallet loaded');

      set({ loading: true, error: null });

      const result = await ApiService.sendTransaction(
        wallet.address,
        to,
        amount,
        wallet.privateKey
      );

      if (!result.success) {
        throw new Error('Transaction failed');
      }

      // Refresh data
      await Promise.all([
        get().refreshBalance(),
        get().refreshTransactions()
      ]);

      set({ loading: false });

      return result.hash;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Transaction failed',
        loading: false
      });
      throw error;
    }
  },

  logout: async () => {
    ApiService.disconnectWebSocket();
    set({
      wallet: null,
      balance: 0,
      unconfirmedBalance: 0,
      stakingBalance: 0,
      transactions: [],
      error: null
    });
  }
}));

export default useWalletStore;
