import type { MiningConfig } from '../types';

interface SettingsProps {
  config: MiningConfig;
  onConfigChange: (config: Partial<MiningConfig>) => void;
  isMining: boolean;
}

const Settings = ({ config, onConfigChange, isMining }: SettingsProps) => {
  return (
    <div className="settings">
      <div className="settings-header">
        <h2>Mining Settings</h2>
        {isMining && (
          <div className="settings-warning">
            Stop mining to change some settings
          </div>
        )}
      </div>

      <div className="settings-content">
        <section className="settings-section">
          <h3>Wallet Configuration</h3>
          <div className="form-group">
            <label htmlFor="wallet">Wallet Address</label>
            <input
              id="wallet"
              type="text"
              value={config.walletAddress}
              onChange={(e) => onConfigChange({ walletAddress: e.target.value })}
              placeholder="Enter your STRAT wallet address"
              disabled={isMining}
            />
            <span className="form-help">Your STRAT wallet address for receiving mining rewards</span>
          </div>
        </section>

        <section className="settings-section">
          <h3>Mining Mode</h3>
          <div className="form-group">
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="mode"
                  value="pool"
                  checked={config.mode === 'pool'}
                  onChange={(e) => onConfigChange({ mode: e.target.value as 'pool' })}
                  disabled={isMining}
                />
                <span>Pool Mining (Recommended)</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="mode"
                  value="solo"
                  checked={config.mode === 'solo'}
                  onChange={(e) => onConfigChange({ mode: e.target.value as 'solo' })}
                  disabled={isMining}
                />
                <span>Solo Mining</span>
              </label>
            </div>
          </div>

          {config.mode === 'pool' && (
            <div className="form-group">
              <label htmlFor="pool">Pool URL</label>
              <input
                id="pool"
                type="text"
                value={config.poolUrl}
                onChange={(e) => onConfigChange({ poolUrl: e.target.value })}
                placeholder="stratum+tcp://pool.strat.network:3333"
                disabled={isMining}
              />
            </div>
          )}
        </section>

        <section className="settings-section">
          <h3>Mining Hardware</h3>
          <div className="form-group">
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="miningType"
                  value="cpu"
                  checked={config.miningType === 'cpu'}
                  onChange={(e) => onConfigChange({ miningType: e.target.value as 'cpu' })}
                  disabled={isMining}
                />
                <span>CPU Mining</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="miningType"
                  value="gpu"
                  checked={config.miningType === 'gpu'}
                  onChange={(e) => onConfigChange({ miningType: e.target.value as 'gpu' })}
                  disabled={isMining}
                />
                <span>GPU Mining</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="miningType"
                  value="both"
                  checked={config.miningType === 'both'}
                  onChange={(e) => onConfigChange({ miningType: e.target.value as 'both' })}
                  disabled={isMining}
                />
                <span>CPU + GPU</span>
              </label>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h3>Performance</h3>
          <div className="form-group">
            <label htmlFor="threads">
              CPU Threads: {config.threads}
            </label>
            <input
              id="threads"
              type="range"
              min="1"
              max={navigator.hardwareConcurrency || 8}
              value={config.threads}
              onChange={(e) => onConfigChange({ threads: parseInt(e.target.value) })}
            />
            <span className="form-help">
              Using {config.threads} of {navigator.hardwareConcurrency || 8} available threads
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="intensity">
              Mining Intensity: {config.intensity}
            </label>
            <input
              id="intensity"
              type="range"
              min="1"
              max="10"
              value={config.intensity}
              onChange={(e) => onConfigChange({ intensity: parseInt(e.target.value) })}
            />
            <span className="form-help">
              Higher intensity = more hashrate but higher CPU usage
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="algorithm">Algorithm</label>
            <select
              id="algorithm"
              value={config.algorithm}
              onChange={(e) => onConfigChange({ algorithm: e.target.value as 'sha256' | 'scrypt' })}
              disabled={isMining}
            >
              <option value="sha256">SHA-256</option>
              <option value="scrypt">Scrypt</option>
            </select>
          </div>
        </section>

        <section className="settings-section">
          <h3>Advanced</h3>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.autoStart}
                onChange={(e) => onConfigChange({ autoStart: e.target.checked })}
              />
              <span>Auto-start mining on launch</span>
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="difficulty">
              Difficulty Target: {config.difficulty}
            </label>
            <input
              id="difficulty"
              type="range"
              min="1"
              max="10"
              value={config.difficulty}
              onChange={(e) => onConfigChange({ difficulty: parseInt(e.target.value) })}
              disabled={isMining}
            />
            <span className="form-help">
              Number of leading zeros required in hash
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
