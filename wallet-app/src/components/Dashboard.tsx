import React, { useEffect, useState } from 'react';
import {
  WalletIcon,
  PaperAirplaneIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  Cog6ToothIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { WalletView } from './WalletView';
import { Send } from './Send';
import { Receive } from './Receive';
import { History } from './History';
import { Settings } from './Settings';
import { AddressBook } from './AddressBook';
import { WalletAccount } from '../utils/wallet';
import { StratisAPI } from '../services/api';
import { AddressBookEntry } from '../utils/storage';

interface DashboardProps {
  accounts: WalletAccount[];
  currentAccountIndex: number;
  isTestnet: boolean;
  onAccountChange: (index: number) => void;
  onAddAccount: () => void;
  onLogout: () => void;
  onNetworkChange: (isTestnet: boolean) => void;
  addressBook: AddressBookEntry[];
  onAddressBookUpdate: (entries: AddressBookEntry[]) => void;
}

type View = 'wallet' | 'send' | 'receive' | 'history' | 'settings' | 'addressbook';

export const Dashboard: React.FC<DashboardProps> = ({
  accounts,
  currentAccountIndex,
  isTestnet,
  onAccountChange,
  onAddAccount,
  onLogout,
  onNetworkChange,
  addressBook,
  onAddressBookUpdate,
}) => {
  const [currentView, setCurrentView] = useState<View>('wallet');
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  const currentAccount = accounts[currentAccountIndex];
  const api = new StratisAPI(isTestnet);

  useEffect(() => {
    loadBalance();
    const interval = setInterval(loadBalance, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [currentAccount.address, isTestnet]);

  const loadBalance = async () => {
    setLoading(true);
    try {
      const balanceData = await api.getBalance(currentAccount.address);
      setBalance(balanceData.total);
    } catch (error) {
      console.error('Error loading balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { id: 'wallet' as View, label: 'Wallet', icon: WalletIcon },
    { id: 'send' as View, label: 'Send', icon: PaperAirplaneIcon },
    { id: 'receive' as View, label: 'Receive', icon: ArrowDownTrayIcon },
    { id: 'history' as View, label: 'History', icon: ClockIcon },
    { id: 'addressbook' as View, label: 'Address Book', icon: BookOpenIcon },
    { id: 'settings' as View, label: 'Settings', icon: Cog6ToothIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-primary-400">STRAT Wallet</h1>
          <p className="text-xs text-gray-500 mt-1">
            {isTestnet ? 'Testnet' : 'Mainnet'}
          </p>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`nav-item w-full ${
                    isActive ? 'nav-item-active' : 'nav-item-inactive'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="bg-slate-700/50 rounded-lg p-3 mb-3">
            <div className="text-xs text-gray-400 mb-1">Total Balance</div>
            <div className="text-xl font-bold text-white">
              {loading ? (
                <span className="animate-pulse">...</span>
              ) : (
                `${balance.toFixed(8)} STRAT`
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {currentView === 'wallet' && (
            <WalletView
              accounts={accounts}
              currentAccountIndex={currentAccountIndex}
              isTestnet={isTestnet}
              onAccountChange={onAccountChange}
              onAddAccount={onAddAccount}
              onRefresh={loadBalance}
            />
          )}

          {currentView === 'send' && (
            <Send
              currentAccount={currentAccount}
              isTestnet={isTestnet}
              onSuccess={loadBalance}
              addressBook={addressBook}
            />
          )}

          {currentView === 'receive' && (
            <Receive currentAccount={currentAccount} />
          )}

          {currentView === 'history' && (
            <History address={currentAccount.address} isTestnet={isTestnet} />
          )}

          {currentView === 'addressbook' && (
            <AddressBook
              entries={addressBook}
              onUpdate={onAddressBookUpdate}
              isTestnet={isTestnet}
            />
          )}

          {currentView === 'settings' && (
            <Settings
              isTestnet={isTestnet}
              onNetworkChange={onNetworkChange}
              onLogout={onLogout}
            />
          )}
        </div>
      </div>
    </div>
  );
};
