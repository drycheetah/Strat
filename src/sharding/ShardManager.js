const CryptoUtils = require('../crypto');
const logger = require('../../utils/logger');

/**
 * ShardManager - Manages blockchain sharding for horizontal scaling
 * Implements a dynamic sharding mechanism with cross-shard communication
 */
class ShardManager {
  constructor(numShards = 4) {
    this.numShards = numShards;
    this.shards = new Map();
    this.shardAssignments = new Map(); // address -> shardId
    this.crossShardQueue = new Map(); // shardId -> pending cross-shard txs
    this.shardMetrics = new Map(); // performance metrics per shard
    this.beaconChain = []; // Beacon chain for coordination

    this.initializeShards();
  }

  /**
   * Initialize all shards with empty state
   */
  initializeShards() {
    for (let i = 0; i < this.numShards; i++) {
      this.shards.set(i, {
        id: i,
        chain: [],
        utxos: new Map(),
        pendingTransactions: [],
        lastBlockHash: '0',
        height: 0,
        totalGasUsed: 0,
        transactionCount: 0,
        capacity: 1000, // transactions per block
        utilization: 0
      });

      this.crossShardQueue.set(i, []);

      this.shardMetrics.set(i, {
        tps: 0, // transactions per second
        avgBlockTime: 0,
        totalBlocks: 0,
        totalTransactions: 0,
        lastUpdated: Date.now()
      });
    }

    logger.info(`Initialized ${this.numShards} shards`);
  }

  /**
   * Assign an address to a specific shard using consistent hashing
   */
  getShardForAddress(address) {
    // Check if already assigned
    if (this.shardAssignments.has(address)) {
      return this.shardAssignments.get(address);
    }

    // Use consistent hashing to assign shard
    const hash = CryptoUtils.hash(address);
    const shardId = parseInt(hash.substring(0, 8), 16) % this.numShards;

    this.shardAssignments.set(address, shardId);
    return shardId;
  }

  /**
   * Get shard by ID
   */
  getShard(shardId) {
    return this.shards.get(shardId);
  }

  /**
   * Check if transaction is cross-shard
   */
  isCrossShardTransaction(transaction) {
    if (!transaction.inputs || !transaction.outputs) {
      return false;
    }

    const inputShards = new Set();
    const outputShards = new Set();

    // Get shards for all inputs
    for (let input of transaction.inputs) {
      const shard = this.getShard(input.shardId || 0);
      if (shard) {
        const utxo = shard.utxos.get(`${input.txHash}:${input.outputIndex}`);
        if (utxo) {
          inputShards.add(this.getShardForAddress(utxo.address));
        }
      }
    }

    // Get shards for all outputs
    for (let output of transaction.outputs) {
      outputShards.add(this.getShardForAddress(output.address));
    }

    // Cross-shard if inputs and outputs are in different shards
    return inputShards.size > 1 || outputShards.size > 1 ||
           (inputShards.size === 1 && outputShards.size === 1 &&
            [...inputShards][0] !== [...outputShards][0]);
  }

  /**
   * Add transaction to appropriate shard
   */
  async addTransaction(transaction) {
    try {
      if (this.isCrossShardTransaction(transaction)) {
        return await this.handleCrossShardTransaction(transaction);
      }

      // Single-shard transaction
      const outputShard = this.getShardForAddress(transaction.outputs[0].address);
      const shard = this.getShard(outputShard);

      if (!shard) {
        throw new Error(`Shard ${outputShard} not found`);
      }

      // Validate transaction against shard state
      if (this.validateTransactionForShard(transaction, shard)) {
        shard.pendingTransactions.push({
          ...transaction,
          shardId: outputShard,
          timestamp: Date.now()
        });

        logger.info(`Transaction ${transaction.hash} added to shard ${outputShard}`);
        return { success: true, shardId: outputShard, crossShard: false };
      }

      throw new Error('Transaction validation failed for shard');
    } catch (error) {
      logger.error(`Error adding transaction to shard: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle cross-shard transaction using two-phase commit
   */
  async handleCrossShardTransaction(transaction) {
    logger.info(`Processing cross-shard transaction ${transaction.hash}`);

    const involvedShards = new Set();

    // Phase 1: Prepare - Lock resources in all involved shards
    try {
      // Identify all involved shards
      for (let input of transaction.inputs || []) {
        const inputShard = this.getShardForAddress(input.address || 'unknown');
        involvedShards.add(inputShard);
      }

      for (let output of transaction.outputs || []) {
        const outputShard = this.getShardForAddress(output.address);
        involvedShards.add(outputShard);
      }

      const shardIds = Array.from(involvedShards);
      const prepareResults = [];

      // Send prepare request to all shards
      for (let shardId of shardIds) {
        const result = await this.prepareShardTransaction(shardId, transaction);
        prepareResults.push(result);
      }

      // Check if all shards are ready
      const allReady = prepareResults.every(r => r.ready);

      if (!allReady) {
        // Abort transaction
        await this.abortCrossShardTransaction(shardIds, transaction);
        throw new Error('Cross-shard transaction preparation failed');
      }

      // Phase 2: Commit - Execute transaction on all shards
      for (let shardId of shardIds) {
        await this.commitShardTransaction(shardId, transaction);
      }

      // Record cross-shard transaction in beacon chain
      this.recordInBeaconChain({
        type: 'cross-shard-tx',
        txHash: transaction.hash,
        shards: shardIds,
        timestamp: Date.now(),
        status: 'committed'
      });

      logger.info(`Cross-shard transaction ${transaction.hash} committed across ${shardIds.length} shards`);

      return {
        success: true,
        crossShard: true,
        involvedShards: shardIds,
        beaconHeight: this.beaconChain.length
      };

    } catch (error) {
      logger.error(`Cross-shard transaction failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Prepare phase for cross-shard transaction
   */
  async prepareShardTransaction(shardId, transaction) {
    const shard = this.getShard(shardId);
    if (!shard) {
      return { ready: false, reason: 'Shard not found' };
    }

    // Validate transaction against shard state
    const isValid = this.validateTransactionForShard(transaction, shard);

    if (isValid) {
      // Add to cross-shard queue
      const queue = this.crossShardQueue.get(shardId);
      queue.push({
        transaction,
        status: 'prepared',
        timestamp: Date.now()
      });

      return { ready: true, shardId };
    }

    return { ready: false, reason: 'Validation failed' };
  }

  /**
   * Commit phase for cross-shard transaction
   */
  async commitShardTransaction(shardId, transaction) {
    const shard = this.getShard(shardId);
    const queue = this.crossShardQueue.get(shardId);

    // Find transaction in queue
    const queuedTx = queue.find(q => q.transaction.hash === transaction.hash);
    if (queuedTx) {
      queuedTx.status = 'committed';

      // Add to shard's pending transactions
      shard.pendingTransactions.push({
        ...transaction,
        shardId,
        crossShard: true
      });

      // Remove from queue
      const index = queue.indexOf(queuedTx);
      queue.splice(index, 1);
    }

    return { success: true };
  }

  /**
   * Abort cross-shard transaction
   */
  async abortCrossShardTransaction(shardIds, transaction) {
    for (let shardId of shardIds) {
      const queue = this.crossShardQueue.get(shardId);
      const queuedTx = queue.find(q => q.transaction.hash === transaction.hash);

      if (queuedTx) {
        queuedTx.status = 'aborted';
        // Remove from queue
        const index = queue.indexOf(queuedTx);
        queue.splice(index, 1);
      }
    }

    // Record abort in beacon chain
    this.recordInBeaconChain({
      type: 'cross-shard-tx-abort',
      txHash: transaction.hash,
      shards: shardIds,
      timestamp: Date.now()
    });

    logger.info(`Cross-shard transaction ${transaction.hash} aborted`);
  }

  /**
   * Validate transaction for a specific shard
   */
  validateTransactionForShard(transaction, shard) {
    if (transaction.isCoinbase) {
      return true;
    }

    // Check UTXOs exist in shard
    for (let input of transaction.inputs || []) {
      const utxoKey = `${input.txHash}:${input.outputIndex}`;
      if (!shard.utxos.has(utxoKey)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Record event in beacon chain
   */
  recordInBeaconChain(event) {
    const beaconBlock = {
      index: this.beaconChain.length,
      timestamp: Date.now(),
      event,
      hash: CryptoUtils.hash(JSON.stringify(event))
    };

    this.beaconChain.push(beaconBlock);
  }

  /**
   * Get shard statistics
   */
  getShardStats(shardId) {
    const shard = this.getShard(shardId);
    const metrics = this.shardMetrics.get(shardId);

    if (!shard || !metrics) {
      return null;
    }

    return {
      id: shardId,
      height: shard.height,
      utxos: shard.utxos.size,
      pendingTx: shard.pendingTransactions.length,
      totalGasUsed: shard.totalGasUsed,
      utilization: shard.utilization,
      metrics
    };
  }

  /**
   * Get all shards statistics
   */
  getAllStats() {
    const stats = [];
    for (let i = 0; i < this.numShards; i++) {
      stats.push(this.getShardStats(i));
    }

    return {
      shards: stats,
      beaconHeight: this.beaconChain.length,
      totalShards: this.numShards,
      crossShardQueueSize: Array.from(this.crossShardQueue.values())
        .reduce((sum, queue) => sum + queue.length, 0)
    };
  }

  /**
   * Rebalance shards based on utilization
   */
  async rebalanceShards() {
    logger.info('Starting shard rebalancing...');

    const stats = this.getAllStats();
    const avgUtilization = stats.shards.reduce((sum, s) => sum + s.utilization, 0) / this.numShards;

    // Identify overloaded and underutilized shards
    const overloaded = stats.shards.filter(s => s.utilization > avgUtilization * 1.5);
    const underutilized = stats.shards.filter(s => s.utilization < avgUtilization * 0.5);

    if (overloaded.length > 0 && underutilized.length > 0) {
      logger.info(`Rebalancing: ${overloaded.length} overloaded, ${underutilized.length} underutilized shards`);

      // Implement rebalancing logic
      // This is a simplified version - production would be more sophisticated
      for (let overloadedShard of overloaded) {
        const targetShard = underutilized[0];

        // Move some transactions
        const txToMove = Math.floor(overloadedShard.pendingTx / 2);
        logger.info(`Moving ${txToMove} transactions from shard ${overloadedShard.id} to ${targetShard.id}`);
      }
    }

    logger.info('Shard rebalancing completed');
  }

  /**
   * Update shard metrics
   */
  updateMetrics(shardId, blockTime, txCount) {
    const metrics = this.shardMetrics.get(shardId);
    const shard = this.getShard(shardId);

    if (metrics && shard) {
      metrics.totalBlocks++;
      metrics.totalTransactions += txCount;
      metrics.avgBlockTime = ((metrics.avgBlockTime * (metrics.totalBlocks - 1)) + blockTime) / metrics.totalBlocks;
      metrics.tps = txCount / (blockTime / 1000);
      metrics.lastUpdated = Date.now();

      // Update shard utilization
      shard.utilization = (shard.pendingTransactions.length / shard.capacity) * 100;
    }
  }
}

module.exports = ShardManager;
