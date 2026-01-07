const logger = require('../../utils/logger');

/**
 * TransactionPoolOptimizer - Optimizes mempool/transaction pool performance
 * Implements smart fee estimation, transaction prioritization, and pool management
 */
class TransactionPoolOptimizer {
  constructor(mempool, blockchain, options = {}) {
    this.mempool = mempool;
    this.blockchain = blockchain;
    this.maxPoolSize = options.maxPoolSize || 10000;
    this.minFee = options.minFee || 0.0001;
    this.feeHistorySize = options.feeHistorySize || 1000;
    this.feeHistory = [];
    this.optimizationInterval = options.optimizationInterval || 30000; // 30 seconds
    this.evictionStrategy = options.evictionStrategy || 'lowest-fee';
    this.priorityLevels = {
      high: 1.5,    // 50% fee premium
      medium: 1.0,  // normal fee
      low: 0.5      // 50% fee discount
    };
    this.optimizing = false;
    this.stats = {
      totalOptimizations: 0,
      transactionsEvicted: 0,
      feesCollected: 0
    };
  }

  /**
   * Start optimizer
   */
  start() {
    if (this.optimizing) {
      return;
    }

    this.optimizing = true;
    logger.info('Transaction pool optimizer started');

    this.optimizerInterval = setInterval(() => {
      this.optimize();
    }, this.optimizationInterval);
  }

  /**
   * Stop optimizer
   */
  stop() {
    if (!this.optimizing) {
      return;
    }

    this.optimizing = false;

    if (this.optimizerInterval) {
      clearInterval(this.optimizerInterval);
    }

    logger.info('Transaction pool optimizer stopped');
  }

  /**
   * Optimize transaction pool
   */
  async optimize() {
    logger.info('Optimizing transaction pool...');

    try {
      // Step 1: Remove invalid transactions
      const removedInvalid = await this.removeInvalidTransactions();

      // Step 2: Check pool size and evict if needed
      const evicted = await this.evictTransactionsIfNeeded();

      // Step 3: Reorder by priority
      await this.reorderByPriority();

      // Step 4: Update fee estimates
      await this.updateFeeEstimates();

      // Step 5: Cleanup expired transactions
      const expired = await this.cleanupExpiredTransactions();

      this.stats.totalOptimizations++;

      logger.info(`Optimization complete: ${removedInvalid} invalid, ${evicted} evicted, ${expired} expired`);

      return {
        success: true,
        removedInvalid,
        evicted,
        expired,
        currentPoolSize: this.getCurrentPoolSize()
      };

    } catch (error) {
      logger.error(`Optimization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove invalid transactions
   */
  async removeInvalidTransactions() {
    const transactions = Array.from(this.mempool.transactions.values());
    let removed = 0;

    for (let tx of transactions) {
      if (!this.blockchain.isValidTransaction(tx)) {
        this.mempool.removeTransaction(tx.hash);
        removed++;
        logger.debug(`Removed invalid transaction: ${tx.hash}`);
      }
    }

    return removed;
  }

  /**
   * Evict transactions if pool size exceeded
   */
  async evictTransactionsIfNeeded() {
    const currentSize = this.getCurrentPoolSize();

    if (currentSize <= this.maxPoolSize) {
      return 0;
    }

    const toEvict = currentSize - this.maxPoolSize;
    logger.info(`Pool size ${currentSize} exceeds max ${this.maxPoolSize}, evicting ${toEvict} transactions`);

    const evicted = await this.evictTransactions(toEvict);

    this.stats.transactionsEvicted += evicted;

    return evicted;
  }

  /**
   * Evict transactions based on strategy
   */
  async evictTransactions(count) {
    const transactions = Array.from(this.mempool.transactions.values());

    let candidates = [];

    switch (this.evictionStrategy) {
      case 'lowest-fee':
        candidates = this.selectLowestFeeTxs(transactions, count);
        break;

      case 'oldest':
        candidates = this.selectOldestTxs(transactions, count);
        break;

      case 'largest-size':
        candidates = this.selectLargestTxs(transactions, count);
        break;

      default:
        candidates = this.selectLowestFeeTxs(transactions, count);
    }

    // Remove selected transactions
    for (let tx of candidates) {
      this.mempool.removeTransaction(tx.hash);
    }

    return candidates.length;
  }

  /**
   * Select transactions with lowest fees
   */
  selectLowestFeeTxs(transactions, count) {
    return transactions
      .sort((a, b) => this.calculateFeeRate(a) - this.calculateFeeRate(b))
      .slice(0, count);
  }

  /**
   * Select oldest transactions
   */
  selectOldestTxs(transactions, count) {
    return transactions
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
      .slice(0, count);
  }

  /**
   * Select largest transactions
   */
  selectLargestTxs(transactions, count) {
    return transactions
      .sort((a, b) => this.calculateTxSize(b) - this.calculateTxSize(a))
      .slice(0, count);
  }

  /**
   * Calculate transaction size
   */
  calculateTxSize(tx) {
    return JSON.stringify(tx).length;
  }

  /**
   * Calculate fee rate (fee per byte)
   */
  calculateFeeRate(tx) {
    const size = this.calculateTxSize(tx);
    const fee = this.calculateTransactionFee(tx);
    return fee / size;
  }

  /**
   * Calculate transaction fee
   */
  calculateTransactionFee(tx) {
    if (tx.isCoinbase || tx.isContractDeploy || tx.isContractCall) {
      return 0;
    }

    const inputSum = this.blockchain.calculateInputSum(tx);
    const outputSum = this.blockchain.calculateOutputSum(tx);

    return inputSum - outputSum;
  }

  /**
   * Reorder transactions by priority
   */
  async reorderByPriority() {
    const transactions = Array.from(this.mempool.transactions.values());

    // Calculate priority scores
    const scored = transactions.map(tx => ({
      tx,
      score: this.calculatePriorityScore(tx)
    }));

    // Sort by priority score
    scored.sort((a, b) => b.score - a.score);

    logger.debug(`Reordered ${transactions.length} transactions by priority`);
  }

  /**
   * Calculate priority score for transaction
   */
  calculatePriorityScore(tx) {
    const feeRate = this.calculateFeeRate(tx);
    const age = Date.now() - (tx.timestamp || Date.now());
    const ageMinutes = age / (60 * 1000);

    // Priority score = feeRate * (1 + age_bonus)
    // Age bonus: 1% per minute waiting (capped at 100%)
    const ageBonus = Math.min(ageMinutes / 100, 1.0);

    return feeRate * (1 + ageBonus);
  }

  /**
   * Update fee estimates
   */
  async updateFeeEstimates() {
    const recentBlocks = this.blockchain.chain.slice(-10);

    for (let block of recentBlocks) {
      for (let tx of block.transactions || []) {
        if (!tx.isCoinbase) {
          const fee = this.calculateTransactionFee(tx);
          const size = this.calculateTxSize(tx);
          const feeRate = fee / size;

          this.feeHistory.push({
            feeRate,
            blockHeight: block.index,
            timestamp: block.timestamp
          });
        }
      }
    }

    // Keep only recent history
    if (this.feeHistory.length > this.feeHistorySize) {
      this.feeHistory = this.feeHistory.slice(-this.feeHistorySize);
    }
  }

  /**
   * Get fee estimate for priority level
   */
  getFeeEstimate(priority = 'medium', targetBlocks = 3) {
    if (this.feeHistory.length === 0) {
      return this.minFee;
    }

    // Calculate percentiles
    const feeRates = this.feeHistory.map(h => h.feeRate).sort((a, b) => a - b);

    let percentile;
    switch (priority) {
      case 'high':
        percentile = 0.9; // 90th percentile
        break;
      case 'medium':
        percentile = 0.5; // median
        break;
      case 'low':
        percentile = 0.25; // 25th percentile
        break;
      default:
        percentile = 0.5;
    }

    const index = Math.floor(feeRates.length * percentile);
    const baseFee = feeRates[index] || this.minFee;

    // Adjust for target blocks
    const urgencyMultiplier = 1 + (1 / targetBlocks);

    return Math.max(baseFee * urgencyMultiplier, this.minFee);
  }

  /**
   * Get detailed fee estimates
   */
  getFeeEstimates() {
    return {
      high: {
        feeRate: this.getFeeEstimate('high', 1),
        targetBlocks: 1,
        probability: 0.9
      },
      medium: {
        feeRate: this.getFeeEstimate('medium', 3),
        targetBlocks: 3,
        probability: 0.7
      },
      low: {
        feeRate: this.getFeeEstimate('low', 6),
        targetBlocks: 6,
        probability: 0.5
      },
      minimum: this.minFee
    };
  }

  /**
   * Cleanup expired transactions
   */
  async cleanupExpiredTransactions() {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    const transactions = Array.from(this.mempool.transactions.values());

    let removed = 0;

    for (let tx of transactions) {
      if (tx.timestamp && now - tx.timestamp > maxAge) {
        this.mempool.removeTransaction(tx.hash);
        removed++;
        logger.debug(`Removed expired transaction: ${tx.hash}`);
      }
    }

    return removed;
  }

  /**
   * Get current pool size
   */
  getCurrentPoolSize() {
    return this.mempool.transactions.size;
  }

  /**
   * Get pool statistics
   */
  getPoolStats() {
    const transactions = Array.from(this.mempool.transactions.values());

    if (transactions.length === 0) {
      return {
        size: 0,
        totalSize: 0,
        avgFeeRate: 0,
        medianFeeRate: 0,
        minFeeRate: 0,
        maxFeeRate: 0
      };
    }

    const feeRates = transactions.map(tx => this.calculateFeeRate(tx));
    const sizes = transactions.map(tx => this.calculateTxSize(tx));

    feeRates.sort((a, b) => a - b);

    return {
      size: transactions.length,
      totalSize: sizes.reduce((a, b) => a + b, 0),
      avgFeeRate: feeRates.reduce((a, b) => a + b, 0) / feeRates.length,
      medianFeeRate: feeRates[Math.floor(feeRates.length / 2)],
      minFeeRate: feeRates[0],
      maxFeeRate: feeRates[feeRates.length - 1]
    };
  }

  /**
   * Get optimizer statistics
   */
  getStats() {
    const poolStats = this.getPoolStats();
    const feeEstimates = this.getFeeEstimates();

    return {
      pool: poolStats,
      feeEstimates,
      optimization: {
        totalOptimizations: this.stats.totalOptimizations,
        transactionsEvicted: this.stats.transactionsEvicted,
        feesCollected: this.stats.feesCollected
      },
      config: {
        maxPoolSize: this.maxPoolSize,
        minFee: this.minFee,
        evictionStrategy: this.evictionStrategy,
        optimizing: this.optimizing
      }
    };
  }

  /**
   * Validate transaction for pool
   */
  async validateForPool(tx) {
    // Check fee
    const fee = this.calculateTransactionFee(tx);
    const size = this.calculateTxSize(tx);
    const feeRate = fee / size;

    if (feeRate < this.minFee) {
      return {
        valid: false,
        reason: `Fee rate too low: ${feeRate} (minimum: ${this.minFee})`
      };
    }

    // Check pool size
    if (this.getCurrentPoolSize() >= this.maxPoolSize) {
      // Check if this tx has higher fee than lowest in pool
      const lowestFeeTx = this.selectLowestFeeTxs(
        Array.from(this.mempool.transactions.values()),
        1
      )[0];

      if (lowestFeeTx && feeRate <= this.calculateFeeRate(lowestFeeTx)) {
        return {
          valid: false,
          reason: 'Pool full and fee rate not competitive'
        };
      }
    }

    // Validate with blockchain
    if (!this.blockchain.isValidTransaction(tx)) {
      return {
        valid: false,
        reason: 'Transaction validation failed'
      };
    }

    return { valid: true };
  }

  /**
   * Get transactions for mining
   */
  getTransactionsForMining(maxCount = 1000, maxSize = 1000000) {
    const transactions = Array.from(this.mempool.transactions.values());

    // Score and sort
    const scored = transactions.map(tx => ({
      tx,
      score: this.calculatePriorityScore(tx),
      size: this.calculateTxSize(tx)
    }));

    scored.sort((a, b) => b.score - a.score);

    // Select transactions within limits
    const selected = [];
    let totalSize = 0;

    for (let item of scored) {
      if (selected.length >= maxCount) {
        break;
      }

      if (totalSize + item.size > maxSize) {
        break;
      }

      selected.push(item.tx);
      totalSize += item.size;
    }

    return selected;
  }

  /**
   * Export pool data
   */
  exportPoolData() {
    const transactions = Array.from(this.mempool.transactions.values());

    return {
      transactions: transactions.map(tx => ({
        hash: tx.hash,
        timestamp: tx.timestamp,
        fee: this.calculateTransactionFee(tx),
        size: this.calculateTxSize(tx),
        feeRate: this.calculateFeeRate(tx),
        priorityScore: this.calculatePriorityScore(tx)
      })),
      stats: this.getStats(),
      exportedAt: Date.now()
    };
  }
}

module.exports = TransactionPoolOptimizer;
