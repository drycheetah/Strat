const CryptoUtils = require('../crypto');
const logger = require('../../utils/logger');

/**
 * ValidatorRotation - Implements rotating validator selection for consensus
 * Ensures fair validator participation and prevents centralization
 */
class ValidatorRotation {
  constructor(blockchain, options = {}) {
    this.blockchain = blockchain;
    this.validators = new Map(); // address -> validator info
    this.activeSet = []; // Current active validator set
    this.candidatePool = new Map(); // address -> candidate info
    this.rotationHistory = [];
    this.maxActiveValidators = options.maxActiveValidators || 21;
    this.rotationInterval = options.rotationInterval || 100; // blocks
    this.minStake = options.minStake || 1000;
    this.maxStake = options.maxStake || 100000;
    this.lastRotation = 0;
    this.selectionAlgorithm = options.selectionAlgorithm || 'stake-weighted'; // or 'random', 'round-robin'
  }

  /**
   * Register validator candidate
   */
  async registerCandidate(address, stake, metadata = {}) {
    if (stake < this.minStake) {
      throw new Error(`Minimum stake required: ${this.minStake}`);
    }

    if (this.validators.has(address)) {
      throw new Error('Validator already registered');
    }

    const candidate = {
      address,
      stake: Math.min(stake, this.maxStake), // Cap stake
      metadata,
      registeredAt: Date.now(),
      registeredHeight: this.blockchain.chain.length,
      active: false,
      totalBlocksProduced: 0,
      performance: {
        uptime: 100,
        missedBlocks: 0,
        producedBlocks: 0,
        lastSeen: Date.now()
      },
      score: this.calculateValidatorScore(stake, metadata)
    };

    this.candidatePool.set(address, candidate);
    this.validators.set(address, candidate);

    logger.info(`Validator candidate registered: ${address} with stake ${stake}`);

    return candidate;
  }

  /**
   * Calculate validator score for selection
   */
  calculateValidatorScore(stake, metadata = {}) {
    let score = stake;

    // Bonus for commission rate (lower is better)
    if (metadata.commission && metadata.commission < 0.1) {
      score *= 1.2;
    }

    // Bonus for geographic diversity
    if (metadata.region) {
      score *= 1.1;
    }

    // Bonus for established validators
    if (metadata.yearsActive && metadata.yearsActive > 1) {
      score *= 1.15;
    }

    return score;
  }

  /**
   * Perform validator rotation
   */
  async rotateValidators() {
    const currentHeight = this.blockchain.chain.length;

    if (currentHeight - this.lastRotation < this.rotationInterval) {
      return { rotated: false, reason: 'Rotation interval not reached' };
    }

    logger.info(`Performing validator rotation at height ${currentHeight}`);

    const previousSet = [...this.activeSet];

    // Select new active validator set
    const newActiveSet = await this.selectValidators();

    // Track changes
    const added = newActiveSet.filter(v => !previousSet.includes(v));
    const removed = previousSet.filter(v => !newActiveSet.includes(v));

    // Update active set
    this.activeSet = newActiveSet;
    this.lastRotation = currentHeight;

    // Update validator states
    for (let address of this.activeSet) {
      const validator = this.validators.get(address);
      if (validator) {
        validator.active = true;
      }
    }

    for (let address of removed) {
      const validator = this.validators.get(address);
      if (validator) {
        validator.active = false;
      }
    }

    // Record rotation
    const rotation = {
      height: currentHeight,
      timestamp: Date.now(),
      previousSet,
      newSet: this.activeSet,
      added,
      removed,
      algorithm: this.selectionAlgorithm,
      hash: CryptoUtils.hash(JSON.stringify({
        height: currentHeight,
        newSet: this.activeSet
      }))
    };

    this.rotationHistory.push(rotation);

    // Keep only recent history
    if (this.rotationHistory.length > 100) {
      this.rotationHistory.shift();
    }

    logger.info(`Validator rotation complete: ${added.length} added, ${removed.length} removed`);

    return {
      rotated: true,
      rotation,
      activeValidators: this.activeSet.length
    };
  }

  /**
   * Select validators based on configured algorithm
   */
  async selectValidators() {
    const candidates = Array.from(this.validators.values())
      .filter(v => !v.jailed && !v.removed && v.stake >= this.minStake);

    if (candidates.length === 0) {
      throw new Error('No eligible validators');
    }

    let selected = [];

    switch (this.selectionAlgorithm) {
      case 'stake-weighted':
        selected = this.selectByStakeWeight(candidates);
        break;

      case 'random':
        selected = this.selectRandom(candidates);
        break;

      case 'round-robin':
        selected = this.selectRoundRobin(candidates);
        break;

      case 'performance':
        selected = this.selectByPerformance(candidates);
        break;

      default:
        selected = this.selectByStakeWeight(candidates);
    }

    return selected.slice(0, this.maxActiveValidators);
  }

  /**
   * Select validators by stake weight
   */
  selectByStakeWeight(candidates) {
    // Sort by stake and score
    const sorted = candidates.sort((a, b) => {
      const scoreA = a.score || a.stake;
      const scoreB = b.score || b.stake;
      return scoreB - scoreA;
    });

    return sorted.slice(0, this.maxActiveValidators).map(v => v.address);
  }

  /**
   * Select validators randomly (weighted by stake)
   */
  selectRandom(candidates) {
    const totalStake = candidates.reduce((sum, v) => sum + v.stake, 0);
    const selected = new Set();

    while (selected.size < Math.min(this.maxActiveValidators, candidates.length)) {
      const random = Math.random() * totalStake;
      let cumulative = 0;

      for (let candidate of candidates) {
        cumulative += candidate.stake;
        if (random <= cumulative && !selected.has(candidate.address)) {
          selected.add(candidate.address);
          break;
        }
      }
    }

    return Array.from(selected);
  }

  /**
   * Select validators in round-robin fashion
   */
  selectRoundRobin(candidates) {
    // Sort by last active time (least recently active first)
    const sorted = candidates.sort((a, b) => {
      const lastActiveA = a.lastActiveAt || 0;
      const lastActiveB = b.lastActiveAt || 0;
      return lastActiveA - lastActiveB;
    });

    const selected = sorted.slice(0, this.maxActiveValidators);

    // Update last active time
    for (let validator of selected) {
      validator.lastActiveAt = Date.now();
    }

    return selected.map(v => v.address);
  }

  /**
   * Select validators by performance
   */
  selectByPerformance(candidates) {
    // Calculate performance score
    const scored = candidates.map(v => {
      const uptime = v.performance.uptime || 100;
      const blocksProduced = v.performance.producedBlocks || 0;
      const missedBlocks = v.performance.missedBlocks || 0;

      const performanceScore = (uptime * 0.4) +
                               (blocksProduced * 0.3) -
                               (missedBlocks * 0.3);

      return {
        address: v.address,
        score: performanceScore * (v.stake / 1000)
      };
    });

    // Sort by performance score
    const sorted = scored.sort((a, b) => b.score - a.score);

    return sorted.slice(0, this.maxActiveValidators).map(v => v.address);
  }

  /**
   * Record block production by validator
   */
  recordBlockProduction(validatorAddress, success = true) {
    const validator = this.validators.get(validatorAddress);

    if (!validator) {
      return;
    }

    if (success) {
      validator.performance.producedBlocks++;
      validator.totalBlocksProduced++;
    } else {
      validator.performance.missedBlocks++;
    }

    validator.performance.lastSeen = Date.now();

    // Recalculate uptime
    const total = validator.performance.producedBlocks + validator.performance.missedBlocks;
    if (total > 0) {
      validator.performance.uptime = (validator.performance.producedBlocks / total) * 100;
    }
  }

  /**
   * Get next validator in rotation (for block production)
   */
  getNextValidator(blockHeight) {
    if (this.activeSet.length === 0) {
      return null;
    }

    // Simple round-robin within active set
    const index = blockHeight % this.activeSet.length;
    return this.activeSet[index];
  }

  /**
   * Check if validator is in active set
   */
  isActive(validatorAddress) {
    return this.activeSet.includes(validatorAddress);
  }

  /**
   * Get active validator set
   */
  getActiveSet() {
    return this.activeSet.map(address => {
      const validator = this.validators.get(address);
      return {
        address,
        stake: validator.stake,
        performance: validator.performance,
        score: validator.score
      };
    });
  }

  /**
   * Update validator stake
   */
  updateValidatorStake(validatorAddress, newStake) {
    const validator = this.validators.get(validatorAddress);

    if (!validator) {
      throw new Error('Validator not found');
    }

    // Cap stake
    newStake = Math.min(newStake, this.maxStake);

    if (newStake < this.minStake && validator.active) {
      // Remove from active set if stake too low
      const index = this.activeSet.indexOf(validatorAddress);
      if (index > -1) {
        this.activeSet.splice(index, 1);
        validator.active = false;
      }
    }

    validator.stake = newStake;
    validator.score = this.calculateValidatorScore(newStake, validator.metadata);

    logger.info(`Validator ${validatorAddress} stake updated to ${newStake}`);
  }

  /**
   * Remove validator
   */
  removeValidator(validatorAddress) {
    const validator = this.validators.get(validatorAddress);

    if (!validator) {
      throw new Error('Validator not found');
    }

    // Remove from active set
    const index = this.activeSet.indexOf(validatorAddress);
    if (index > -1) {
      this.activeSet.splice(index, 1);
    }

    // Mark as removed
    validator.removed = true;
    validator.removedAt = Date.now();

    this.candidatePool.delete(validatorAddress);

    logger.info(`Validator ${validatorAddress} removed`);
  }

  /**
   * Get validator info
   */
  getValidator(validatorAddress) {
    return this.validators.get(validatorAddress);
  }

  /**
   * Get all validators
   */
  getAllValidators() {
    return Array.from(this.validators.values());
  }

  /**
   * Get candidate pool
   */
  getCandidates() {
    return Array.from(this.candidatePool.values());
  }

  /**
   * Get rotation statistics
   */
  getStats() {
    const active = this.activeSet.length;
    const total = this.validators.size;
    const candidates = this.candidatePool.size;

    const totalStake = Array.from(this.validators.values())
      .reduce((sum, v) => sum + v.stake, 0);

    const activeStake = this.activeSet
      .map(address => this.validators.get(address))
      .reduce((sum, v) => sum + (v?.stake || 0), 0);

    return {
      totalValidators: total,
      activeValidators: active,
      candidateValidators: candidates,
      maxActiveValidators: this.maxActiveValidators,
      totalStake,
      activeStake,
      lastRotation: this.lastRotation,
      nextRotation: this.lastRotation + this.rotationInterval,
      rotationHistory: this.rotationHistory.length,
      selectionAlgorithm: this.selectionAlgorithm
    };
  }

  /**
   * Get rotation history
   */
  getRotationHistory(limit = 10) {
    return this.rotationHistory.slice(-limit).reverse();
  }

  /**
   * Force rotation (for testing or emergency)
   */
  async forceRotation() {
    const currentHeight = this.blockchain.chain.length;
    this.lastRotation = currentHeight - this.rotationInterval;

    return await this.rotateValidators();
  }

  /**
   * Set selection algorithm
   */
  setSelectionAlgorithm(algorithm) {
    const validAlgorithms = ['stake-weighted', 'random', 'round-robin', 'performance'];

    if (!validAlgorithms.includes(algorithm)) {
      throw new Error(`Invalid algorithm. Must be one of: ${validAlgorithms.join(', ')}`);
    }

    this.selectionAlgorithm = algorithm;
    logger.info(`Selection algorithm changed to: ${algorithm}`);
  }

  /**
   * Get validator rankings
   */
  getValidatorRankings() {
    const validators = Array.from(this.validators.values())
      .filter(v => !v.removed && !v.jailed);

    return validators
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .map((v, index) => ({
        rank: index + 1,
        address: v.address,
        stake: v.stake,
        score: v.score,
        active: v.active,
        performance: v.performance
      }));
  }
}

module.exports = ValidatorRotation;
