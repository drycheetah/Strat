import { useState } from 'react';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { explorerApi } from '../lib/api';

type FilterType = 'all' | 'sent' | 'received' | 'mining' | 'staking';

export default function TransactionHistory() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const walletAddress = localStorage.getItem('walletAddress');

  const { data, loading } = useAutoRefresh<any>({
    fetchFn: () => explorerApi.getAddress(walletAddress!),
    interval: 5000, // Refresh every 5 seconds
    wsEvents: ['transaction:confirmed', 'block:new'],
    enabled: !!walletAddress,
  });

  const transactions = data?.transactions || [];

  // Apply filters
  let filteredTxs = transactions.filter((tx: any) => {
    if (filter === 'sent') return tx.from === walletAddress;
    if (filter === 'received') return tx.to === walletAddress && tx.type !== 'mining' && tx.type !== 'staking';
    if (filter === 'mining') return tx.type === 'mining';
    if (filter === 'staking') return tx.type === 'staking';
    return true;
  });

  // Apply search
  if (search) {
    filteredTxs = filteredTxs.filter((tx: any) =>
      (tx.hash && tx.hash.toLowerCase().includes(search.toLowerCase())) ||
      (tx.from && tx.from.toLowerCase().includes(search.toLowerCase())) ||
      (tx.to && tx.to.toLowerCase().includes(search.toLowerCase()))
    );
  }

  // Pagination
  const perPage = 20;
  const totalPages = Math.ceil(filteredTxs.length / perPage);
  const paginatedTxs = filteredTxs.slice((page - 1) * perPage, page * perPage);

  const filters = [
    { id: 'all', label: 'All Transactions' },
    { id: 'sent', label: 'Sent' },
    { id: 'received', label: 'Received' },
    { id: 'mining', label: 'Mining Rewards' },
    { id: 'staking', label: 'Staking Rewards' },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-green-400 focus:outline-none"
          >
            {filters.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by hash or address..."
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-green-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Transaction List */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-2xl font-bold mb-6">Transaction History</h3>

        {loading && paginatedTxs.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
          </div>
        ) : paginatedTxs.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            No transactions found
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedTxs.map((tx: any) => (
              <TransactionItem key={tx.hash} tx={tx} walletAddress={walletAddress!} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t border-white/10">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center justify-center text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>New transactions appear automatically</span>
        </div>
      </div>
    </div>
  );
}

interface TransactionItemProps {
  tx: any;
  walletAddress: string;
}

function TransactionItem({ tx, walletAddress }: TransactionItemProps) {
  const isSent = tx.from === walletAddress;
  const isMining = tx.type === 'mining';
  const isStaking = tx.type === 'staking';

  const getIcon = () => {
    if (isMining) return { icon: '⛏️', color: 'text-blue-400' };
    if (isStaking) return { icon: '💰', color: 'text-purple-400' };
    if (isSent) return { icon: '↗️', color: 'text-red-400' };
    return { icon: '↙️', color: 'text-green-400' };
  };

  const getLabel = () => {
    if (isMining) return 'Mining Reward';
    if (isStaking) return 'Staking Reward';
    if (isSent) return 'Sent';
    return 'Received';
  };

  const { icon, color } = getIcon();

  return (
    <div className="bg-white/5 p-4 rounded-xl hover:bg-white/10 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xl ${color}`}>{icon}</span>
            <span className="font-bold">{getLabel()}</span>
          </div>
          <div className="font-mono text-xs text-gray-400">
            Hash: {(tx.hash || 'N/A').substring(0, 32)}...
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {isMining || isStaking
              ? `From: Blockchain Network`
              : isSent
              ? `To: ${((tx.to || 'N/A').substring(0, 16))}...`
              : `From: ${((tx.from || 'Unknown').substring(0, 16))}...`}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-lg font-bold ${isSent && !isMining && !isStaking ? 'text-red-400' : 'text-green-400'}`}>
            {isSent && !isMining && !isStaking ? '-' : '+'}
            {(tx.amount || 0).toFixed(4)} STRAT
          </div>
          <div className="text-xs text-gray-500">
            {new Date(tx.timestamp || Date.now()).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
