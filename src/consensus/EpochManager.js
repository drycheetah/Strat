const CryptoUtils = require('../crypto');
const logger = require('../../utils/logger');

/**
 * EpochManager - Manages blockchain epochs for time-based operations
 * Coordinates validator rotation, reward distribution, and protocol upgrades
 */
class EpochManager {
  constructor(blockchain, options = {}) {
    this.blockchain = blockchain;
    this.epochLength = options.epochLength || 1000; // blocks per epoch
    this.currentEpoch = 0;
    this.epochs = new Map(); // epochNumber -> epoch data
    this.epochStartHeight = 0;
    this.callbacks = new Map(); // event -> callbacks
    this.scheduledTasks = new Map(); // epochNumber -> tasks
    this.epochRewards = new Map(); // epochNumber -> reward data
    this.snapshotInterval = options.snapshotInterval || 10; // epochs between snapshots
  }

  /**
   * Initialize epoch system
   */
  initialize() {
    const currentHeight = this.blockchain.chain.length;
    this.currentEpoch = Math.floor(currentHeight / this.epochLength);
    this.epochStartHeight = this.currentEpoch * this.epochLength;

    logger.info(`Epoch system initialized: Current epoch ${this.currentEpoch}`);

    // Create genesis epoch if needed
    if (!this.epochs.has(0)) {
      this.createEpoch(0, 0);
    }
  }

  /**
   * Create new epoch
   */
  createEpoch(epochNumber, startHeight) {
    const epoch = {
      number: epochNumber,
      startHeight,
      endHeight: startHeight + this.epochLength - 1,
      startTime: Date.now(),
      endTime: null,
      blockCount: 0,
      transactionCount: 0,
      totalFees: 0,
      totalRewards: 0,
      validators: [],
      events: [],
      state: 'active',
      hash: null
    };

    this.epochs.set(epochNumber, epoch);

    logger.info(`Epoch ${epochNumber} created (blocks ${startHeight} - ${epoch.endHeight})`);

    return epoch;
  }

  /**
   * Process new block for epoch
   */
  async processBlock(block) {
    const currentHeight = block.index;
    const expectedEpoch = Math.floor(currentHeight / this.epochLength);

    // Check if we've entered a new epoch
    if (expectedEpoch > this.currentEpoch) {
      await this.finalizeEpoch(this.currentEpoch);
      await this.startNewEpoch(expectedEpoch);
    }

    // Update current epoch stats
    const epoch = this.epochs.get(this.currentEpoch);
    if (epoch) {
      epoch.blockCount++;
      epoch.transactionCount += block.transactions.length;

      // Calculate fees and rewards
      for (let tx of block.transactions) {
        if (tx.fee) {
          epoch.totalFees += tx.fee;
        }
        if (tx.isCoinbase && tx.outputs) {
          epoch.totalRewards += tx.outputs[0].amount;
        }
      }
    }
  }

  /**
   * Finalize completed epoch
   */
  async finalizeEpoch(epochNumber) {
    const epoch = this.epochs.get(epochNumber);

    if (!epoch) {
      throw new Error(`Epoch ${epochNumber} not found`);
    }

    logger.info(`Finalizing epoch ${epochNumber}`);

    epoch.endTime = Date.now();
    epoch.duration = epoch.endTime - epoch.startTime;
    epoch.state = 'finalized';

    // Calculate epoch statistics
    const stats = this.calculateEpochStats(epoch);
    epoch.stats = stats;

    // Calculate epoch hash
    epoch.hash = CryptoUtils.hash(JSON.stringify({
      number: epoch.number,
      startHeight: epoch.startHeight,
      endHeight: epoch.endHeight,
      blockCount: epoch.blockCount,
      transactionCount: epoch.transactionCount
    }));

    // Distribute rewards
    await this.distributeEpochRewards(epochNumber);

    // Execute scheduled tasks
    await this.executeScheduledTasks(epochNumber);

    // Trigger epoch end callbacks
    await this.triggerCallbacks('epoch_end', epoch);

    // Create snapshot if needed
    if (epochNumber % this.snapshotInterval === 0) {
      await this.createEpochSnapshot(epochNumber);
    }

    logger.info(`Epoch ${epochNumber} finalized: ${stats.blocksPerSecond.toFixed(2)} blocks/sec`);

    return epoch;
  }

  /**
   * Start new epoch
   */
  async startNewEpoch(epochNumber) {
    logger.info(`Starting epoch ${epochNumber}`);

    const startHeight = epochNumber * this.epochLength;
    const epoch = this.createEpoch(epochNumber, startHeight);

    this.currentEpoch = epochNumber;
    this.epochStartHeight = startHeight;

    // Trigger epoch start callbacks
    await this.triggerCallbacks('epoch_start', epoch);

    return epoch;
  }

  /**
   * Calculate epoch statistics
   */
  calculateEpochStats(epoch) {
    const durationSeconds = epoch.duration / 1000;
    const blocksPerSecond = epoch.blockCount / durationSeconds;
    const transactionsPerSecond = epoch.transactionCount / durationSeconds;
    const avgBlockTime = durationSeconds / epoch.blockCount;
    const avgFeesPerBlock = epoch.totalFees / epoch.blockCount;

    return {
      durationSeconds,
      blocksPerSecond,
      transactionsPerSecond,
      avgBlockTime,
      avgTransactionsPerBlock: epoch.transactionCount / epoch.blockCount,
      avgFeesPerBlock,
      totalFees: epoch.totalFees,
      totalRewards: epoch.totalRewards
    };
  }

  /**
   * Distribute epoch rewards
   */
  async distributeEpochRewards(epochNumber) {
    const epoch = this.epochs.get(epochNumber);

    if (!epoch) {
      return;
    }

    logger.info(`Distributing rewards for epoch ${epochNumber}`);

    const rewardData = {
      epochNumber,
      totalRewards: epoch.totalRewards,
      totalFees: epoch.totalFees,
      validators: [],
      distributedAt: Date.now()
    };

    // In production, this would distribute to validators based on their participation
    // For now, we just record the reward data

    this.epochRewards.set(epochNumber, rewardData);

    logger.info(`Epoch ${epochNumber} rewards distributed: ${epoch.totalRewards} STRAT`);
  }

  /**
   * Schedule task for specific epoch
   */
  scheduleTask(epochNumber, task, metadata = {}) {
    if (!this.scheduledTasks.has(epochNumber)) {
      this.scheduledTasks.set(epochNumber, []);
    }

    const tasks = this.scheduledTasks.get(epochNumber);
    tasks.push({
      task,
      metadata,
      scheduledAt: Date.now(),
      executed: false
    });

    logger.info(`Task scheduled for epoch ${epochNumber}: ${task}`);
  }

  /**
   * Execute scheduled tasks for epoch
   */
  async executeScheduledTasks(epochNumber) {
    const tasks = this.scheduledTasks.get(epochNumber);

    if (!tasks || tasks.length === 0) {
      return;
    }

    logger.info(`Executing ${tasks.length} scheduled tasks for epoch ${epochNumber}`);

    for (let taskData of tasks) {
      try {
        await this.executeTask(taskData.task, taskData.metadata);
        taskData.executed = true;
        taskData.executedAt = Date.now();
      } catch (error) {
        logger.error(`Failed to execute task ${taskData.task}: ${error.message}`);
        taskData.error = error.message;
      }
    }

    // Cleanup executed tasks
    this.scheduledTasks.delete(epochNumber);
  }

  /**
   * Execute individual task
   */
  async executeTask(task, metadata) {
    logger.info(`Executing task: ${task}`);

    // Handle different task types
    switch (task) {
      case 'validator_rotation':
        await this.triggerCallbacks('validator_rotation', metadata);
        break;

      case 'difficulty_adjustment':
        await this.triggerCallbacks('difficulty_adjustment', metadata);
        break;

      case 'protocol_upgrade':
        await this.triggerCallbacks('protocol_upgrade', metadata);
        break;

      case 'checkpoint_creation':
        await this.triggerCallbacks('checkpoint_creation', metadata);
        break;

      default:
        logger.warn(`Unknown task type: ${task}`);
    }
  }

  /**
   * Register callback for epoch events
   */
  on(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }

    this.callbacks.get(event).push(callback);

    logger.info(`Callback registered for event: ${event}`);
  }

  /**
   * Trigger callbacks for event
   */
  async triggerCallbacks(event, data) {
    const callbacks = this.callbacks.get(event);

    if (!callbacks || callbacks.length === 0) {
      return;
    }

    logger.info(`Triggering ${callbacks.length} callbacks for event: ${event}`);

    for (let callback of callbacks) {
      try {
        await callback(data);
      } catch (error) {
        logger.error(`Callback error for event ${event}: ${error.message}`);
      }
    }
  }

  /**
   * Create epoch snapshot
   */
  async createEpochSnapshot(epochNumber) {
    const epoch = this.epochs.get(epochNumber);

    if (!epoch) {
      return;
    }

    logger.info(`Creating snapshot for epoch ${epochNumber}`);

    const snapshot = {
      epochNumber,
      timestamp: Date.now(),
      state: {
        blockHeight: this.blockchain.chain.length,
        difficulty: this.blockchain.difficulty,
        utxos: this.blockchain.utxos.size,
        validators: epoch.validators.length
      },
      stats: epoch.stats,
      hash: epoch.hash
    };

    // In production, this would be stored persistently
    epoch.snapshot = snapshot;

    logger.info(`Epoch ${epochNumber} snapshot created`);

    return snapshot;
  }

  /**
   * Get current epoch
   */
  getCurrentEpoch() {
    return this.epochs.get(this.currentEpoch);
  }

  /**
   * Get epoch by number
   */
  getEpoch(epochNumber) {
    return this.epochs.get(epochNumber);
  }

  /**
   * Get epoch for block height
   */
  getEpochForHeight(height) {
    const epochNumber = Math.floor(height / this.epochLength);
    return this.epochs.get(epochNumber);
  }

  /**
   * Get epoch progress
   */
  getEpochProgress() {
    const currentHeight = this.blockchain.chain.length;
    const epochStartHeight = this.currentEpoch * this.epochLength;
    const blocksInEpoch = currentHeight - epochStartHeight;
    const progress = (blocksInEpoch / this.epochLength) * 100;

    return {
      currentEpoch: this.currentEpoch,
      blocksInEpoch,
      totalBlocks: this.epochLength,
      progress: progress.toFixed(2),
      blocksRemaining: this.epochLength - blocksInEpoch,
      estimatedTimeRemaining: this.estimateTimeRemaining(blocksInEpoch)
    };
  }

  /**
   * Estimate time remaining in epoch
   */
  estimateTimeRemaining(blocksInEpoch) {
    const epoch = this.epochs.get(this.currentEpoch);

    if (!epoch) {
      return 0;
    }

    const elapsedTime = Date.now() - epoch.startTime;
    const avgBlockTime = elapsedTime / blocksInEpoch;
    const blocksRemaining = this.epochLength - blocksInEpoch;

    return blocksRemaining * avgBlockTime;
  }

  /**
   * Get epoch statistics
   */
  getStats() {
    const epochs = Array.from(this.epochs.values());
    const finalizedEpochs = epochs.filter(e => e.state === 'finalized');

    let totalBlocks = 0;
    let totalTransactions = 0;
    let totalFees = 0;
    let totalRewards = 0;

    for (let epoch of finalizedEpochs) {
      totalBlocks += epoch.blockCount;
      totalTransactions += epoch.transactionCount;
      totalFees += epoch.totalFees;
      totalRewards += epoch.totalRewards;
    }

    return {
      currentEpoch: this.currentEpoch,
      totalEpochs: this.epochs.size,
      finalizedEpochs: finalizedEpochs.length,
      epochLength: this.epochLength,
      totalBlocks,
      totalTransactions,
      totalFees,
      totalRewards,
      scheduledTasks: this.scheduledTasks.size,
      callbacks: Array.from(this.callbacks.keys())
    };
  }

  /**
   * Get epoch history
   */
  getEpochHistory(limit = 10) {
    const epochs = Array.from(this.epochs.values())
      .filter(e => e.state === 'finalized')
      .sort((a, b) => b.number - a.number)
      .slice(0, limit);

    return epochs.map(e => ({
      number: e.number,
      startHeight: e.startHeight,
      endHeight: e.endHeight,
      blockCount: e.blockCount,
      transactionCount: e.transactionCount,
      stats: e.stats,
      hash: e.hash
    }));
  }

  /**
   * Get rewards for epoch
   */
  getEpochRewards(epochNumber) {
    return this.epochRewards.get(epochNumber);
  }

  /**
   * Check if epoch is complete
   */
  isEpochComplete(epochNumber) {
    const epoch = this.epochs.get(epochNumber);
    return epoch && epoch.state === 'finalized';
  }

  /**
   * Get upcoming scheduled tasks
   */
  getUpcomingTasks(limit = 5) {
    const upcoming = [];

    for (let [epochNumber, tasks] of this.scheduledTasks) {
      if (epochNumber >= this.currentEpoch) {
        for (let taskData of tasks) {
          upcoming.push({
            epochNumber,
            task: taskData.task,
            metadata: taskData.metadata,
            executed: taskData.executed
          });
        }
      }
    }

    return upcoming
      .sort((a, b) => a.epochNumber - b.epochNumber)
      .slice(0, limit);
  }

  /**
   * Export epoch data
   */
  exportEpoch(epochNumber) {
    const epoch = this.epochs.get(epochNumber);

    if (!epoch) {
      throw new Error(`Epoch ${epochNumber} not found`);
    }

    return {
      number: epoch.number,
      startHeight: epoch.startHeight,
      endHeight: epoch.endHeight,
      duration: epoch.duration,
      blockCount: epoch.blockCount,
      transactionCount: epoch.transactionCount,
      totalFees: epoch.totalFees,
      totalRewards: epoch.totalRewards,
      stats: epoch.stats,
      state: epoch.state,
      hash: epoch.hash
    };
  }
}

module.exports = EpochManager;
