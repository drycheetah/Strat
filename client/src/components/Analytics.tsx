import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { explorerApi, stakingApi } from '../lib/api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ExplorerStats {
  blockHeight: number;
  difficulty: number;
  hashrate: number;
  avgBlockTime: number;
  pendingTransactions: number;
}

export default function Analytics() {
  const { data: stats, loading } = useAutoRefresh<{ success: boolean; stats: ExplorerStats }>({
    fetchFn: explorerApi.getStats,
    interval: 5000, // Refresh every 5 seconds
    wsEvents: ['block:new', 'transaction:new'],
  });

  const { data: stakingStats } = useAutoRefresh({
    fetchFn: stakingApi.getStats,
    interval: 10000,
    wsEvents: ['stake:created'],
  });

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
      </div>
    );
  }

  const explorerData = stats?.stats;
  const hashrate = typeof explorerData?.hashrate === 'string'
    ? parseFloat(explorerData.hashrate)
    : explorerData?.hashrate || 0;

  const blockTime = (explorerData?.avgBlockTime || 0) / 1000;
  const tvl = stakingStats?.data?.stats?.totalStaked || 0;

  // Mock chart data - replace with real historical data from API
  const difficultyData = Array.from({ length: 10 }, (_, i) => ({
    block: explorerData?.blockHeight ? explorerData.blockHeight - 9 + i : i,
    difficulty: (explorerData?.difficulty || 0) * (0.95 + Math.random() * 0.1),
  }));

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Network Hashrate"
          value={`${hashrate.toFixed(2)} H/s`}
          change="+12.5%"
          positive
        />
        <StatCard
          title="Avg Block Time"
          value={`${blockTime.toFixed(1)}s`}
          change="-5.2%"
          positive
        />
        <StatCard
          title="24h Transactions"
          value={explorerData?.pendingTransactions || 0}
          change="+23.1%"
          positive
        />
        <StatCard
          title="Total Value Locked"
          value={`${tvl.toFixed(2)} STRAT`}
          change="+8.7%"
          positive
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-4">Network Difficulty</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={difficultyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="block" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ background: '#1a1a1f', border: '1px solid #ffffff20', borderRadius: '8px' }}
              />
              <Line type="monotone" dataKey="difficulty" stroke="#14f195" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-4">Transaction Volume</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={difficultyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="block" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ background: '#1a1a1f', border: '1px solid #ffffff20', borderRadius: '8px' }}
              />
              <Bar dataKey="difficulty" fill="#9945ff" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center justify-center text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>Live updates every 5 seconds</span>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  positive: boolean;
}

function StatCard({ title, value, change, positive }: StatCardProps) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="text-sm text-gray-400 mb-2">{title}</div>
      <div className="text-3xl font-bold mb-2">{value}</div>
      <div className={`text-sm ${positive ? 'text-green-400' : 'text-red-400'}`}>
        {change} vs yesterday
      </div>
    </div>
  );
}
