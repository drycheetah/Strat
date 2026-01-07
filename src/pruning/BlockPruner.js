const logger = require('../../utils/logger');
const CryptoUtils = require('../crypto');

/**
 * BlockPruner - Implements blockchain pruning for state management
 * Reduces storage requirements while maintaining chain integrity
 */
class BlockPruner {
  constructor(blockchain, options = {}) {
    this.blockchain = blockchain;
    this.pruningInterval = options.pruningInterval || 1000; // Prune every N blocks
    this.retentionBlocks = options.retentionBlocks || 10000; // Keep last N blocks
    this.snapshotInterval = options.snapshotInterval || 5000; // Snapshot every N blocks
    this.snapshots = new Map(); // height -> snapshot
    this.prunedBlocks = new Set(); // Track pruned block heights
    this.archiveMode = options.archiveMode || false;
    this.compressionEnabled = options.compression || true;
  }

  /**
   * Check if pruning is needed
   */
  shouldPrune() {
    if (this.archiveMode) {
      return false;
    }

    const chainHeight = this.blockchain.chain.length;
    return chainHeight > this.retentionBlocks &&
           chainHeight % this.pruningInterval === 0;
  }

  /**
   * Perform pruning operation
   */
  async prune() {
    if (!this.shouldPrune()) {
      return { pruned: false, reason: 'Pruning not needed' };
    }

    const startTime = Date.now();
    const chainHeight = this.blockchain.chain.length;
    const pruneUpTo = chainHeight - this.retentionBlocks;

    logger.info(`Starting block pruning up to height ${pruneUpTo}`);

    try {
      // Create snapshot before pruning
      await this.createSnapshot(pruneUpTo);

      // Prune blocks
      const prunedCount = await this.pruneBlocks(pruneUpTo);

      // Prune UTXOs
      const prunedUtxos = await this.pruneUTXOs();

      // Prune transactions
      const prunedTxs = await this.pruneTransactions(pruneUpTo);

      // Compact storage
      if (this.compressionEnabled) {
        await this.compactStorage();
      }

      const duration = Date.now() - startTime;

      const result = {
        pruned: true,
        prunedBlocks: prunedCount,
        prunedUtxos,
        prunedTransactions: prunedTxs,
        pruneHeight: pruneUpTo,
        currentHeight: chainHeight,
        duration,
        timestamp: Date.now()
      };

      logger.info(`Pruning completed: ${JSON.stringify(result)}`);

      return result;

    } catch (error) {
      logger.error(`Pruning failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create state snapshot at specific height
   */
  async createSnapshot(height) {
    logger.info(`Creating snapshot at height ${height}`);

    const block = this.blockchain.chain[height];
    if (!block) {
      throw new Error(`Block at height ${height} not found`);
    }

    // Create UTXO snapshot
    const utxoSnapshot = new Map();
    for (let [key, utxo] of this.blockchain.utxos) {
      utxoSnapshot.set(key, { ...utxo });
    }

    // Create contract state snapshot
    const contractSnapshot = new Map();
    for (let [address, contract] of this.blockchain.contracts) {
      contractSnapshot.set(address, {
        code: contract.code,
        state: { ...contract.state },
        balance: contract.balance
      });
    }

    const snapshot = {
      height,
      blockHash: block.hash,
      timestamp: Date.now(),
      utxos: utxoSnapshot,
      utxoCount: utxoSnapshot.size,
      contracts: contractSnapshot,
      contractCount: contractSnapshot.size,
      difficulty: this.blockchain.difficulty,
      totalSupply: this.calculateTotalSupply(utxoSnapshot),
      merkleRoot: this.calculateMerkleRoot(utxoSnapshot),
      hash: null // Will be calculated
    };

    // Calculate snapshot hash
    snapshot.hash = CryptoUtils.hash(JSON.stringify({
      height: snapshot.height,
      blockHash: snapshot.blockHash,
      utxoCount: snapshot.utxoCount,
      merkleRoot: snapshot.merkleRoot
    }));

    this.snapshots.set(height, snapshot);

    // Keep only recent snapshots
    this.cleanOldSnapshots();

    logger.info(`Snapshot created at height ${height}: ${snapshot.hash}`);

    return snapshot;
  }

  /**
   * Prune blocks up to specified height
   */
  async pruneBlocks(pruneUpTo) {
    let prunedCount = 0;

    for (let i = 1; i < pruneUpTo; i++) {
      if (this.shouldKeepBlock(i)) {
        continue;
      }

      // Keep block headers, prune transaction data
      const block = this.blockchain.chain[i];
      if (block) {
        // Create lightweight block header
        this.blockchain.chain[i] = {
          index: block.index,
          timestamp: block.timestamp,
          previousHash: block.previousHash,
          hash: block.hash,
          merkleRoot: block.merkleRoot,
          difficulty: block.difficulty,
          nonce: block.nonce,
          pruned: true,
          transactionCount: block.transactions.length
        };

        this.prunedBlocks.add(i);
        prunedCount++;
      }
    }

    logger.info(`Pruned ${prunedCount} blocks`);
    return prunedCount;
  }

  /**
   * Check if block should be kept (snapshots, checkpoints, etc.)
   */
  shouldKeepBlock(height) {
    // Keep snapshot blocks
    if (height % this.snapshotInterval === 0) {
      return true;
    }

    // Keep checkpoint blocks
    if (height % 1000 === 0) {
      return true;
    }

    return false;
  }

  /**
   * Prune spent UTXOs that are no longer needed
   */
  async pruneUTXOs() {
    let prunedCount = 0;
    const currentHeight = this.blockchain.chain.length;

    // Identify ancient spent UTXOs (confirmed in pruned blocks)
    const utxosToRemove = [];

    for (let [key, utxo] of this.blockchain.utxos) {
      // Find the block where this UTXO was created
      const txHeight = this.findTransactionHeight(utxo.txHash);

      if (txHeight !== -1 && txHeight < currentHeight - this.retentionBlocks) {
        // Check if UTXO is very old and unspent (potential dust)
        if (utxo.amount < 0.00001) {
          utxosToRemove.push(key);
        }
      }
    }

    // Remove identified UTXOs
    for (let key of utxosToRemove) {
      this.blockchain.utxos.delete(key);
      prunedCount++;
    }

    logger.info(`Pruned ${prunedCount} UTXOs`);
    return prunedCount;
  }

  /**
   * Prune old transaction references
   */
  async pruneTransactions(pruneUpTo) {
    let prunedCount = 0;

    // Remove old transactions from mempool history
    if (this.blockchain.mempool && this.blockchain.mempool.history) {
      const oldTxs = [];

      for (let [hash, tx] of this.blockchain.mempool.history) {
        if (tx.timestamp < Date.now() - (30 * 24 * 60 * 60 * 1000)) {
          oldTxs.push(hash);
        }
      }

      for (let hash of oldTxs) {
        this.blockchain.mempool.history.delete(hash);
        prunedCount++;
      }
    }

    logger.info(`Pruned ${prunedCount} old transactions`);
    return prunedCount;
  }

  /**
   * Compact storage by removing redundant data
   */
  async compactStorage() {
    logger.info('Compacting storage...');

    // Compress old snapshots
    for (let [height, snapshot] of this.snapshots) {
      if (snapshot.compressed) {
        continue;
      }

      // Simple compression: remove detailed UTXO data, keep only merkle root
      snapshot.utxos = null;
      snapshot.contracts = null;
      snapshot.compressed = true;
    }

    logger.info('Storage compaction completed');
  }

  /**
   * Find the block height where a transaction was included
   */
  findTransactionHeight(txHash) {
    for (let i = this.blockchain.chain.length - 1; i >= 0; i--) {
      const block = this.blockchain.chain[i];

      // Skip pruned blocks without transaction data
      if (block.pruned) {
        continue;
      }

      if (block.transactions) {
        for (let tx of block.transactions) {
          if (tx.hash === txHash) {
            return i;
          }
        }
      }
    }

    return -1;
  }

  /**
   * Calculate total supply from UTXO set
   */
  calculateTotalSupply(utxoSet) {
    let total = 0;
    for (let [key, utxo] of utxoSet) {
      total += utxo.amount;
    }
    return total;
  }

  /**
   * Calculate Merkle root of UTXO set
   */
  calculateMerkleRoot(utxoSet) {
    const utxoHashes = [];

    for (let [key, utxo] of utxoSet) {
      utxoHashes.push(CryptoUtils.hash(JSON.stringify(utxo)));
    }

    if (utxoHashes.length === 0) {
      return CryptoUtils.hash('empty');
    }

    return this.buildMerkleTree(utxoHashes);
  }

  /**
   * Build Merkle tree from hashes
   */
  buildMerkleTree(hashes) {
    if (hashes.length === 1) {
      return hashes[0];
    }

    const newLevel = [];

    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = i + 1 < hashes.length ? hashes[i + 1] : left;
      newLevel.push(CryptoUtils.hash(left + right));
    }

    return this.buildMerkleTree(newLevel);
  }

  /**
   * Clean old snapshots
   */
  cleanOldSnapshots() {
    const maxSnapshots = 10;
    const snapshots = Array.from(this.snapshots.entries())
      .sort((a, b) => b[0] - a[0]); // Sort by height descending

    // Keep only most recent snapshots
    while (snapshots.length > maxSnapshots) {
      const [height] = snapshots.pop();
      this.snapshots.delete(height);
    }
  }

  /**
   * Restore state from snapshot
   */
  async restoreFromSnapshot(height) {
    const snapshot = this.snapshots.get(height);

    if (!snapshot) {
      throw new Error(`Snapshot at height ${height} not found`);
    }

    if (snapshot.compressed) {
      throw new Error('Cannot restore from compressed snapshot');
    }

    logger.info(`Restoring state from snapshot at height ${height}`);

    // Restore UTXOs
    this.blockchain.utxos.clear();
    for (let [key, utxo] of snapshot.utxos) {
      this.blockchain.utxos.set(key, { ...utxo });
    }

    // Restore contracts
    this.blockchain.contracts.clear();
    for (let [address, contract] of snapshot.contracts) {
      this.blockchain.contracts.set(address, { ...contract });
    }

    // Restore blockchain state
    this.blockchain.difficulty = snapshot.difficulty;

    logger.info(`State restored from snapshot at height ${height}`);

    return {
      height,
      utxos: snapshot.utxoCount,
      contracts: snapshot.contractCount,
      hash: snapshot.hash
    };
  }

  /**
   * Verify snapshot integrity
   */
  verifySnapshot(height) {
    const snapshot = this.snapshots.get(height);

    if (!snapshot) {
      return { valid: false, reason: 'Snapshot not found' };
    }

    // Verify hash
    const calculatedHash = CryptoUtils.hash(JSON.stringify({
      height: snapshot.height,
      blockHash: snapshot.blockHash,
      utxoCount: snapshot.utxoCount,
      merkleRoot: snapshot.merkleRoot
    }));

    if (calculatedHash !== snapshot.hash) {
      return { valid: false, reason: 'Hash mismatch' };
    }

    return { valid: true, snapshot };
  }

  /**
   * Get pruning statistics
   */
  getStats() {
    const chainHeight = this.blockchain.chain.length;
    const prunedCount = this.prunedBlocks.size;
    const retainedCount = chainHeight - prunedCount;

    return {
      chainHeight,
      prunedBlocks: prunedCount,
      retainedBlocks: retainedCount,
      snapshots: this.snapshots.size,
      utxos: this.blockchain.utxos.size,
      pruningInterval: this.pruningInterval,
      retentionBlocks: this.retentionBlocks,
      archiveMode: this.archiveMode,
      spaceReduction: ((prunedCount / chainHeight) * 100).toFixed(2) + '%'
    };
  }

  /**
   * Export snapshot for sharing
   */
  exportSnapshot(height) {
    const snapshot = this.snapshots.get(height);

    if (!snapshot) {
      throw new Error(`Snapshot at height ${height} not found`);
    }

    return {
      height: snapshot.height,
      blockHash: snapshot.blockHash,
      timestamp: snapshot.timestamp,
      utxoCount: snapshot.utxoCount,
      contractCount: snapshot.contractCount,
      merkleRoot: snapshot.merkleRoot,
      hash: snapshot.hash,
      totalSupply: snapshot.totalSupply
    };
  }
}

module.exports = BlockPruner;
