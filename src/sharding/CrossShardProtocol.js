const CryptoUtils = require('../crypto');
const logger = require('../../utils/logger');

/**
 * CrossShardProtocol - Handles cross-shard transaction protocol
 * Implements atomic cross-shard transfers with rollback capability
 */
class CrossShardProtocol {
  constructor(shardManager) {
    this.shardManager = shardManager;
    this.pendingCrossShardTx = new Map(); // txHash -> state
    this.commitLog = []; // Persistent commit log
    this.lockManager = new LockManager();
    this.receiptCache = new Map(); // Cross-shard receipts
    this.timeout = 30000; // 30 seconds timeout for cross-shard tx
  }

  /**
   * Initiate cross-shard transaction
   */
  async initiateTransaction(transaction) {
    const txId = transaction.hash;

    logger.info(`Initiating cross-shard transaction ${txId}`);

    // Create transaction state
    const txState = {
      transaction,
      status: 'initiated',
      involvedShards: this.identifyInvolvedShards(transaction),
      locks: [],
      receipts: new Map(),
      startTime: Date.now(),
      phase: 'prepare'
    };

    this.pendingCrossShardTx.set(txId, txState);

    try {
      // Phase 1: Prepare and lock
      await this.preparePhase(txState);

      // Phase 2: Validate
      await this.validatePhase(txState);

      // Phase 3: Commit
      await this.commitPhase(txState);

      // Phase 4: Finalize
      await this.finalizePhase(txState);

      return {
        success: true,
        txId,
        involvedShards: txState.involvedShards,
        receipts: Array.from(txState.receipts.values())
      };

    } catch (error) {
      logger.error(`Cross-shard transaction ${txId} failed: ${error.message}`);

      // Rollback on failure
      await this.rollbackTransaction(txState);

      throw error;
    } finally {
      // Cleanup
      this.pendingCrossShardTx.delete(txId);
    }
  }

  /**
   * Identify all shards involved in transaction
   */
  identifyInvolvedShards(transaction) {
    const shards = new Set();

    // Source shards (inputs)
    for (let input of transaction.inputs || []) {
      const shardId = this.shardManager.getShardForAddress(input.address || 'unknown');
      shards.add(shardId);
    }

    // Destination shards (outputs)
    for (let output of transaction.outputs || []) {
      const shardId = this.shardManager.getShardForAddress(output.address);
      shards.add(shardId);
    }

    return Array.from(shards);
  }

  /**
   * Phase 1: Prepare and acquire locks
   */
  async preparePhase(txState) {
    txState.phase = 'prepare';
    txState.status = 'preparing';

    logger.info(`Prepare phase for transaction ${txState.transaction.hash}`);

    const { transaction, involvedShards } = txState;

    // Acquire locks on all involved shards
    for (let shardId of involvedShards) {
      try {
        // Acquire shard lock
        const lock = await this.lockManager.acquireLock(shardId, transaction.hash);
        txState.locks.push(lock);

        // Validate resources available
        const shard = this.shardManager.getShard(shardId);
        const canPrepare = this.validateShardResources(transaction, shard);

        if (!canPrepare) {
          throw new Error(`Shard ${shardId} cannot prepare transaction`);
        }

        // Lock UTXOs in source shards
        if (transaction.inputs) {
          for (let input of transaction.inputs) {
            const inputShardId = this.shardManager.getShardForAddress(input.address || 'unknown');
            if (inputShardId === shardId) {
              await this.lockUTXO(shardId, input.txHash, input.outputIndex, transaction.hash);
            }
          }
        }

        // Create prepare receipt
        const receipt = {
          shardId,
          txHash: transaction.hash,
          phase: 'prepare',
          status: 'ready',
          timestamp: Date.now(),
          signature: this.signReceipt(shardId, transaction.hash, 'prepare')
        };

        txState.receipts.set(shardId, receipt);

        logger.info(`Shard ${shardId} prepared for transaction ${transaction.hash}`);

      } catch (error) {
        logger.error(`Prepare failed on shard ${shardId}: ${error.message}`);
        throw new Error(`Prepare phase failed on shard ${shardId}: ${error.message}`);
      }
    }

    // Check timeout
    if (Date.now() - txState.startTime > this.timeout) {
      throw new Error('Prepare phase timeout');
    }

    txState.status = 'prepared';
  }

  /**
   * Phase 2: Validate across all shards
   */
  async validatePhase(txState) {
    txState.phase = 'validate';
    txState.status = 'validating';

    logger.info(`Validate phase for transaction ${txState.transaction.hash}`);

    const { transaction, involvedShards } = txState;

    // Validate transaction on each shard
    for (let shardId of involvedShards) {
      const shard = this.shardManager.getShard(shardId);

      // Validate inputs exist and are spendable
      if (transaction.inputs) {
        for (let input of transaction.inputs) {
          const inputShardId = this.shardManager.getShardForAddress(input.address || 'unknown');

          if (inputShardId === shardId) {
            const utxoKey = `${input.txHash}:${input.outputIndex}`;
            const utxo = shard.utxos.get(utxoKey);

            if (!utxo) {
              throw new Error(`UTXO not found in shard ${shardId}: ${utxoKey}`);
            }

            // Verify UTXO is locked for this transaction
            const isLocked = await this.isUTXOLocked(shardId, input.txHash, input.outputIndex, transaction.hash);
            if (!isLocked) {
              throw new Error(`UTXO not properly locked: ${utxoKey}`);
            }
          }
        }
      }

      // Update receipt
      const receipt = txState.receipts.get(shardId);
      receipt.phase = 'validate';
      receipt.status = 'validated';
      receipt.timestamp = Date.now();
      receipt.signature = this.signReceipt(shardId, transaction.hash, 'validate');
    }

    // Verify all shards validated
    const allValidated = Array.from(txState.receipts.values())
      .every(r => r.status === 'validated');

    if (!allValidated) {
      throw new Error('Validation failed on one or more shards');
    }

    txState.status = 'validated';
  }

  /**
   * Phase 3: Commit transaction
   */
  async commitPhase(txState) {
    txState.phase = 'commit';
    txState.status = 'committing';

    logger.info(`Commit phase for transaction ${txState.transaction.hash}`);

    const { transaction, involvedShards } = txState;

    // Write to commit log (for recovery)
    this.writeToCommitLog({
      txHash: transaction.hash,
      involvedShards,
      timestamp: Date.now(),
      phase: 'commit'
    });

    // Commit on each shard
    for (let shardId of involvedShards) {
      try {
        await this.commitOnShard(shardId, transaction);

        // Update receipt
        const receipt = txState.receipts.get(shardId);
        receipt.phase = 'commit';
        receipt.status = 'committed';
        receipt.timestamp = Date.now();
        receipt.signature = this.signReceipt(shardId, transaction.hash, 'commit');

      } catch (error) {
        logger.error(`Commit failed on shard ${shardId}: ${error.message}`);
        throw new Error(`Commit phase failed on shard ${shardId}: ${error.message}`);
      }
    }

    txState.status = 'committed';
  }

  /**
   * Phase 4: Finalize and release locks
   */
  async finalizePhase(txState) {
    txState.phase = 'finalize';
    txState.status = 'finalizing';

    logger.info(`Finalize phase for transaction ${txState.transaction.hash}`);

    // Release all locks
    for (let lock of txState.locks) {
      await this.lockManager.releaseLock(lock);
    }

    // Cache receipts for verification
    this.receiptCache.set(txState.transaction.hash, {
      receipts: Array.from(txState.receipts.values()),
      timestamp: Date.now()
    });

    // Write finalize to commit log
    this.writeToCommitLog({
      txHash: txState.transaction.hash,
      timestamp: Date.now(),
      phase: 'finalize',
      status: 'success'
    });

    txState.status = 'finalized';
    logger.info(`Transaction ${txState.transaction.hash} finalized successfully`);
  }

  /**
   * Rollback transaction on failure
   */
  async rollbackTransaction(txState) {
    logger.warn(`Rolling back transaction ${txState.transaction.hash}`);

    const { transaction, involvedShards } = txState;

    // Rollback on each shard
    for (let shardId of involvedShards) {
      try {
        await this.rollbackOnShard(shardId, transaction);
      } catch (error) {
        logger.error(`Rollback error on shard ${shardId}: ${error.message}`);
      }
    }

    // Release all locks
    for (let lock of txState.locks) {
      await this.lockManager.releaseLock(lock);
    }

    // Write rollback to commit log
    this.writeToCommitLog({
      txHash: transaction.hash,
      timestamp: Date.now(),
      phase: 'rollback',
      status: 'aborted'
    });

    logger.info(`Transaction ${transaction.hash} rolled back`);
  }

  /**
   * Commit transaction on specific shard
   */
  async commitOnShard(shardId, transaction) {
    const shard = this.shardManager.getShard(shardId);

    // Remove spent UTXOs
    if (transaction.inputs) {
      for (let input of transaction.inputs) {
        const inputShardId = this.shardManager.getShardForAddress(input.address || 'unknown');
        if (inputShardId === shardId) {
          const utxoKey = `${input.txHash}:${input.outputIndex}`;
          shard.utxos.delete(utxoKey);
          await this.unlockUTXO(shardId, input.txHash, input.outputIndex, transaction.hash);
        }
      }
    }

    // Add new UTXOs
    if (transaction.outputs) {
      transaction.outputs.forEach((output, index) => {
        const outputShardId = this.shardManager.getShardForAddress(output.address);
        if (outputShardId === shardId) {
          const utxoKey = `${transaction.hash}:${index}`;
          shard.utxos.set(utxoKey, {
            txHash: transaction.hash,
            outputIndex: index,
            address: output.address,
            amount: output.amount,
            shardId
          });
        }
      });
    }

    logger.info(`Transaction ${transaction.hash} committed on shard ${shardId}`);
  }

  /**
   * Rollback transaction on specific shard
   */
  async rollbackOnShard(shardId, transaction) {
    // Unlock any locked UTXOs
    if (transaction.inputs) {
      for (let input of transaction.inputs) {
        const inputShardId = this.shardManager.getShardForAddress(input.address || 'unknown');
        if (inputShardId === shardId) {
          await this.unlockUTXO(shardId, input.txHash, input.outputIndex, transaction.hash);
        }
      }
    }

    logger.info(`Transaction ${transaction.hash} rolled back on shard ${shardId}`);
  }

  /**
   * Validate shard has resources for transaction
   */
  validateShardResources(transaction, shard) {
    // Check if shard has capacity
    if (shard.utilization > 95) {
      return false;
    }

    // Check if shard has required UTXOs
    if (transaction.inputs) {
      for (let input of transaction.inputs) {
        const utxoKey = `${input.txHash}:${input.outputIndex}`;
        if (!shard.utxos.has(utxoKey)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Lock UTXO for transaction
   */
  async lockUTXO(shardId, txHash, outputIndex, lockingTxHash) {
    const lockKey = `${shardId}:${txHash}:${outputIndex}`;
    await this.lockManager.acquireLock(lockKey, lockingTxHash);
  }

  /**
   * Unlock UTXO
   */
  async unlockUTXO(shardId, txHash, outputIndex, lockingTxHash) {
    const lockKey = `${shardId}:${txHash}:${outputIndex}`;
    await this.lockManager.releaseLock({ key: lockKey, owner: lockingTxHash });
  }

  /**
   * Check if UTXO is locked for specific transaction
   */
  async isUTXOLocked(shardId, txHash, outputIndex, lockingTxHash) {
    const lockKey = `${shardId}:${txHash}:${outputIndex}`;
    return this.lockManager.isLockedBy(lockKey, lockingTxHash);
  }

  /**
   * Sign receipt for verification
   */
  signReceipt(shardId, txHash, phase) {
    return CryptoUtils.hash(`${shardId}:${txHash}:${phase}:${Date.now()}`);
  }

  /**
   * Write to commit log for recovery
   */
  writeToCommitLog(entry) {
    this.commitLog.push({
      ...entry,
      index: this.commitLog.length
    });

    // Keep only last 10000 entries
    if (this.commitLog.length > 10000) {
      this.commitLog.shift();
    }
  }

  /**
   * Get cross-shard transaction receipt
   */
  getReceipt(txHash) {
    return this.receiptCache.get(txHash);
  }

  /**
   * Get protocol statistics
   */
  getStats() {
    return {
      pendingTransactions: this.pendingCrossShardTx.size,
      commitLogSize: this.commitLog.length,
      cachedReceipts: this.receiptCache.size,
      activeLocks: this.lockManager.getActiveLocks()
    };
  }
}

/**
 * LockManager - Manages distributed locks for cross-shard transactions
 */
class LockManager {
  constructor() {
    this.locks = new Map(); // key -> { owner, timestamp }
    this.lockTimeout = 30000; // 30 seconds
  }

  /**
   * Acquire lock
   */
  async acquireLock(key, owner) {
    // Clean expired locks
    this.cleanExpiredLocks();

    // Check if already locked
    const existingLock = this.locks.get(key);
    if (existingLock && existingLock.owner !== owner) {
      throw new Error(`Lock ${key} already held by ${existingLock.owner}`);
    }

    const lock = {
      key,
      owner,
      timestamp: Date.now()
    };

    this.locks.set(key, lock);
    return lock;
  }

  /**
   * Release lock
   */
  async releaseLock(lock) {
    const existingLock = this.locks.get(lock.key);
    if (existingLock && existingLock.owner === lock.owner) {
      this.locks.delete(lock.key);
    }
  }

  /**
   * Check if locked by specific owner
   */
  isLockedBy(key, owner) {
    const lock = this.locks.get(key);
    return lock && lock.owner === owner;
  }

  /**
   * Clean expired locks
   */
  cleanExpiredLocks() {
    const now = Date.now();
    for (let [key, lock] of this.locks) {
      if (now - lock.timestamp > this.lockTimeout) {
        this.locks.delete(key);
        logger.warn(`Lock ${key} expired and removed`);
      }
    }
  }

  /**
   * Get number of active locks
   */
  getActiveLocks() {
    this.cleanExpiredLocks();
    return this.locks.size;
  }
}

module.exports = CrossShardProtocol;
