import React, { useEffect, useState } from 'react';
import {
  ArrowPathIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { StratisAPI, Transaction } from '../services/api';

interface HistoryProps {
  address: string;
  isTestnet: boolean;
}

export const History: React.FC<HistoryProps> = ({ address, isTestnet }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const api = new StratisAPI(isTestnet);

  useEffect(() => {
    loadTransactions();
  }, [address, isTestnet]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const txs = await api.getTransactions(address);
      setTransactions(txs);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const formatTxId = (txid: string): string => {
    return `${txid.slice(0, 10)}...${txid.slice(-10)}`;
  };

  const openExplorer = (txid: string) => {
    const explorerUrl = isTestnet
      ? `https://testnet-explorer.stratisplatform.com/tx/${txid}`
      : `https://explorer.stratisplatform.com/tx/${txid}`;
    window.open(explorerUrl, '_blank');
  };

  const filteredTransactions = transactions.filter(
    (tx) =>
      tx.txid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Transaction History</h1>
          <p className="text-gray-400 mt-1">View all your transactions</p>
        </div>
        <button
          onClick={loadTransactions}
          className="btn-secondary flex items-center gap-2"
          disabled={loading}
        >
          <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search Bar */}
      <div className="card mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-12"
            placeholder="Search by transaction ID or type..."
          />
        </div>
      </div>

      {/* Transactions List */}
      <div className="card">
        {loading ? (
          <div className="text-center py-12">
            <ArrowPathIcon className="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">
              {searchTerm ? 'No transactions found matching your search' : 'No transactions yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-400">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-400">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-400">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-400">Confirmations</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-400">Transaction ID</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr
                    key={tx.txid}
                    onClick={() => openExplorer(tx.txid)}
                    className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {tx.type === 'receive' ? (
                          <div className="bg-green-500/20 p-2 rounded-lg">
                            <ArrowDownIcon className="w-4 h-4 text-green-400" />
                          </div>
                        ) : (
                          <div className="bg-red-500/20 p-2 rounded-lg">
                            <ArrowUpIcon className="w-4 h-4 text-red-400" />
                          </div>
                        )}
                        <span className="capitalize font-medium">{tx.type}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`font-mono font-medium ${
                          tx.type === 'receive' ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {tx.type === 'receive' ? '+' : '-'}
                        {tx.amount.toFixed(8)} STRAT
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-gray-300">{formatDate(tx.time)}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          tx.confirmations >= 6
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {tx.confirmations} conf{tx.confirmations !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <code className="text-sm text-gray-400 font-mono">
                        {formatTxId(tx.txid)}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {!loading && filteredTransactions.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="card">
            <div className="text-sm text-gray-400 mb-1">Total Transactions</div>
            <div className="text-2xl font-bold">{filteredTransactions.length}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-400 mb-1">Received</div>
            <div className="text-2xl font-bold text-green-400">
              {filteredTransactions.filter((tx) => tx.type === 'receive').length}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-400 mb-1">Sent</div>
            <div className="text-2xl font-bold text-red-400">
              {filteredTransactions.filter((tx) => tx.type === 'send').length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
