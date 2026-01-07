// Metrics Service for STRAT blockchain monitoring

class MetricsService {
  constructor() {
    this.metrics = {
      blockchain: {
        totalBlocks: 0,
        totalTransactions: 0,
        avgBlockTime: 0,
        difficulty: 0,
        hashrate: 0,
        activeNodes: 0
      },
      transactions: {
        totalVolume: 0,
        avgFee: 0,
        tps: 0, // Transactions per second
        peakTps: 0,
        pendingCount: 0
      },
      governance: {
        totalProposals: 0,
        activeProposals: 0,
        totalVotes: 0,
        voterParticipation: 0,
        proposalSuccessRate: 0
      },
      nft: {
        totalMinted: 0,
        totalSales: 0,
        salesVolume: 0,
        avgPrice: 0,
        activeListings: 0
      },
      trading: {
        totalOrders: 0,
        activeOrders: 0,
        tradingVolume24h: 0,
        tradingVolume7d: 0,
        avgOrderSize: 0
      },
      defi: {
        totalValueLocked: 0,
        totalPools: 0,
        totalStaked: 0,
        avgAPY: 0,
        swapVolume24h: 0
      },
      users: {
        totalWallets: 0,
        activeWallets24h: 0,
        newWallets24h: 0,
        avgBalance: 0
      },
      performance: {
        avgResponseTime: 0,
        requestCount: 0,
        errorRate: 0,
        uptime: 100
      }
    };

    this.history = [];
    this.maxHistory = 1000;
    this.startTime = Date.now();
  }

  /**
   * Update blockchain metrics
   */
  updateBlockchainMetrics(data) {
    this.metrics.blockchain = {
      ...this.metrics.blockchain,
      ...data
    };

    this.recordSnapshot('blockchain', data);
  }

  /**
   * Update transaction metrics
   */
  updateTransactionMetrics(data) {
    this.metrics.transactions = {
      ...this.metrics.transactions,
      ...data
    };

    this.recordSnapshot('transactions', data);
  }

  /**
   * Update governance metrics
   */
  updateGovernanceMetrics(data) {
    this.metrics.governance = {
      ...this.metrics.governance,
      ...data
    };

    this.recordSnapshot('governance', data);
  }

  /**
   * Update NFT metrics
   */
  updateNFTMetrics(data) {
    this.metrics.nft = {
      ...this.metrics.nft,
      ...data
    };

    this.recordSnapshot('nft', data);
  }

  /**
   * Update trading metrics
   */
  updateTradingMetrics(data) {
    this.metrics.trading = {
      ...this.metrics.trading,
      ...data
    };

    this.recordSnapshot('trading', data);
  }

  /**
   * Update DeFi metrics
   */
  updateDeFiMetrics(data) {
    this.metrics.defi = {
      ...this.metrics.defi,
      ...data
    };

    this.recordSnapshot('defi', data);
  }

  /**
   * Update user metrics
   */
  updateUserMetrics(data) {
    this.metrics.users = {
      ...this.metrics.users,
      ...data
    };

    this.recordSnapshot('users', data);
  }

  /**
   * Record API request metrics
   */
  recordRequest(endpoint, duration, success = true) {
    const current = this.metrics.performance;

    current.requestCount++;
    current.avgResponseTime =
      (current.avgResponseTime * (current.requestCount - 1) + duration) /
      current.requestCount;

    if (!success) {
      current.errorRate =
        ((current.errorRate * (current.requestCount - 1)) + 1) /
        current.requestCount;
    }

    this.recordSnapshot('performance', {
      endpoint,
      duration,
      success,
      timestamp: Date.now()
    });
  }

  /**
   * Record metric snapshot
   */
  recordSnapshot(category, data) {
    this.history.push({
      category,
      data,
      timestamp: Date.now()
    });

    // Maintain history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  /**
   * Get all metrics
   */
  getAllMetrics() {
    return {
      ...this.metrics,
      uptime: this.getUptime(),
      timestamp: Date.now()
    };
  }

  /**
   * Get metrics by category
   */
  getMetrics(category) {
    return this.metrics[category] || null;
  }

  /**
   * Get uptime
   */
  getUptime() {
    const uptime = Date.now() - this.startTime;
    const days = Math.floor(uptime / 86400000);
    const hours = Math.floor((uptime % 86400000) / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);

    return {
      ms: uptime,
      formatted: `${days}d ${hours}h ${minutes}m`
    };
  }

  /**
   * Get metrics history
   */
  getHistory(category = null, limit = 100) {
    let filtered = this.history;

    if (category) {
      filtered = filtered.filter(item => item.category === category);
    }

    return filtered.slice(-limit);
  }

  /**
   * Calculate growth rate
   */
  calculateGrowth(category, metric, period = 86400000) {
    const now = Date.now();
    const history = this.getHistory(category, 1000);

    const current = this.metrics[category][metric] || 0;
    const past = history.find(
      item => now - item.timestamp >= period
    );

    if (!past || !past.data[metric]) {
      return { growth: 0, percentage: 0 };
    }

    const pastValue = past.data[metric];
    const growth = current - pastValue;
    const percentage = pastValue > 0 ? (growth / pastValue) * 100 : 0;

    return {
      growth,
      percentage: percentage.toFixed(2),
      current,
      past: pastValue
    };
  }

  /**
   * Get metrics summary
   */
  getSummary() {
    return {
      blockchain: {
        blocks: this.metrics.blockchain.totalBlocks,
        transactions: this.metrics.blockchain.totalTransactions,
        avgBlockTime: `${this.metrics.blockchain.avgBlockTime}s`,
        hashrate: `${(this.metrics.blockchain.hashrate / 1e6).toFixed(2)} MH/s`
      },
      activity: {
        tps: this.metrics.transactions.tps.toFixed(2),
        activeWallets: this.metrics.users.activeWallets24h,
        tradingVolume: `${this.metrics.trading.tradingVolume24h.toFixed(2)} STRAT`,
        tvl: `${this.metrics.defi.totalValueLocked.toFixed(2)} STRAT`
      },
      governance: {
        proposals: this.metrics.governance.activeProposals,
        participation: `${this.metrics.governance.voterParticipation.toFixed(2)}%`
      },
      nft: {
        minted: this.metrics.nft.totalMinted,
        sales: this.metrics.nft.totalSales,
        volume: `${this.metrics.nft.salesVolume.toFixed(2)} STRAT`
      },
      performance: {
        uptime: this.getUptime().formatted,
        avgResponse: `${this.metrics.performance.avgResponseTime.toFixed(2)}ms`,
        errorRate: `${(this.metrics.performance.errorRate * 100).toFixed(2)}%`
      }
    };
  }

  /**
   * Get real-time statistics
   */
  getRealTimeStats() {
    const recentHistory = this.getHistory(null, 60); // Last minute

    const txCount = recentHistory.filter(
      item => item.category === 'transactions'
    ).length;

    const tps = (txCount / 60).toFixed(2);

    return {
      currentTps: tps,
      peakTps: this.metrics.transactions.peakTps,
      pendingTransactions: this.metrics.transactions.pendingCount,
      activeNodes: this.metrics.blockchain.activeNodes,
      memoryUsage: process.memoryUsage().heapUsed / 1048576, // MB
      cpuUsage: process.cpuUsage().user / 1000000 // seconds
    };
  }

  /**
   * Export metrics
   */
  export() {
    return {
      metrics: this.metrics,
      history: this.history,
      startTime: this.startTime,
      timestamp: Date.now()
    };
  }

  /**
   * Import metrics
   */
  import(data) {
    this.metrics = data.metrics || this.metrics;
    this.history = data.history || this.history;
    this.startTime = data.startTime || this.startTime;

    return {
      success: true,
      imported: {
        metricsCount: Object.keys(this.metrics).length,
        historyCount: this.history.length
      }
    };
  }

  /**
   * Reset metrics
   */
  reset(category = null) {
    if (category) {
      if (this.metrics[category]) {
        const keys = Object.keys(this.metrics[category]);
        keys.forEach(key => {
          this.metrics[category][key] = 0;
        });
      }
    } else {
      // Reset all
      Object.keys(this.metrics).forEach(category => {
        Object.keys(this.metrics[category]).forEach(key => {
          this.metrics[category][key] = 0;
        });
      });
      this.history = [];
      this.startTime = Date.now();
    }

    return { success: true, reset: category || 'all' };
  }

  /**
   * Get trending metrics
   */
  getTrending(limit = 5) {
    const categories = Object.keys(this.metrics);
    const trending = [];

    categories.forEach(category => {
      const metrics = Object.keys(this.metrics[category]);

      metrics.forEach(metric => {
        const growth = this.calculateGrowth(category, metric, 86400000); // 24h

        if (Math.abs(growth.percentage) > 0) {
          trending.push({
            category,
            metric,
            ...growth
          });
        }
      });
    });

    // Sort by absolute percentage change
    trending.sort((a, b) =>
      Math.abs(parseFloat(b.percentage)) - Math.abs(parseFloat(a.percentage))
    );

    return trending.slice(0, limit);
  }

  /**
   * Get alerts
   */
  getAlerts() {
    const alerts = [];

    // Check error rate
    if (this.metrics.performance.errorRate > 0.05) {
      alerts.push({
        severity: 'high',
        category: 'performance',
        message: `High error rate: ${(this.metrics.performance.errorRate * 100).toFixed(2)}%`
      });
    }

    // Check TPS
    if (this.metrics.transactions.tps < 1) {
      alerts.push({
        severity: 'low',
        category: 'transactions',
        message: `Low TPS: ${this.metrics.transactions.tps.toFixed(2)}`
      });
    }

    // Check active nodes
    if (this.metrics.blockchain.activeNodes < 3) {
      alerts.push({
        severity: 'medium',
        category: 'blockchain',
        message: `Low active nodes: ${this.metrics.blockchain.activeNodes}`
      });
    }

    return alerts;
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new MetricsService();
    }
    return instance;
  },
  MetricsService
};
