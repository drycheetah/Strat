interface HeaderProps {
  isMining: boolean;
  onToggleMining: () => void;
  hashrate: number;
}

const Header = ({ isMining, onToggleMining, hashrate }: HeaderProps) => {
  const formatHashrate = (hr: number): string => {
    if (hr >= 1000000000) return `${(hr / 1000000000).toFixed(2)} GH/s`;
    if (hr >= 1000000) return `${(hr / 1000000).toFixed(2)} MH/s`;
    if (hr >= 1000) return `${(hr / 1000).toFixed(2)} KH/s`;
    return `${hr.toFixed(2)} H/s`;
  };

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <div className="logo-icon">S</div>
          <h1>STRAT Miner</h1>
        </div>
      </div>

      <div className="header-center">
        <div className="hashrate-display">
          <span className="hashrate-label">Hashrate</span>
          <span className="hashrate-value">{formatHashrate(hashrate)}</span>
        </div>
      </div>

      <div className="header-right">
        <button
          className={`mining-toggle ${isMining ? 'mining' : ''}`}
          onClick={onToggleMining}
        >
          {isMining ? (
            <>
              <span className="status-dot"></span>
              Stop Mining
            </>
          ) : (
            <>Start Mining</>
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;
