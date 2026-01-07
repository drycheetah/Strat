const logger = require('../../utils/logger');

/**
 * AdvancedAnalytics - Provides advanced blockchain analytics and insights
 * Calculates metrics, trends, and provides data visualization support
 */
class AdvancedAnalytics {
  constructor(blockchain) {
    this.blockchain = blockchain;
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute
    this.metricsHistory = [];
    this.maxHistorySize = 10000;
  }

  /**
   * Get comprehensive blockchain metrics
   */
  async getBlockchainMetrics() {
    return this.getCachedOrCalculate('blockchain_metrics', () => {
      const chainLength = this.blockchain.chain.length;
      const latestBlock = this.blockchain.getLatestBlock();

      // Calculate total supply
      let totalSupply = 0;
      for (let [key, utxo] of this.blockchain.utxos) {
        totalSupply += utxo.amount;
      }

      // Calculate total transactions
      let totalTransactions = 0;
      for (let block of this.blockchain.chain) {
        totalTransactions += block.transactions?.length || 0;
      }

      // Calculate average block time
      const avgBlockTime = this.calculateAverageBlockTime();

      // Calculate network hashrate
      const hashrate = this.calculateHashrate();

      return {
        blockHeight: chainLength,
        totalSupply,
        circulatingSupply: totalSupply,
        totalTransactions,
        totalUTXOs: this.blockchain.utxos.size,
        totalContracts: this.blockchain.contracts.size,
        difficulty: this.blockchain.difficulty,
        avgBlockTime,
        hashrate,
        mempoolSize: this.blockchain.mempool?.transactions.size || 0,
        timestamp: Date.now()
      };
    });
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(timeRange = 24 * 60 * 60 * 1000) {
    return this.getCachedOrCalculate(`tx_stats_${timeRange}`, () => {
      const now = Date.now();
      const cutoff = now - timeRange;

      let txCount = 0;
      let totalFees = 0;
      let totalVolume = 0;
      const txTypes = { regular: 0, coinbase: 0, contract: 0 };
      const hourlyDistribution = new Array(24).fill(0);

      for (let i = this.blockchain.chain.length - 1; i >= 0; i--) {
        const block = this.blockchain.chain[i];

        if (block.timestamp < cutoff) {
          break;
        }

        for (let tx of block.transactions || []) {
          txCount++;

          // Classify transaction
          if (tx.isCoinbase) {
            txTypes.coinbase++;
          } else if (tx.isContractDeploy || tx.isContractCall) {
            txTypes.contract++;
          } else {
            txTypes.regular++;
          }

          // Calculate fees and volume
          if (tx.outputs) {
            for (let output of tx.outputs) {
              totalVolume += output.amount;
            }
          }

          // Hourly distribution
          const hour = new Date(block.timestamp).getHours();
          hourlyDistribution[hour]++;
        }
      }

      return {
        timeRange,
        totalTransactions: txCount,
        avgTransactionsPerBlock: txCount / (this.blockchain.chain.length || 1),
        totalVolume,
        totalFees,
        avgFeePerTx: totalFees / (txCount || 1),
        txTypes,
        hourlyDistribution,
        tps: txCount / (timeRange / 1000)
      };
    });
  }

  /**
   * Get network activity trends
   */
  async getNetworkTrends(periods = 7) {
    return this.getCachedOrCalculate(`network_trends_${periods}`, () => {
      const periodLength = 24 * 60 * 60 * 1000; // 1 day
      const trends = [];

      for (let i = 0; i < periods; i++) {
        const endTime = Date.now() - (i * periodLength);
        const startTime = endTime - periodLength;

        const periodData = this.analyzePeriod(startTime, endTime);
        trends.unshift(periodData);
      }

      return {
        periods,
        trends,
        averages: this.calculateTrendAverages(trends)
      };
    });
  }

  /**
   * Analyze specific time period
   */
  analyzePeriod(startTime, endTime) {
    let blocks = 0;
    let transactions = 0;
    let volume = 0;
    let fees = 0;
    let activeAddresses = new Set();

    for (let block of this.blockchain.chain) {
      if (block.timestamp >= startTime && block.timestamp < endTime) {
        blocks++;

        for (let tx of block.transactions || []) {
          transactions++;

          if (tx.outputs) {
            for (let output of tx.outputs) {
              volume += output.amount;
              activeAddresses.add(output.address);
            }
          }

          if (tx.inputs) {
            for (let input of tx.inputs) {
              if (input.address) {
                activeAddresses.add(input.address);
              }
            }
          }
        }
      }
    }

    return {
      startTime,
      endTime,
      blocks,
      transactions,
      volume,
      fees,
      activeAddresses: activeAddresses.size,
      avgTxPerBlock: transactions / (blocks || 1)
    };
  }

  /**
   * Calculate trend averages
   */
  calculateTrendAverages(trends) {
    const sum = trends.reduce((acc, t) => ({
      blocks: acc.blocks + t.blocks,
      transactions: acc.transactions + t.transactions,
      volume: acc.volume + t.volume,
      activeAddresses: acc.activeAddresses + t.activeAddresses
    }), { blocks: 0, transactions: 0, volume: 0, activeAddresses: 0 });

    const count = trends.length;

    return {
      avgBlocks: sum.blocks / count,
      avgTransactions: sum.transactions / count,
      avgVolume: sum.volume / count,
      avgActiveAddresses: sum.activeAddresses / count
    };
  }

  /**
   * Get address analytics
   */
  async getAddressAnalytics(address) {
    let balance = 0;
    let utxoCount = 0;
    let transactionCount = 0;
    let totalReceived = 0;
    let totalSent = 0;
    const recentTxs = [];

    // Calculate balance and UTXO count
    for (let [key, utxo] of this.blockchain.utxos) {
      if (utxo.address === address) {
        balance += utxo.amount;
        utxoCount++;
      }
    }

    // Analyze transaction history
    for (let block of this.blockchain.chain) {
      for (let tx of block.transactions || []) {
        let involved = false;

        // Check outputs (received)
        if (tx.outputs) {
          for (let output of tx.outputs) {
            if (output.address === address) {
              totalReceived += output.amount;
              involved = true;
            }
          }
        }

        // Check inputs (sent)
        if (tx.inputs) {
          for (let input of tx.inputs) {
            const utxoKey = `${input.txHash}:${input.outputIndex}`;
            // Need to look up UTXO to get address (simplified)
            if (input.address === address) {
              involved = true;
            }
          }
        }

        if (involved) {
          transactionCount++;

          if (recentTxs.length < 100) {
            recentTxs.push({
              hash: tx.hash,
              blockHeight: block.index,
              timestamp: block.timestamp,
              type: tx.isCoinbase ? 'coinbase' : 'regular'
            });
          }
        }
      }
    }

    totalSent = totalReceived - balance;

    return {
      address,
      balance,
      utxoCount,
      transactionCount,
      totalReceived,
      totalSent,
      firstSeen: recentTxs.length > 0 ? recentTxs[0].timestamp : null,
      lastSeen: recentTxs.length > 0 ? recentTxs[recentTxs.length - 1].timestamp : null,
      recentTransactions: recentTxs.slice(-10).reverse()
    };
  }

  /**
   * Get rich list (top addresses by balance)
   */
  async getRichList(limit = 100) {
    return this.getCachedOrCalculate(`rich_list_${limit}`, () => {
      const balances = new Map();

      // Aggregate balances
      for (let [key, utxo] of this.blockchain.utxos) {
        const current = balances.get(utxo.address) || 0;
        balances.set(utxo.address, current + utxo.amount);
      }

      // Sort and format
      const sorted = Array.from(balances.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([address, balance], index) => ({
          rank: index + 1,
          address,
          balance,
          percentage: (balance / this.calculateTotalSupply()) * 100
        }));

      return {
        topAddresses: sorted,
        totalAddresses: balances.size
      };
    });
  }

  /**
   * Get block statistics
   */
  async getBlockStats(limit = 100) {
    const blocks = this.blockchain.chain.slice(-limit);

    let totalSize = 0;
    let totalTxs = 0;
    let totalFees = 0;
    const difficulties = [];

    for (let block of blocks) {
      totalTxs += block.transactions?.length || 0;
      difficulties.push(block.difficulty);

      // Calculate block size (simplified)
      const blockSize = JSON.stringify(block).length;
      totalSize += blockSize;
    }

    return {
      blocksAnalyzed: blocks.length,
      avgBlockSize: totalSize / blocks.length,
      avgTransactionsPerBlock: totalTxs / blocks.length,
      avgDifficulty: difficulties.reduce((a, b) => a + b, 0) / difficulties.length,
      currentDifficulty: this.blockchain.difficulty
    };
  }

  /**
   * Get mining statistics
   */
  async getMiningStats() {
    return this.getCachedOrCalculate('mining_stats', () => {
      const recentBlocks = this.blockchain.chain.slice(-1000);
      const miners = new Map();
      let totalRewards = 0;

      for (let block of recentBlocks) {
        if (block.transactions && block.transactions[0]?.isCoinbase) {
          const coinbaseTx = block.transactions[0];
          const miner = coinbaseTx.outputs[0]?.address || 'unknown';
          const reward = coinbaseTx.outputs[0]?.amount || 0;

          const current = miners.get(miner) || { blocks: 0, rewards: 0 };
          current.blocks++;
          current.rewards += reward;
          miners.set(miner, current);

          totalRewards += reward;
        }
      }

      const topMiners = Array.from(miners.entries())
        .sort((a, b) => b[1].blocks - a[1].blocks)
        .slice(0, 10)
        .map(([miner, stats], index) => ({
          rank: index + 1,
          miner,
          blocks: stats.blocks,
          rewards: stats.rewards,
          percentage: (stats.blocks / recentBlocks.length) * 100
        }));

      return {
        totalMiners: miners.size,
        totalRewards,
        topMiners,
        avgRewardPerBlock: totalRewards / recentBlocks.length
      };
    });
  }

  /**
   * Calculate average block time
   */
  calculateAverageBlockTime() {
    const recentBlocks = this.blockchain.chain.slice(-100);

    if (recentBlocks.length < 2) {
      return 0;
    }

    let totalTime = 0;
    for (let i = 1; i < recentBlocks.length; i++) {
      totalTime += recentBlocks[i].timestamp - recentBlocks[i - 1].timestamp;
    }

    return totalTime / (recentBlocks.length - 1);
  }

  /**
   * Calculate network hashrate
   */
  calculateHashrate() {
    const avgBlockTime = this.calculateAverageBlockTime();

    if (avgBlockTime === 0) {
      return 0;
    }

    const difficulty = this.blockchain.difficulty;
    // Simplified hashrate calculation
    const hashrate = Math.pow(2, difficulty) / (avgBlockTime / 1000);

    return hashrate;
  }

  /**
   * Calculate total supply
   */
  calculateTotalSupply() {
    let total = 0;
    for (let [key, utxo] of this.blockchain.utxos) {
      total += utxo.amount;
    }
    return total;
  }

  /**
   * Get chart data for visualization
   */
  async getChartData(type, timeRange = 24 * 60 * 60 * 1000) {
    switch (type) {
      case 'transactions':
        return this.getTransactionChart(timeRange);

      case 'volume':
        return this.getVolumeChart(timeRange);

      case 'difficulty':
        return this.getDifficultyChart();

      case 'hashrate':
        return this.getHashrateChart();

      case 'activeAddresses':
        return this.getActiveAddressesChart(timeRange);

      default:
        throw new Error(`Unknown chart type: ${type}`);
    }
  }

  /**
   * Get transaction chart data
   */
  getTransactionChart(timeRange) {
    const dataPoints = [];
    const interval = timeRange / 100; // 100 data points
    const now = Date.now();

    for (let i = 0; i < 100; i++) {
      const endTime = now - (i * interval);
      const startTime = endTime - interval;

      let txCount = 0;

      for (let block of this.blockchain.chain) {
        if (block.timestamp >= startTime && block.timestamp < endTime) {
          txCount += block.transactions?.length || 0;
        }
      }

      dataPoints.unshift({
        timestamp: startTime,
        value: txCount
      });
    }

    return dataPoints;
  }

  /**
   * Get volume chart data
   */
  getVolumeChart(timeRange) {
    const dataPoints = [];
    const interval = timeRange / 100;
    const now = Date.now();

    for (let i = 0; i < 100; i++) {
      const endTime = now - (i * interval);
      const startTime = endTime - interval;

      let volume = 0;

      for (let block of this.blockchain.chain) {
        if (block.timestamp >= startTime && block.timestamp < endTime) {
          for (let tx of block.transactions || []) {
            if (tx.outputs) {
              for (let output of tx.outputs) {
                volume += output.amount;
              }
            }
          }
        }
      }

      dataPoints.unshift({
        timestamp: startTime,
        value: volume
      });
    }

    return dataPoints;
  }

  /**
   * Get difficulty chart data
   */
  getDifficultyChart() {
    const dataPoints = [];
    const step = Math.max(1, Math.floor(this.blockchain.chain.length / 100));

    for (let i = 0; i < this.blockchain.chain.length; i += step) {
      const block = this.blockchain.chain[i];
      dataPoints.push({
        blockHeight: block.index,
        timestamp: block.timestamp,
        value: block.difficulty
      });
    }

    return dataPoints;
  }

  /**
   * Get hashrate chart data
   */
  getHashrateChart() {
    const dataPoints = [];
    const step = Math.max(1, Math.floor(this.blockchain.chain.length / 100));

    for (let i = step; i < this.blockchain.chain.length; i += step) {
      const block = this.blockchain.chain[i];
      const prevBlock = this.blockchain.chain[i - 1];

      const blockTime = block.timestamp - prevBlock.timestamp;
      const hashrate = Math.pow(2, block.difficulty) / (blockTime / 1000);

      dataPoints.push({
        blockHeight: block.index,
        timestamp: block.timestamp,
        value: hashrate
      });
    }

    return dataPoints;
  }

  /**
   * Get active addresses chart
   */
  getActiveAddressesChart(timeRange) {
    const dataPoints = [];
    const interval = timeRange / 100;
    const now = Date.now();

    for (let i = 0; i < 100; i++) {
      const endTime = now - (i * interval);
      const startTime = endTime - interval;

      const activeAddresses = new Set();

      for (let block of this.blockchain.chain) {
        if (block.timestamp >= startTime && block.timestamp < endTime) {
          for (let tx of block.transactions || []) {
            if (tx.outputs) {
              for (let output of tx.outputs) {
                activeAddresses.add(output.address);
              }
            }
          }
        }
      }

      dataPoints.unshift({
        timestamp: startTime,
        value: activeAddresses.size
      });
    }

    return dataPoints;
  }

  /**
   * Cache helper
   */
  getCachedOrCalculate(key, calculator) {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const data = calculator();
    this.cache.set(key, { data, timestamp: Date.now() });

    // Cleanup old cache entries
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    return data;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('Analytics cache cleared');
  }
}

module.exports = AdvancedAnalytics;
