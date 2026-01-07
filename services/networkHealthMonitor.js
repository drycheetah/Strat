const { NetworkHealth } = require('../models/Analytics');
const logger = require('../utils/logger');

class NetworkHealthMonitor {
  constructor(blockchain, p2pServer, alertingService) {
    this.blockchain = blockchain;
    this.p2pServer = p2pServer;
    this.alertingService = alertingService;
    this.blockTimes = [];
    this.orphanedBlocks = 0;
    this.lastBlockHash = null;
  }

  // Record new block
  recordBlock(block) {
    if (this.lastBlockHash) {
      const now = Date.now();
      const lastBlock = this.blockchain.chain[this.blockchain.chain.length - 2];

      if (lastBlock) {
        const blockTime = (block.timestamp - lastBlock.timestamp) / 1000; // in seconds
        this.blockTimes.push({ timestamp: now, blockTime });

        // Keep only last hour of data
        const oneHourAgo = now - 60 * 60 * 1000;
        this.blockTimes = this.blockTimes.filter(bt => bt.timestamp > oneHourAgo);
      }
    }

    this.lastBlockHash = block.hash;
  }

  // Record orphaned block
  recordOrphanedBlock() {
    this.orphanedBlocks++;
  }

  // Calculate average block time
  calculateAverageBlockTime() {
    if (this.blockTimes.length === 0) {
      return 0;
    }

    const totalTime = this.blockTimes.reduce((sum, bt) => sum + bt.blockTime, 0);
    return totalTime / this.blockTimes.length;
  }

  // Calculate hash rate estimate
  calculateHashRate() {
    if (this.blockTimes.length === 0) {
      return 0;
    }

    const difficulty = this.blockchain.difficulty;
    const averageBlockTime = this.calculateAverageBlockTime();

    if (averageBlockTime === 0) {
      return 0;
    }

    // Estimate hash rate based on difficulty and block time
    // This is a simplified calculation
    const hashRate = Math.pow(2, difficulty) / averageBlockTime;

    return hashRate;
  }

  // Get network latency
  async getNetworkLatency() {
    if (!this.p2pServer || !this.p2pServer.peers) {
      return 0;
    }

    const latencies = [];

    for (const peer of this.p2pServer.peers) {
      if (peer.latency) {
        latencies.push(peer.latency);
      }
    }

    if (latencies.length === 0) {
      return 0;
    }

    return latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
  }

  // Get P2P connection count
  getP2PConnections() {
    if (!this.p2pServer || !this.p2pServer.peers) {
      return 0;
    }

    return this.p2pServer.peers.length;
  }

  // Calculate mempool utilization
  calculateMempoolUtilization() {
    if (!this.blockchain.mempool) {
      return 0;
    }

    const stats = this.blockchain.mempool.getStats();
    return stats.utilization || 0;
  }

  // Get active validators count
  async getActiveValidators() {
    try {
      const Stake = require('../models/Stake');
      const activeStakes = await Stake.countDocuments({ status: 'active' });
      return activeStakes;
    } catch (error) {
      logger.error(`Error getting active validators: ${error.message}`);
      return 0;
    }
  }

  // Get total staked amount
  async getTotalStaked() {
    try {
      const Stake = require('../models/Stake');
      const stakes = await Stake.find({ status: 'active' });
      return stakes.reduce((sum, stake) => sum + (stake.amount || 0), 0);
    } catch (error) {
      logger.error(`Error getting total staked: ${error.message}`);
      return 0;
    }
  }

  // Calculate average gas price
  calculateAverageGasPrice() {
    const recentBlocks = this.blockchain.chain.slice(-10); // Last 10 blocks
    let totalFees = 0;
    let totalTransactions = 0;

    recentBlocks.forEach(block => {
      block.transactions.forEach(tx => {
        if (tx.fee) {
          totalFees += tx.fee;
          totalTransactions++;
        }
      });
    });

    return totalTransactions > 0 ? totalFees / totalTransactions : 0;
  }

  // Determine network status
  determineNetworkStatus(health) {
    const criticalIssues = [];
    const warnings = [];

    // Check block time
    if (health.averageBlockTime > 120) {
      criticalIssues.push('Slow block production');
    } else if (health.averageBlockTime > 60) {
      warnings.push('Slightly slow block production');
    }

    // Check mempool
    if (health.mempoolUtilization > 90) {
      criticalIssues.push('High mempool utilization');
    } else if (health.mempoolUtilization > 70) {
      warnings.push('Elevated mempool utilization');
    }

    // Check P2P connections
    if (health.p2pConnections < 2) {
      criticalIssues.push('Low peer count');
    } else if (health.p2pConnections < 5) {
      warnings.push('Few peer connections');
    }

    // Check orphaned blocks
    if (health.orphanedBlocks > 3) {
      criticalIssues.push('Multiple orphaned blocks');
    } else if (health.orphanedBlocks > 1) {
      warnings.push('Orphaned blocks detected');
    }

    if (criticalIssues.length > 0) {
      return 'critical';
    } else if (warnings.length > 0) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  // Collect network health metrics
  async collectMetrics() {
    try {
      const averageBlockTime = this.calculateAverageBlockTime();
      const hashRate = this.calculateHashRate();
      const networkLatency = await this.getNetworkLatency();
      const p2pConnections = this.getP2PConnections();
      const mempoolSize = this.blockchain.mempool.transactions.size;
      const mempoolUtilization = this.calculateMempoolUtilization();
      const activeValidators = await this.getActiveValidators();
      const totalStaked = await this.getTotalStaked();
      const averageGasPrice = this.calculateAverageGasPrice();

      const health = {
        timestamp: new Date(),
        blockHeight: this.blockchain.chain.length,
        difficulty: this.blockchain.difficulty,
        hashRate,
        averageBlockTime,
        mempoolSize,
        mempoolUtilization,
        pendingTransactions: this.blockchain.pendingTransactions.length,
        networkUtxos: this.blockchain.utxos.size,
        activeValidators,
        totalStaked,
        p2pConnections,
        networkLatency,
        orphanedBlocks: this.orphanedBlocks,
        averageGasPrice
      };

      // Determine network status
      health.networkStatus = this.determineNetworkStatus(health);

      // Save to database
      await NetworkHealth.create(health);

      // Check for alerts
      if (this.alertingService) {
        this.alertingService.checkNetworkHealth(health);
      }

      // Reset orphaned blocks counter after recording
      this.orphanedBlocks = 0;

      logger.info(`Network health recorded: ${health.networkStatus}, ${health.blockHeight} blocks, ${health.p2pConnections} peers`);

    } catch (error) {
      logger.error(`Error collecting network health metrics: ${error.message}`);
    }
  }

  // Get current network health
  async getCurrentHealth() {
    try {
      const averageBlockTime = this.calculateAverageBlockTime();
      const hashRate = this.calculateHashRate();
      const networkLatency = await this.getNetworkLatency();
      const p2pConnections = this.getP2PConnections();
      const mempoolSize = this.blockchain.mempool.transactions.size;
      const mempoolUtilization = this.calculateMempoolUtilization();
      const activeValidators = await this.getActiveValidators();
      const totalStaked = await this.getTotalStaked();
      const averageGasPrice = this.calculateAverageGasPrice();

      const health = {
        blockHeight: this.blockchain.chain.length,
        difficulty: this.blockchain.difficulty,
        hashRate,
        averageBlockTime,
        mempoolSize,
        mempoolUtilization,
        pendingTransactions: this.blockchain.pendingTransactions.length,
        networkUtxos: this.blockchain.utxos.size,
        activeValidators,
        totalStaked,
        p2pConnections,
        networkLatency,
        orphanedBlocks: this.orphanedBlocks,
        averageGasPrice
      };

      health.networkStatus = this.determineNetworkStatus(health);

      return health;

    } catch (error) {
      logger.error(`Error getting current health: ${error.message}`);
      return null;
    }
  }

  // Get historical network health
  async getHistoricalHealth(startDate, endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const data = await NetworkHealth.find({
        timestamp: { $gte: start, $lte: end }
      }).sort({ timestamp: 1 });

      return data;

    } catch (error) {
      logger.error(`Error getting historical health: ${error.message}`);
      return [];
    }
  }

  // Get network statistics
  async getNetworkStatistics(days = 7) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const data = await NetworkHealth.find({
        timestamp: { $gte: startDate }
      });

      if (data.length === 0) {
        return null;
      }

      const stats = {
        averageBlockTime: 0,
        averageHashRate: 0,
        averageMempoolSize: 0,
        averageNetworkLatency: 0,
        averageP2PConnections: 0,
        totalOrphanedBlocks: 0,
        averageGasPrice: 0,
        uptimePercentage: 0
      };

      let healthyCount = 0;

      data.forEach(point => {
        stats.averageBlockTime += point.averageBlockTime || 0;
        stats.averageHashRate += point.hashRate || 0;
        stats.averageMempoolSize += point.mempoolSize || 0;
        stats.averageNetworkLatency += point.networkLatency || 0;
        stats.averageP2PConnections += point.p2pConnections || 0;
        stats.totalOrphanedBlocks += point.orphanedBlocks || 0;
        stats.averageGasPrice += point.averageGasPrice || 0;

        if (point.networkStatus === 'healthy') {
          healthyCount++;
        }
      });

      const count = data.length;
      stats.averageBlockTime /= count;
      stats.averageHashRate /= count;
      stats.averageMempoolSize /= count;
      stats.averageNetworkLatency /= count;
      stats.averageP2PConnections /= count;
      stats.averageGasPrice /= count;
      stats.uptimePercentage = (healthyCount / count) * 100;

      return stats;

    } catch (error) {
      logger.error(`Error getting network statistics: ${error.message}`);
      return null;
    }
  }

  // Start monitoring
  startMonitoring() {
    // Collect metrics every 5 minutes
    setInterval(() => {
      this.collectMetrics();
    }, 5 * 60 * 1000);

    // Collect initial metrics
    this.collectMetrics();

    logger.info('Network health monitoring started');
  }

  // Clean up old health data
  async cleanupOldData(daysToKeep = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      const result = await NetworkHealth.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      logger.info(`Cleaned up ${result.deletedCount} old network health records`);
      return result.deletedCount;

    } catch (error) {
      logger.error(`Error cleaning up health data: ${error.message}`);
      return 0;
    }
  }
}

module.exports = NetworkHealthMonitor;
