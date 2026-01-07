import React, { useEffect, useState } from 'react';
import {
  PlusIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { WalletAccount } from '../utils/wallet';
import { StratisAPI } from '../services/api';

interface WalletViewProps {
  accounts: WalletAccount[];
  currentAccountIndex: number;
  isTestnet: boolean;
  onAccountChange: (index: number) => void;
  onAddAccount: () => void;
  onRefresh: () => void;
}

export const WalletView: React.FC<WalletViewProps> = ({
  accounts,
  currentAccountIndex,
  isTestnet,
  onAccountChange,
  onAddAccount,
  onRefresh,
}) => {
  const [balances, setBalances] = useState<{ [address: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState('');

  const api = new StratisAPI(isTestnet);

  useEffect(() => {
    loadAllBalances();
  }, [accounts, isTestnet]);

  const loadAllBalances = async () => {
    setLoading(true);
    const newBalances: { [address: string]: number } = {};

    for (const account of accounts) {
      try {
        const balance = await api.getBalance(account.address);
        newBalances[account.address] = balance.total;
      } catch (error) {
        console.error(`Error loading balance for ${account.address}:`, error);
        newBalances[account.address] = 0;
      }
    }

    setBalances(newBalances);
    setLoading(false);
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(''), 2000);
  };

  const totalBalance = Object.values(balances).reduce((sum, balance) => sum + balance, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Portfolio</h1>
          <p className="text-gray-400 mt-1">Manage your STRAT accounts</p>
        </div>
        <button
          onClick={() => {
            loadAllBalances();
            onRefresh();
          }}
          className="btn-secondary flex items-center gap-2"
          disabled={loading}
        >
          <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Total Balance Card */}
      <div className="card mb-8">
        <div className="text-sm text-gray-400 mb-2">Total Portfolio Value</div>
        <div className="text-4xl font-bold text-white mb-4">
          {loading ? (
            <span className="animate-pulse">Loading...</span>
          ) : (
            `${totalBalance.toFixed(8)} STRAT`
          )}
        </div>
        <div className="text-gray-500 text-sm">
          {accounts.length} {accounts.length === 1 ? 'Account' : 'Accounts'}
        </div>
      </div>

      {/* Accounts List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Your Accounts</h2>
          <button onClick={onAddAccount} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Add Account
          </button>
        </div>

        {accounts.map((account, index) => {
          const balance = balances[account.address] || 0;
          const isActive = index === currentAccountIndex;

          return (
            <div
              key={account.address}
              onClick={() => onAccountChange(index)}
              className={`card cursor-pointer transition-all ${
                isActive
                  ? 'ring-2 ring-primary-500 bg-slate-700'
                  : 'hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold">{account.name}</h3>
                    {isActive && (
                      <span className="px-2 py-1 bg-primary-500/20 text-primary-400 text-xs rounded-full">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <code className="text-sm text-gray-400 font-mono">
                      {account.address.slice(0, 20)}...{account.address.slice(-10)}
                    </code>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyAddress(account.address);
                      }}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {copiedAddress === account.address ? (
                        <CheckIcon className="w-4 h-4 text-green-400" />
                      ) : (
                        <ClipboardDocumentIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="text-sm text-gray-500">
                    Path: {account.path}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {loading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      `${balance.toFixed(8)}`
                    )}
                  </div>
                  <div className="text-sm text-gray-400">STRAT</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
