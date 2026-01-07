const CryptoUtils = require('../crypto');
const logger = require('../../utils/logger');

/**
 * CheckpointSystem - Implements fast blockchain synchronization using checkpoints
 * Allows new nodes to quickly sync without validating entire chain
 */
class CheckpointSystem {
  constructor(blockchain, options = {}) {
    this.blockchain = blockchain;
    this.checkpointInterval = options.checkpointInterval || 1000; // Every N blocks
    this.checkpoints = new Map(); // height -> checkpoint
    this.trustedCheckpoints = new Map(); // Hardcoded trusted checkpoints
    this.pendingCheckpoints = []; // Checkpoints waiting for confirmation
    this.confirmationBlocks = options.confirmationBlocks || 100;
    this.maxCheckpoints = options.maxCheckpoints || 100;
    this.enabled = options.enabled !== false;

    this.initializeTrustedCheckpoints();
  }

  /**
   * Initialize hardcoded trusted checkpoints
   */
  initializeTrustedCheckpoints() {
    // Genesis checkpoint
    if (this.blockchain.chain.length > 0) {
      const genesisBlock = this.blockchain.chain[0];
      this.addTrustedCheckpoint(0, genesisBlock.hash, {
        totalSupply: 1000000,
        utxoCount: 1,
        difficulty: genesisBlock.difficulty || 4
      });
    }

    logger.info('Initialized trusted checkpoints');
  }

  /**
   * Add trusted checkpoint (hardcoded)
   */
  addTrustedCheckpoint(height, blockHash, state) {
    const checkpoint = {
      height,
      blockHash,
      state,
      trusted: true,
      timestamp: Date.now(),
      hash: CryptoUtils.hash(JSON.stringify({ height, blockHash, state }))
    };

    this.trustedCheckpoints.set(height, checkpoint);
    this.checkpoints.set(height, checkpoint);

    logger.info(`Added trusted checkpoint at height ${height}`);
  }

  /**
   * Create checkpoint at current height
   */
  async createCheckpoint(height) {
    if (!this.enabled) {
      return null;
    }

    if (height < 0 || height >= this.blockchain.chain.length) {
      throw new Error('Invalid checkpoint height');
    }

    logger.info(`Creating checkpoint at height ${height}`);

    const block = this.blockchain.chain[height];

    if (!block) {
      throw new Error('Block not found for checkpoint');
    }

    // Collect blockchain state at this height
    const state = await this.collectState(height);

    // Create checkpoint
    const checkpoint = {
      height,
      blockHash: block.hash,
      previousHash: block.previousHash,
      timestamp: block.timestamp,
      state,
      created: Date.now(),
      confirmed: false,
      confirmations: 0
    };

    // Calculate checkpoint hash
    checkpoint.hash = this.calculateCheckpointHash(checkpoint);

    // Add to pending checkpoints
    this.pendingCheckpoints.push(checkpoint);

    logger.info(`Checkpoint created at height ${height}: ${checkpoint.hash}`);

    return checkpoint;
  }

  /**
   * Collect blockchain state at specific height
   */
  async collectState(height) {
    logger.info(`Collecting state at height ${height}`);

    // Count UTXOs
    const utxoCount = this.blockchain.utxos.size;

    // Calculate total supply
    let totalSupply = 0;
    for (let [key, utxo] of this.blockchain.utxos) {
      totalSupply += utxo.amount;
    }

    // Collect contract addresses
    const contracts = Array.from(this.blockchain.contracts.keys());

    // Calculate state hash (Merkle root of UTXO set)
    const stateHash = this.calculateStateHash();

    return {
      utxoCount,
      totalSupply,
      contractCount: contracts.length,
      contracts: contracts.slice(0, 100), // Sample
      difficulty: this.blockchain.difficulty,
      stateHash
    };
  }

  /**
   * Calculate state hash (Merkle root of UTXO set)
   */
  calculateStateHash() {
    const utxoHashes = [];

    for (let [key, utxo] of this.blockchain.utxos) {
      utxoHashes.push(CryptoUtils.hash(JSON.stringify({
        key,
        address: utxo.address,
        amount: utxo.amount
      })));
    }

    if (utxoHashes.length === 0) {
      return CryptoUtils.hash('empty');
    }

    return this.buildMerkleRoot(utxoHashes);
  }

  /**
   * Build Merkle root from hashes
   */
  buildMerkleRoot(hashes) {
    if (hashes.length === 1) {
      return hashes[0];
    }

    const newLevel = [];

    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = i + 1 < hashes.length ? hashes[i + 1] : left;
      newLevel.push(CryptoUtils.hash(left + right));
    }

    return this.buildMerkleRoot(newLevel);
  }

  /**
   * Calculate checkpoint hash
   */
  calculateCheckpointHash(checkpoint) {
    return CryptoUtils.hash(JSON.stringify({
      height: checkpoint.height,
      blockHash: checkpoint.blockHash,
      stateHash: checkpoint.state.stateHash,
      totalSupply: checkpoint.state.totalSupply
    }));
  }

  /**
   * Confirm checkpoint after N blocks
   */
  confirmCheckpoint(checkpointHeight) {
    const currentHeight = this.blockchain.chain.length;

    // Find pending checkpoint
    const checkpoint = this.pendingCheckpoints.find(c => c.height === checkpointHeight);

    if (!checkpoint) {
      return null;
    }

    checkpoint.confirmations = currentHeight - checkpointHeight;

    if (checkpoint.confirmations >= this.confirmationBlocks) {
      checkpoint.confirmed = true;

      // Move to confirmed checkpoints
      this.checkpoints.set(checkpointHeight, checkpoint);

      // Remove from pending
      const index = this.pendingCheckpoints.indexOf(checkpoint);
      if (index > -1) {
        this.pendingCheckpoints.splice(index, 1);
      }

      logger.info(`Checkpoint at height ${checkpointHeight} confirmed`);

      // Cleanup old checkpoints
      this.cleanupOldCheckpoints();

      return checkpoint;
    }

    return null;
  }

  /**
   * Auto-create checkpoint if needed
   */
  async autoCreateCheckpoint() {
    const currentHeight = this.blockchain.chain.length;

    if (currentHeight % this.checkpointInterval === 0) {
      const checkpoint = await this.createCheckpoint(currentHeight);
      return checkpoint;
    }

    return null;
  }

  /**
   * Get latest confirmed checkpoint
   */
  getLatestCheckpoint() {
    const heights = Array.from(this.checkpoints.keys()).sort((a, b) => b - a);

    for (let height of heights) {
      const checkpoint = this.checkpoints.get(height);
      if (checkpoint.confirmed || checkpoint.trusted) {
        return checkpoint;
      }
    }

    return null;
  }

  /**
   * Get checkpoint at specific height
   */
  getCheckpoint(height) {
    return this.checkpoints.get(height);
  }

  /**
   * Fast sync from checkpoint
   */
  async fastSync(checkpoint, newBlocks) {
    logger.info(`Starting fast sync from checkpoint at height ${checkpoint.height}`);

    try {
      // Verify checkpoint
      if (!this.verifyCheckpoint(checkpoint)) {
        throw new Error('Invalid checkpoint');
      }

      // Apply checkpoint state
      await this.applyCheckpointState(checkpoint);

      // Validate and apply new blocks
      for (let block of newBlocks) {
        if (block.index <= checkpoint.height) {
          continue;
        }

        // Quick validation (lighter than full validation)
        if (!this.quickValidateBlock(block)) {
          throw new Error(`Invalid block at height ${block.index}`);
        }

        this.blockchain.chain.push(block);
        this.blockchain.updateUTXOs(block);
      }

      logger.info(`Fast sync completed: synced ${newBlocks.length} blocks`);

      return {
        success: true,
        checkpointHeight: checkpoint.height,
        syncedBlocks: newBlocks.length,
        finalHeight: this.blockchain.chain.length
      };

    } catch (error) {
      logger.error(`Fast sync failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Apply checkpoint state to blockchain
   */
  async applyCheckpointState(checkpoint) {
    logger.info(`Applying checkpoint state at height ${checkpoint.height}`);

    // Truncate chain to checkpoint
    this.blockchain.chain = this.blockchain.chain.slice(0, checkpoint.height + 1);

    // Restore difficulty
    this.blockchain.difficulty = checkpoint.state.difficulty;

    // Note: Full UTXO set would be downloaded separately
    // This is a simplified version

    logger.info('Checkpoint state applied');
  }

  /**
   * Quick block validation (lighter than full validation)
   */
  quickValidateBlock(block) {
    // Verify hash
    if (block.hash !== block.calculateHash()) {
      return false;
    }

    // Verify proof of work
    if (!block.hash.startsWith('0'.repeat(block.difficulty))) {
      return false;
    }

    // Verify previous hash
    const previousBlock = this.blockchain.chain[block.index - 1];
    if (previousBlock && block.previousHash !== previousBlock.hash) {
      return false;
    }

    return true;
  }

  /**
   * Verify checkpoint integrity
   */
  verifyCheckpoint(checkpoint) {
    // Verify hash
    const calculatedHash = this.calculateCheckpointHash(checkpoint);
    if (calculatedHash !== checkpoint.hash) {
      logger.warn('Checkpoint hash mismatch');
      return false;
    }

    // Check if trusted
    const trustedCheckpoint = this.trustedCheckpoints.get(checkpoint.height);
    if (trustedCheckpoint) {
      if (trustedCheckpoint.hash !== checkpoint.hash) {
        logger.warn('Checkpoint does not match trusted checkpoint');
        return false;
      }
    }

    return true;
  }

  /**
   * Export checkpoint for sharing
   */
  exportCheckpoint(height) {
    const checkpoint = this.checkpoints.get(height);

    if (!checkpoint) {
      throw new Error(`Checkpoint at height ${height} not found`);
    }

    return {
      height: checkpoint.height,
      blockHash: checkpoint.blockHash,
      state: checkpoint.state,
      hash: checkpoint.hash,
      timestamp: checkpoint.timestamp,
      confirmed: checkpoint.confirmed,
      trusted: checkpoint.trusted || false
    };
  }

  /**
   * Import checkpoint
   */
  async importCheckpoint(checkpointData) {
    logger.info(`Importing checkpoint at height ${checkpointData.height}`);

    // Verify checkpoint
    const calculatedHash = this.calculateCheckpointHash(checkpointData);
    if (calculatedHash !== checkpointData.hash) {
      throw new Error('Invalid checkpoint hash');
    }

    // Add to checkpoints
    this.checkpoints.set(checkpointData.height, {
      ...checkpointData,
      imported: true,
      created: Date.now()
    });

    logger.info(`Checkpoint imported at height ${checkpointData.height}`);

    return checkpointData;
  }

  /**
   * Cleanup old checkpoints
   */
  cleanupOldCheckpoints() {
    const heights = Array.from(this.checkpoints.keys())
      .filter(h => !this.trustedCheckpoints.has(h))
      .sort((a, b) => b - a);

    // Keep only maxCheckpoints recent checkpoints
    while (heights.length > this.maxCheckpoints) {
      const oldHeight = heights.pop();
      this.checkpoints.delete(oldHeight);
      logger.info(`Removed old checkpoint at height ${oldHeight}`);
    }
  }

  /**
   * Get checkpoint statistics
   */
  getStats() {
    const confirmedCount = Array.from(this.checkpoints.values())
      .filter(c => c.confirmed || c.trusted).length;

    return {
      totalCheckpoints: this.checkpoints.size,
      confirmedCheckpoints: confirmedCount,
      pendingCheckpoints: this.pendingCheckpoints.length,
      trustedCheckpoints: this.trustedCheckpoints.size,
      latestCheckpoint: this.getLatestCheckpoint()?.height || 0,
      checkpointInterval: this.checkpointInterval,
      enabled: this.enabled
    };
  }

  /**
   * Get checkpoint chain (for verification)
   */
  getCheckpointChain() {
    const heights = Array.from(this.checkpoints.keys()).sort((a, b) => a - b);

    return heights.map(height => {
      const checkpoint = this.checkpoints.get(height);
      return {
        height: checkpoint.height,
        hash: checkpoint.hash,
        blockHash: checkpoint.blockHash,
        confirmed: checkpoint.confirmed,
        trusted: checkpoint.trusted || false
      };
    });
  }

  /**
   * Validate checkpoint chain continuity
   */
  validateCheckpointChain() {
    const chain = this.getCheckpointChain();

    for (let i = 1; i < chain.length; i++) {
      const current = this.checkpoints.get(chain[i].height);
      const previous = this.checkpoints.get(chain[i - 1].height);

      // Verify block links
      const block = this.blockchain.chain[current.height];
      if (block && block.hash !== current.blockHash) {
        logger.warn(`Checkpoint chain broken at height ${current.height}`);
        return false;
      }
    }

    return true;
  }
}

module.exports = CheckpointSystem;
