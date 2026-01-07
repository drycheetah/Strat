import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { explorerApi, walletApi } from '../lib/api';

interface PortfolioData {
  balance: number;
  stakedBalance: number;
  totalReceived: number;
}

export default function Portfolio() {
  const walletAddress = localStorage.getItem('walletAddress');

  const { data: addressData, loading: addressLoading } = useAutoRefresh<any>({
    fetchFn: () => explorerApi.getAddress(walletAddress!),
    interval: 5000, // Refresh every 5 seconds
    wsEvents: ['transaction:confirmed', 'block:new'],
    enabled: !!walletAddress,
  });

  const { data: walletInfo } = useAutoRefresh<any>({
    fetchFn: walletApi.getInfo,
    interval: 10000,
    wsEvents: ['stake:created', 'stake:withdrawn'],
    enabled: !!walletAddress,
  });

  if (addressLoading && !addressData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
      </div>
    );
  }

  const balance = addressData?.balance || 0;
  const staked = walletInfo?.wallet?.stakedBalance || 0;
  const totalReceived = addressData?.totalReceived || 0;
  const usdValue = (balance + staked) * 0.01; // Mock price

  const assets = [
    { name: 'Liquid STRAT', amount: balance, percent: (balance / (balance + staked) * 100) || 0, color: '#14f195' },
    { name: 'Staked STRAT', amount: staked, percent: (staked / (balance + staked) * 100) || 0, color: '#9945ff' },
  ];

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="glass rounded-2xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-sm text-gray-400 mb-2">Total Balance</div>
            <div className="text-4xl font-bold">{(balance + staked).toFixed(2)} STRAT</div>
            <div className="text-xl text-gray-400">${usdValue.toFixed(2)} USD</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-green-400">+0%</div>
            <div className="text-xs text-gray-500">24h change</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-white/10">
          <div>
            <div className="text-sm text-gray-400 mb-1">Available</div>
            <div className="text-2xl font-bold text-green-400">{balance.toFixed(2)} STRAT</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Staked</div>
            <div className="text-2xl font-bold text-purple-400">{staked.toFixed(2)} STRAT</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Total Earned</div>
            <div className="text-2xl font-bold text-yellow-400">{totalReceived.toFixed(2)} STRAT</div>
          </div>
        </div>
      </div>

      {/* Asset Breakdown */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-4">Asset Breakdown</h3>
        <div className="space-y-4">
          {assets.map((asset) => (
            <div key={asset.name}>
              <div className="flex justify-between text-sm mb-2">
                <span>{asset.name}</span>
                <span className="font-bold">{asset.amount.toFixed(2)} STRAT ({asset.percent.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${asset.percent}%`, backgroundColor: asset.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center justify-center text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>Balance updates in real-time</span>
        </div>
      </div>
    </div>
  );
}
