import { useState } from 'react';
import type { Pool } from '../types';

interface PoolsProps {
  currentPool: string;
  onSelectPool: (url: string) => void;
}

const Pools = ({ currentPool, onSelectPool }: PoolsProps) => {
  const [pools] = useState<Pool[]>([
    {
      name: 'STRAT Official Pool',
      url: 'stratum+tcp://pool.strat.network:3333',
      fee: 1,
      minPayout: 10,
      difficulty: 'Variable',
      miners: 1250,
      hashrate: '2.5 GH/s',
    },
    {
      name: 'MiningPool Hub',
      url: 'stratum+tcp://hub.miningpool.com:20535',
      fee: 0.9,
      minPayout: 5,
      difficulty: 'Variable',
      miners: 3420,
      hashrate: '8.2 GH/s',
    },
    {
      name: 'CryptoPool',
      url: 'stratum+tcp://strat.cryptopool.io:3333',
      fee: 1.5,
      minPayout: 20,
      difficulty: 'Fixed 8',
      miners: 890,
      hashrate: '1.8 GH/s',
    },
    {
      name: 'ZPool',
      url: 'stratum+tcp://sha256.zpool.ca:3333',
      fee: 2,
      minPayout: 15,
      difficulty: 'Variable',
      miners: 2100,
      hashrate: '5.4 GH/s',
    },
    {
      name: 'ProHashing',
      url: 'stratum+tcp://prohashing.com:3333',
      fee: 1.99,
      minPayout: 1,
      difficulty: 'Auto',
      miners: 1580,
      hashrate: '3.2 GH/s',
    },
  ]);

  return (
    <div className="pools">
      <div className="pools-header">
        <h2>Mining Pools</h2>
        <p className="pools-description">
          Select a mining pool to join. Pools combine hashpower from multiple miners to find blocks more consistently.
        </p>
      </div>

      <div className="pools-grid">
        {pools.map((pool, index) => (
          <div
            key={index}
            className={`pool-card ${currentPool === pool.url ? 'active' : ''}`}
            onClick={() => onSelectPool(pool.url)}
          >
            <div className="pool-header">
              <h3>{pool.name}</h3>
              {currentPool === pool.url && (
                <span className="pool-badge">Connected</span>
              )}
            </div>

            <div className="pool-stats">
              <div className="pool-stat">
                <span className="pool-stat-label">Fee</span>
                <span className="pool-stat-value">{pool.fee}%</span>
              </div>
              <div className="pool-stat">
                <span className="pool-stat-label">Min Payout</span>
                <span className="pool-stat-value">{pool.minPayout} STRAT</span>
              </div>
              <div className="pool-stat">
                <span className="pool-stat-label">Difficulty</span>
                <span className="pool-stat-value">{pool.difficulty}</span>
              </div>
            </div>

            <div className="pool-info">
              <div className="pool-info-row">
                <span className="pool-info-label">Active Miners:</span>
                <span className="pool-info-value">{pool.miners.toLocaleString()}</span>
              </div>
              <div className="pool-info-row">
                <span className="pool-info-label">Pool Hashrate:</span>
                <span className="pool-info-value">{pool.hashrate}</span>
              </div>
              <div className="pool-info-row">
                <span className="pool-info-label">URL:</span>
                <span className="pool-info-value pool-url">{pool.url}</span>
              </div>
            </div>

            <button className="pool-select-btn">
              {currentPool === pool.url ? 'Currently Selected' : 'Select Pool'}
            </button>
          </div>
        ))}
      </div>

      <div className="custom-pool">
        <h3>Custom Pool</h3>
        <div className="form-group">
          <label htmlFor="custom-pool">Enter custom pool URL</label>
          <div className="input-group">
            <input
              id="custom-pool"
              type="text"
              placeholder="stratum+tcp://your-pool.com:3333"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const input = e.target as HTMLInputElement;
                  if (input.value) {
                    onSelectPool(input.value);
                    input.value = '';
                  }
                }
              }}
            />
            <button
              onClick={() => {
                const input = document.getElementById('custom-pool') as HTMLInputElement;
                if (input.value) {
                  onSelectPool(input.value);
                  input.value = '';
                }
              }}
            >
              Add Pool
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pools;
