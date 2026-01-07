interface MiningConfig {
  difficulty: number;
  algorithm: 'sha256' | 'scrypt';
  threads: number;
  intensity: number;
  poolUrl?: string;
  walletAddress: string;
}

interface MiningStats {
  hashrate: number;
  shares: number;
  accepted: number;
  rejected: number;
  startTime: number;
  lastShareTime?: number;
}

class StratMiner {
  private config: MiningConfig;
  private stats: MiningStats;
  private isRunning: boolean = false;

  constructor(config: MiningConfig) {
    this.config = config;
    this.stats = {
      hashrate: 0,
      shares: 0,
      accepted: 0,
      rejected: 0,
      startTime: Date.now(),
    };
  }

  async start() {
    this.isRunning = true;
    this.stats.startTime = Date.now();

    // Start mining threads
    for (let i = 0; i < this.config.threads; i++) {
      this.startMiningThread(i);
    }

    // Update stats periodically
    setInterval(() => {
      this.updateHashrate();
      this.sendStats();
    }, 1000);
  }

  private startMiningThread(threadId: number) {
    const mineBlock = () => {
      if (!this.isRunning) return;

      const nonce = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
      const timestamp = Date.now();

      // Simulate mining work
      const iterations = this.config.intensity * 1000;
      for (let i = 0; i < iterations; i++) {
        const blockData = `${threadId}-${nonce + i}-${timestamp}`;
        const hash = this.hash(blockData);

        // Check if hash meets difficulty
        if (this.checkDifficulty(hash)) {
          this.submitShare(hash, nonce + i);
        }
      }

      // Continue mining
      setTimeout(mineBlock, 0);
    };

    mineBlock();
  }

  private hash(data: string): string {
    // Use Web Crypto API for browser compatibility
    // This is a simplified version - in production you'd use actual crypto libraries
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Convert to hex string with leading zeros
    const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
    // Pad to 64 characters for SHA-256 simulation
    return hexHash.repeat(8).substring(0, 64);
  }

  private checkDifficulty(hash: string): boolean {
    const target = '0'.repeat(this.config.difficulty);
    return hash.startsWith(target);
  }

  private async submitShare(hash: string, nonce: number) {
    this.stats.shares++;
    this.stats.lastShareTime = Date.now();

    // If pool mining, submit to pool
    if (this.config.poolUrl) {
      try {
        const accepted = await this.submitToPool(hash, nonce);
        if (accepted) {
          this.stats.accepted++;
        } else {
          this.stats.rejected++;
        }
      } catch (error) {
        this.stats.rejected++;
      }
    } else {
      // Solo mining - always accept
      this.stats.accepted++;
    }

    this.sendStats();
  }

  private async submitToPool(_hash: string, _nonce: number): Promise<boolean> {
    // In production, this would make an actual API call to the pool
    // Simulating network delay and 95% acceptance rate
    await new Promise(resolve => setTimeout(resolve, 100));
    return Math.random() > 0.05;
  }

  private updateHashrate() {
    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    if (elapsed > 0) {
      this.stats.hashrate = (this.stats.shares * this.config.intensity * 1000) / elapsed;
    }
  }

  private sendStats() {
    self.postMessage({
      type: 'stats',
      data: {
        ...this.stats,
        uptime: Date.now() - this.stats.startTime,
      },
    });
  }

  stop() {
    this.isRunning = false;
  }

  updateConfig(config: Partial<MiningConfig>) {
    this.config = { ...this.config, ...config };
  }
}

let miner: StratMiner | null = null;

self.onmessage = (event: MessageEvent) => {
  const { type, data } = event.data;

  switch (type) {
    case 'start':
      if (!miner) {
        miner = new StratMiner(data);
        miner.start();
        self.postMessage({ type: 'started' });
      }
      break;

    case 'stop':
      if (miner) {
        miner.stop();
        miner = null;
        self.postMessage({ type: 'stopped' });
      }
      break;

    case 'update-config':
      if (miner) {
        miner.updateConfig(data);
        self.postMessage({ type: 'config-updated' });
      }
      break;

    case 'get-stats':
      // Stats are sent automatically via sendStats()
      break;
  }
};

export {};
