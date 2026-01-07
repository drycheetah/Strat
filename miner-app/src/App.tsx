import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import History from './components/History';
import Pools from './components/Pools';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { useMining } from './hooks/useMining';
import { useSystemMonitor } from './hooks/useSystemMonitor';
import type { MiningConfig } from './types';
import './App.css';

type View = 'dashboard' | 'settings' | 'history' | 'pools';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [config, setConfig] = useState<MiningConfig>({
    mode: 'pool',
    poolUrl: 'stratum+tcp://pool.strat.network:3333',
    walletAddress: '',
    miningType: 'cpu',
    threads: navigator.hardwareConcurrency || 4,
    intensity: 5,
    algorithm: 'sha256',
    autoStart: false,
    difficulty: 4,
  });

  const mining = useMining();
  const systemInfo = useSystemMonitor();

  // Load saved config
  useEffect(() => {
    const savedConfig = localStorage.getItem('miningConfig');
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      setConfig(parsed);

      // Auto-start if configured
      if (parsed.autoStart && parsed.walletAddress) {
        mining.startMining(parsed);
      }
    }
  }, []);

  // Save config changes
  useEffect(() => {
    localStorage.setItem('miningConfig', JSON.stringify(config));
  }, [config]);

  const handleConfigChange = (newConfig: Partial<MiningConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    if (mining.isMining) {
      mining.updateConfig(updated);
    }
  };

  const handleToggleMining = async () => {
    if (mining.isMining) {
      await mining.stopMining();
    } else {
      if (!config.walletAddress) {
        alert('Please enter your wallet address in Settings before mining.');
        setCurrentView('settings');
        return;
      }
      await mining.startMining(config);
    }
  };

  return (
    <div className="app">
      <Header
        isMining={mining.isMining}
        onToggleMining={handleToggleMining}
        hashrate={mining.stats.hashrate}
      />
      <div className="app-container">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />
        <main className="main-content">
          {currentView === 'dashboard' && (
            <Dashboard
              stats={mining.stats}
              systemInfo={systemInfo}
              isMining={mining.isMining}
              history={mining.history}
            />
          )}
          {currentView === 'settings' && (
            <Settings
              config={config}
              onConfigChange={handleConfigChange}
              isMining={mining.isMining}
            />
          )}
          {currentView === 'history' && (
            <History history={mining.history} />
          )}
          {currentView === 'pools' && (
            <Pools
              currentPool={config.poolUrl}
              onSelectPool={(url) => handleConfigChange({ poolUrl: url })}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
