import type { SystemInfo } from '../types';

interface SystemMonitorProps {
  systemInfo: SystemInfo;
}

const SystemMonitor = ({ systemInfo }: SystemMonitorProps) => {
  const formatBytes = (bytes: number): string => {
    const gb = bytes / (1024 ** 3);
    return `${gb.toFixed(2)} GB`;
  };

  const getStatusColor = (value: number, thresholds: { warning: number; danger: number }): string => {
    if (value >= thresholds.danger) return 'danger';
    if (value >= thresholds.warning) return 'warning';
    return 'good';
  };

  const cpuColor = getStatusColor(systemInfo.cpuUsage || 0, { warning: 70, danger: 90 });
  const memColor = getStatusColor(systemInfo.memoryUsage || 0, { warning: 70, danger: 90 });
  const tempColor = getStatusColor(systemInfo.temperature || 0, { warning: 70, danger: 85 });

  return (
    <div className="system-monitor">
      <div className="monitor-item">
        <div className="monitor-header">
          <span className="monitor-label">CPU Usage</span>
          <span className="monitor-value">{(systemInfo.cpuUsage || 0).toFixed(1)}%</span>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-fill ${cpuColor}`}
            style={{ width: `${systemInfo.cpuUsage || 0}%` }}
          ></div>
        </div>
      </div>

      <div className="monitor-item">
        <div className="monitor-header">
          <span className="monitor-label">Memory Usage</span>
          <span className="monitor-value">{(systemInfo.memoryUsage || 0).toFixed(1)}%</span>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-fill ${memColor}`}
            style={{ width: `${systemInfo.memoryUsage || 0}%` }}
          ></div>
        </div>
        <div className="monitor-details">
          {formatBytes(systemInfo.totalMemory - systemInfo.freeMemory)} / {formatBytes(systemInfo.totalMemory)}
        </div>
      </div>

      <div className="monitor-item">
        <div className="monitor-header">
          <span className="monitor-label">Temperature</span>
          <span className="monitor-value">{(systemInfo.temperature || 0).toFixed(1)}°C</span>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-fill ${tempColor}`}
            style={{ width: `${Math.min((systemInfo.temperature || 0) / 100 * 100, 100)}%` }}
          ></div>
        </div>
      </div>

      <div className="monitor-item">
        <div className="monitor-header">
          <span className="monitor-label">Power Consumption</span>
          <span className="monitor-value">{(systemInfo.power || 0).toFixed(0)}W</span>
        </div>
      </div>

      <div className="system-info">
        <div className="info-row">
          <span className="info-label">Platform:</span>
          <span className="info-value">{systemInfo.platform}</span>
        </div>
        <div className="info-row">
          <span className="info-label">CPUs:</span>
          <span className="info-value">{systemInfo.cpus}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Architecture:</span>
          <span className="info-value">{systemInfo.arch}</span>
        </div>
      </div>
    </div>
  );
};

export default SystemMonitor;
