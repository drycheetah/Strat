import type { HistoryEntry } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface HistoryProps {
  history: HistoryEntry[];
}

const History = ({ history }: HistoryProps) => {
  const formatHashrate = (hr: number): string => {
    if (hr >= 1000000) return `${(hr / 1000000).toFixed(2)} MH/s`;
    if (hr >= 1000) return `${(hr / 1000).toFixed(2)} KH/s`;
    return `${hr.toFixed(2)} H/s`;
  };

  const hourlyData = history.reduce((acc: any[], entry) => {
    const hour = new Date(entry.timestamp).getHours();
    const existing = acc.find(item => item.hour === hour);
    if (existing) {
      existing.hashrate = (existing.hashrate + entry.hashrate) / 2;
      existing.shares += entry.shares;
      existing.earnings += entry.earnings;
    } else {
      acc.push({
        hour: `${hour}:00`,
        hashrate: entry.hashrate / 1000, // KH/s
        shares: entry.shares,
        earnings: entry.earnings,
      });
    }
    return acc;
  }, []);

  const totalStats = history.reduce(
    (acc, entry) => ({
      shares: acc.shares + entry.shares,
      accepted: acc.accepted + entry.accepted,
      rejected: acc.rejected + entry.rejected,
      earnings: acc.earnings + entry.earnings,
    }),
    { shares: 0, accepted: 0, rejected: 0, earnings: 0 }
  );

  if (history.length === 0) {
    return (
      <div className="history">
        <div className="history-header">
          <h2>Mining History</h2>
        </div>
        <div className="empty-state">
          <p>No mining history yet. Start mining to see statistics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history">
      <div className="history-header">
        <h2>Mining History</h2>
        <div className="history-stats">
          <div className="history-stat">
            <span className="stat-label">Total Shares</span>
            <span className="stat-value">{totalStats.shares}</span>
          </div>
          <div className="history-stat">
            <span className="stat-label">Accepted</span>
            <span className="stat-value success">{totalStats.accepted}</span>
          </div>
          <div className="history-stat">
            <span className="stat-label">Rejected</span>
            <span className="stat-value danger">{totalStats.rejected}</span>
          </div>
          <div className="history-stat">
            <span className="stat-label">Total Earnings</span>
            <span className="stat-value">{totalStats.earnings.toFixed(4)} STRAT</span>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h3>Hashrate by Hour</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="hour" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" label={{ value: 'KH/s', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Bar dataKey="hashrate" fill="#3b82f6" name="Hashrate (KH/s)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Shares by Hour</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="hour" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Bar dataKey="shares" fill="#10b981" name="Shares" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Earnings Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history.slice(-60).map(e => ({ time: new Date(e.timestamp).toLocaleTimeString(), earnings: e.earnings }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Line type="monotone" dataKey="earnings" stroke="#f59e0b" strokeWidth={2} dot={false} name="Earnings (STRAT)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="history-table">
        <h3>Recent Activity</h3>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Hashrate</th>
              <th>Shares</th>
              <th>Accepted</th>
              <th>Rejected</th>
              <th>Earnings</th>
            </tr>
          </thead>
          <tbody>
            {history.slice(-20).reverse().map((entry, index) => (
              <tr key={index}>
                <td>{new Date(entry.timestamp).toLocaleString()}</td>
                <td>{formatHashrate(entry.hashrate)}</td>
                <td>{entry.shares}</td>
                <td className="success">{entry.accepted}</td>
                <td className="danger">{entry.rejected}</td>
                <td>{entry.earnings.toFixed(6)} STRAT</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default History;
