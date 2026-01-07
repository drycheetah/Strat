import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { HistoryEntry } from '../types';

interface HashrateChartProps {
  history: HistoryEntry[];
}

const HashrateChart = ({ history }: HashrateChartProps) => {
  const chartData = history.slice(-60).map((entry) => ({
    time: new Date(entry.timestamp).toLocaleTimeString(),
    hashrate: entry.hashrate / 1000, // Convert to KH/s for better display
    temperature: entry.temperature || 0,
  }));

  if (chartData.length === 0) {
    return (
      <div className="chart-empty">
        <p>Start mining to see hashrate statistics</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="time" stroke="#94a3b8" />
        <YAxis stroke="#94a3b8" label={{ value: 'KH/s', angle: -90, position: 'insideLeft' }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
          labelStyle={{ color: '#94a3b8' }}
        />
        <Line
          type="monotone"
          dataKey="hashrate"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          name="Hashrate (KH/s)"
        />
        <Line
          type="monotone"
          dataKey="temperature"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
          name="Temperature (°C)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default HashrateChart;
