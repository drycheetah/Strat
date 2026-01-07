import React, { useState, useEffect } from 'react';
import { CreateWallet } from './components/CreateWallet';
import { UnlockWallet } from './components/UnlockWallet';
import { RestoreWallet } from './components/RestoreWallet';
import { Dashboard } from './components/Dashboard';
import { WalletStorage, AddressBookEntry } from './utils/storage';
import { StratisWallet, WalletData, WalletAccount } from './utils/wallet';

type AppState = 'loading' | 'new' | 'unlock' | 'restore' | 'unlocked';

function App() {
  const [state, setState] = useState<AppState>('loading');
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isTestnet, setIsTestnet] = useState(false);
  const [addressBook, setAddressBook] = useState<AddressBookEntry[]>([]);
  const [currentPassword, setCurrentPassword] = useState('');

  useEffect(() => {
    checkWalletExists();
    loadAddressBook();
  }, []);

  const checkWalletExists = async () => {
    const exists = await WalletStorage.walletExists();
    setState(exists ? 'unlock' : 'new');
  };

  const loadAddressBook = async () => {
    const entries = await WalletStorage.loadAddressBook();
    setAddressBook(entries);
  };

  const handleWalletCreated = async (mnemonic: string, password: string) => {
    try {
      const wallet = new StratisWallet(mnemonic, isTestnet);
      const accounts = wallet.deriveMultipleAccounts(1);

      const newWalletData: WalletData = {
        mnemonic,
        accounts,
        currentAccountIndex: 0,
      };

      await WalletStorage.saveWallet(newWalletData, password);
      setWalletData(newWalletData);
      setCurrentPassword(password);
      setState('unlocked');
    } catch (error) {
      console.error('Error creating wallet:', error);
      alert('Failed to create wallet. Please try again.');
    }
  };

  const handleWalletUnlocked = async (password: string) => {
    try {
      const data = await WalletStorage.loadWallet(password);
      if (!data) {
        throw new Error('Failed to load wallet');
      }
      setWalletData(data);
      setCurrentPassword(password);
      setState('unlocked');
    } catch (error: any) {
      throw new Error(error.message || 'Invalid password');
    }
  };

  const handleWalletRestored = async (mnemonic: string, password: string) => {
    try {
      const wallet = new StratisWallet(mnemonic, isTestnet);
      const accounts = wallet.deriveMultipleAccounts(1);

      const restoredWalletData: WalletData = {
        mnemonic,
        accounts,
        currentAccountIndex: 0,
      };

      await WalletStorage.saveWallet(restoredWalletData, password);
      setWalletData(restoredWalletData);
      setCurrentPassword(password);
      setState('unlocked');
    } catch (error) {
      console.error('Error restoring wallet:', error);
      alert('Failed to restore wallet. Please try again.');
    }
  };

  const handleAccountChange = (index: number) => {
    if (walletData) {
      const updatedData = { ...walletData, currentAccountIndex: index };
      setWalletData(updatedData);
      saveWalletData(updatedData);
    }
  };

  const handleAddAccount = () => {
    if (walletData) {
      const wallet = new StratisWallet(walletData.mnemonic, isTestnet);
      const newAccount = wallet.deriveAccount(walletData.accounts.length);
      const updatedData = {
        ...walletData,
        accounts: [...walletData.accounts, newAccount],
      };
      setWalletData(updatedData);
      saveWalletData(updatedData);
    }
  };

  const handleNetworkChange = (newIsTestnet: boolean) => {
    if (walletData) {
      // Re-derive all accounts with new network
      const wallet = new StratisWallet(walletData.mnemonic, newIsTestnet);
      const accounts = wallet.deriveMultipleAccounts(walletData.accounts.length);

      const updatedData = {
        ...walletData,
        accounts,
        currentAccountIndex: 0,
      };

      setWalletData(updatedData);
      setIsTestnet(newIsTestnet);
      saveWalletData(updatedData);
    }
  };

  const handleLogout = () => {
    setWalletData(null);
    setCurrentPassword('');
    setState('unlock');
  };

  const handleAddressBookUpdate = async (entries: AddressBookEntry[]) => {
    setAddressBook(entries);
    await WalletStorage.saveAddressBook(entries);
  };

  const saveWalletData = async (data: WalletData) => {
    try {
      await WalletStorage.saveWallet(data, currentPassword);
    } catch (error) {
      console.error('Error saving wallet data:', error);
    }
  };

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading wallet...</p>
        </div>
      </div>
    );
  }

  if (state === 'new') {
    return <CreateWallet onWalletCreated={handleWalletCreated} />;
  }

  if (state === 'unlock') {
    return (
      <UnlockWallet
        onUnlock={handleWalletUnlocked}
        onRestore={() => setState('restore')}
      />
    );
  }

  if (state === 'restore') {
    return (
      <RestoreWallet
        onWalletRestored={handleWalletRestored}
        onBack={() => setState('unlock')}
      />
    );
  }

  if (state === 'unlocked' && walletData) {
    return (
      <Dashboard
        accounts={walletData.accounts}
        currentAccountIndex={walletData.currentAccountIndex}
        isTestnet={isTestnet}
        onAccountChange={handleAccountChange}
        onAddAccount={handleAddAccount}
        onLogout={handleLogout}
        onNetworkChange={handleNetworkChange}
        addressBook={addressBook}
        onAddressBookUpdate={handleAddressBookUpdate}
      />
    );
  }

  return null;
}

export default App;
