import type { MiningStats, SystemInfo, HistoryEntry } from '../types';
import StatsCard from './StatsCard';
import HashrateChart from './HashrateChart';
import SystemMonitor from './SystemMonitor';

interface DashboardProps {
  stats: MiningStats;
  systemInfo: SystemInfo;
  isMining: boolean;
  history: HistoryEntry[];
}

const Dashboard = ({ stats, systemInfo, isMining, history }: DashboardProps) => {
  const formatHashrate = (hr: number): string => {
    if (hr >= 1000000000) return `${(hr / 1000000000).toFixed(2)} GH/s`;
    if (hr >= 1000000) return `${(hr / 1000000).toFixed(2)} MH/s`;
    if (hr >= 1000) return `${(hr / 1000).toFixed(2)} KH/s`;
    return `${hr.toFixed(2)} H/s`;
  };

  const formatUptime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const acceptanceRate = stats.shares > 0
    ? ((stats.accepted / stats.shares) * 100).toFixed(2)
    : '0.00';

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Mining Dashboard</h2>
        <div className={`status-badge ${isMining ? 'mining' : 'stopped'}`}>
          {isMining ? 'Mining Active' : 'Mining Stopped'}
        </div>
      </div>

      <div className="stats-grid">
        <StatsCard
          title="Hashrate"
          value={formatHashrate(stats.hashrate)}
          icon="⚡"
          color="blue"
        />
        <StatsCard
          title="Shares"
          value={stats.shares.toString()}
          subtitle={`${stats.accepted} accepted / ${stats.rejected} rejected`}
          icon="📦"
          color="green"
        />
        <StatsCard
          title="Acceptance Rate"
          value={`${acceptanceRate}%`}
          icon="✓"
          color="purple"
        />
        <StatsCard
          title="Estimated Earnings"
          value={`${stats.estimatedEarnings.toFixed(4)} STRAT/day`}
          icon="💰"
          color="orange"
        />
        <StatsCard
          title="Uptime"
          value={formatUptime(stats.uptime)}
          icon="⏱️"
          color="cyan"
        />
        <StatsCard
          title="Last Share"
          value={stats.lastShareTime
            ? new Date(stats.lastShareTime).toLocaleTimeString()
            : 'Never'}
          icon="🎯"
          color="pink"
        />
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h3>Hashrate Over Time</h3>
          <HashrateChart history={history} />
        </div>
        <div className="chart-container">
          <h3>System Monitor</h3>
          <SystemMonitor systemInfo={systemInfo} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
