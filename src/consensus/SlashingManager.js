const CryptoUtils = require('../crypto');
const logger = require('../../utils/logger');

/**
 * SlashingManager - Implements slashing conditions for validator misbehavior
 * Penalizes validators for double-signing, downtime, and protocol violations
 */
class SlashingManager {
  constructor(blockchain, options = {}) {
    this.blockchain = blockchain;
    this.validators = new Map(); // address -> validator state
    this.slashingEvents = [];
    this.evidencePool = new Map(); // evidenceHash -> evidence
    this.slashingRates = {
      doubleSigning: options.doubleSigningSlash || 0.05, // 5% slash
      downtime: options.downtimeSlash || 0.001, // 0.1% slash
      invalidBlock: options.invalidBlockSlash || 0.02, // 2% slash
      censorship: options.censorshipSlash || 0.01 // 1% slash
    };
    this.downtimeThreshold = options.downtimeThreshold || 1000; // blocks
    this.jailDuration = options.jailDuration || 24 * 60 * 60 * 1000; // 24 hours
    this.evidenceMaxAge = options.evidenceMaxAge || 100000; // blocks
    this.minValidatorStake = options.minValidatorStake || 1000;
  }

  /**
   * Register validator for slashing tracking
   */
  registerValidator(address, stake, publicKey) {
    this.validators.set(address, {
      address,
      stake,
      publicKey,
      jailed: false,
      jailedUntil: null,
      missedBlocks: 0,
      lastSeen: Date.now(),
      slashingHistory: [],
      totalSlashed: 0,
      violations: {
        doubleSigning: 0,
        downtime: 0,
        invalidBlock: 0,
        censorship: 0
      }
    });

    logger.info(`Validator ${address} registered for slashing tracking`);
  }

  /**
   * Submit evidence of double-signing
   */
  async submitDoubleSigningEvidence(evidence) {
    logger.warn(`Double-signing evidence submitted for validator ${evidence.validator}`);

    // Validate evidence
    const validation = this.validateDoubleSigningEvidence(evidence);

    if (!validation.valid) {
      throw new Error(`Invalid evidence: ${validation.reason}`);
    }

    // Store evidence
    const evidenceHash = CryptoUtils.hash(JSON.stringify(evidence));
    this.evidencePool.set(evidenceHash, {
      ...evidence,
      type: 'double-signing',
      hash: evidenceHash,
      submitted: Date.now(),
      status: 'pending'
    });

    // Apply slashing
    await this.slashValidator(
      evidence.validator,
      'doubleSigning',
      this.slashingRates.doubleSigning,
      evidence
    );

    return {
      success: true,
      evidenceHash,
      slashingRate: this.slashingRates.doubleSigning
    };
  }

  /**
   * Validate double-signing evidence
   */
  validateDoubleSigningEvidence(evidence) {
    const { validator, vote1, vote2 } = evidence;

    // Must be same block height
    if (vote1.blockHeight !== vote2.blockHeight) {
      return { valid: false, reason: 'Votes for different heights' };
    }

    // Must be different blocks
    if (vote1.blockHash === vote2.blockHash) {
      return { valid: false, reason: 'Votes for same block' };
    }

    // Must be from same validator
    if (vote1.validator !== validator || vote2.validator !== validator) {
      return { valid: false, reason: 'Votes from different validators' };
    }

    // Verify signatures (simplified)
    if (!vote1.signature || !vote2.signature) {
      return { valid: false, reason: 'Missing signatures' };
    }

    return { valid: true };
  }

  /**
   * Submit evidence of validator downtime
   */
  async submitDowntimeEvidence(validatorAddress, missedBlocks) {
    logger.warn(`Downtime evidence for validator ${validatorAddress}: ${missedBlocks} missed blocks`);

    const validator = this.validators.get(validatorAddress);

    if (!validator) {
      throw new Error('Validator not found');
    }

    if (missedBlocks < this.downtimeThreshold) {
      return { slashed: false, reason: 'Below downtime threshold' };
    }

    // Update missed blocks count
    validator.missedBlocks = missedBlocks;

    // Apply slashing
    await this.slashValidator(
      validatorAddress,
      'downtime',
      this.slashingRates.downtime,
      { missedBlocks, threshold: this.downtimeThreshold }
    );

    return {
      success: true,
      missedBlocks,
      slashingRate: this.slashingRates.downtime
    };
  }

  /**
   * Submit evidence of invalid block production
   */
  async submitInvalidBlockEvidence(evidence) {
    logger.warn(`Invalid block evidence for validator ${evidence.validator}`);

    // Validate evidence
    const validation = this.validateInvalidBlockEvidence(evidence);

    if (!validation.valid) {
      throw new Error(`Invalid evidence: ${validation.reason}`);
    }

    // Store evidence
    const evidenceHash = CryptoUtils.hash(JSON.stringify(evidence));
    this.evidencePool.set(evidenceHash, {
      ...evidence,
      type: 'invalid-block',
      hash: evidenceHash,
      submitted: Date.now(),
      status: 'pending'
    });

    // Apply slashing
    await this.slashValidator(
      evidence.validator,
      'invalidBlock',
      this.slashingRates.invalidBlock,
      evidence
    );

    return {
      success: true,
      evidenceHash,
      slashingRate: this.slashingRates.invalidBlock
    };
  }

  /**
   * Validate invalid block evidence
   */
  validateInvalidBlockEvidence(evidence) {
    const { validator, blockHeight, blockHash, violation } = evidence;

    if (!validator || !blockHash || !violation) {
      return { valid: false, reason: 'Missing required fields' };
    }

    // Check if block exists
    const block = this.blockchain.chain[blockHeight];

    if (!block) {
      return { valid: false, reason: 'Block not found' };
    }

    if (block.hash !== blockHash) {
      return { valid: false, reason: 'Block hash mismatch' };
    }

    return { valid: true };
  }

  /**
   * Slash validator
   */
  async slashValidator(validatorAddress, violationType, slashingRate, evidence) {
    const validator = this.validators.get(validatorAddress);

    if (!validator) {
      throw new Error('Validator not found');
    }

    if (validator.jailed) {
      logger.info(`Validator ${validatorAddress} already jailed`);
      return;
    }

    // Calculate slashed amount
    const slashedAmount = validator.stake * slashingRate;
    const newStake = validator.stake - slashedAmount;

    logger.warn(`Slashing validator ${validatorAddress}: ${slashedAmount} (${slashingRate * 100}%)`);

    // Update validator state
    validator.stake = newStake;
    validator.totalSlashed += slashedAmount;
    validator.violations[violationType]++;

    // Create slashing event
    const slashingEvent = {
      validator: validatorAddress,
      violationType,
      slashedAmount,
      slashingRate,
      previousStake: validator.stake + slashedAmount,
      newStake,
      timestamp: Date.now(),
      blockHeight: this.blockchain.chain.length,
      evidence: evidence,
      hash: CryptoUtils.hash(JSON.stringify({
        validator: validatorAddress,
        violationType,
        slashedAmount,
        timestamp: Date.now()
      }))
    };

    this.slashingEvents.push(slashingEvent);
    validator.slashingHistory.push(slashingEvent);

    // Jail validator if severe violation or repeated offenses
    if (this.shouldJailValidator(validator, violationType)) {
      await this.jailValidator(validatorAddress);
    }

    // Remove validator if stake too low
    if (newStake < this.minValidatorStake) {
      await this.removeValidator(validatorAddress);
    }

    // Record on-chain (in production, this would be a transaction)
    logger.info(`Slashing event recorded: ${slashingEvent.hash}`);

    return slashingEvent;
  }

  /**
   * Check if validator should be jailed
   */
  shouldJailValidator(validator, violationType) {
    // Always jail for double-signing
    if (violationType === 'doubleSigning') {
      return true;
    }

    // Jail if multiple violations
    const totalViolations = Object.values(validator.violations)
      .reduce((sum, count) => sum + count, 0);

    if (totalViolations >= 5) {
      return true;
    }

    // Jail if severe downtime
    if (violationType === 'downtime' && validator.missedBlocks > this.downtimeThreshold * 2) {
      return true;
    }

    return false;
  }

  /**
   * Jail validator
   */
  async jailValidator(validatorAddress) {
    const validator = this.validators.get(validatorAddress);

    if (!validator) {
      throw new Error('Validator not found');
    }

    logger.warn(`Jailing validator ${validatorAddress} for ${this.jailDuration / 1000} seconds`);

    validator.jailed = true;
    validator.jailedUntil = Date.now() + this.jailDuration;

    return {
      success: true,
      jailedUntil: validator.jailedUntil
    };
  }

  /**
   * Unjail validator
   */
  async unjailValidator(validatorAddress) {
    const validator = this.validators.get(validatorAddress);

    if (!validator) {
      throw new Error('Validator not found');
    }

    if (!validator.jailed) {
      throw new Error('Validator not jailed');
    }

    // Check if jail period expired
    if (Date.now() < validator.jailedUntil) {
      throw new Error(`Jail period not expired. Can unjail at ${new Date(validator.jailedUntil)}`);
    }

    logger.info(`Unjailing validator ${validatorAddress}`);

    validator.jailed = false;
    validator.jailedUntil = null;
    validator.missedBlocks = 0;

    return {
      success: true,
      validator: validatorAddress
    };
  }

  /**
   * Remove validator
   */
  async removeValidator(validatorAddress) {
    const validator = this.validators.get(validatorAddress);

    if (!validator) {
      throw new Error('Validator not found');
    }

    logger.warn(`Removing validator ${validatorAddress} due to insufficient stake`);

    // Keep record but mark as removed
    validator.removed = true;
    validator.removedAt = Date.now();

    return {
      success: true,
      validator: validatorAddress,
      finalStake: validator.stake
    };
  }

  /**
   * Record validator activity
   */
  recordValidatorActivity(validatorAddress) {
    const validator = this.validators.get(validatorAddress);

    if (validator) {
      validator.lastSeen = Date.now();
      validator.missedBlocks = 0;
    }
  }

  /**
   * Check for inactive validators
   */
  async checkInactiveValidators() {
    const currentTime = Date.now();
    const inactivityThreshold = 10 * 60 * 1000; // 10 minutes

    for (let [address, validator] of this.validators) {
      if (validator.jailed || validator.removed) {
        continue;
      }

      const inactiveDuration = currentTime - validator.lastSeen;

      if (inactiveDuration > inactivityThreshold) {
        const missedBlocks = Math.floor(inactiveDuration / 10000); // Assuming 10s block time

        if (missedBlocks > this.downtimeThreshold) {
          await this.submitDowntimeEvidence(address, missedBlocks);
        }
      }
    }
  }

  /**
   * Cleanup old evidence
   */
  cleanupOldEvidence() {
    const currentHeight = this.blockchain.chain.length;
    const toRemove = [];

    for (let [hash, evidence] of this.evidencePool) {
      const age = currentHeight - (evidence.blockHeight || 0);

      if (age > this.evidenceMaxAge) {
        toRemove.push(hash);
      }
    }

    for (let hash of toRemove) {
      this.evidencePool.delete(hash);
    }

    logger.info(`Cleaned up ${toRemove.length} old evidence entries`);
  }

  /**
   * Get validator slashing info
   */
  getValidatorInfo(validatorAddress) {
    const validator = this.validators.get(validatorAddress);

    if (!validator) {
      return null;
    }

    return {
      address: validator.address,
      stake: validator.stake,
      totalSlashed: validator.totalSlashed,
      jailed: validator.jailed,
      jailedUntil: validator.jailedUntil,
      missedBlocks: validator.missedBlocks,
      violations: validator.violations,
      slashingHistory: validator.slashingHistory.length,
      removed: validator.removed || false
    };
  }

  /**
   * Get slashing statistics
   */
  getStats() {
    let totalSlashed = 0;
    let jailedCount = 0;
    let removedCount = 0;

    for (let [address, validator] of this.validators) {
      totalSlashed += validator.totalSlashed;
      if (validator.jailed) jailedCount++;
      if (validator.removed) removedCount++;
    }

    const violationCounts = {
      doubleSigning: 0,
      downtime: 0,
      invalidBlock: 0,
      censorship: 0
    };

    for (let event of this.slashingEvents) {
      violationCounts[event.violationType]++;
    }

    return {
      totalValidators: this.validators.size,
      jailedValidators: jailedCount,
      removedValidators: removedCount,
      totalSlashingEvents: this.slashingEvents.length,
      totalSlashed,
      evidencePool: this.evidencePool.size,
      violationCounts,
      slashingRates: this.slashingRates
    };
  }

  /**
   * Get recent slashing events
   */
  getRecentSlashingEvents(limit = 100) {
    return this.slashingEvents
      .slice(-limit)
      .reverse();
  }

  /**
   * Export slashing proof
   */
  exportSlashingProof(eventHash) {
    const event = this.slashingEvents.find(e => e.hash === eventHash);

    if (!event) {
      throw new Error('Slashing event not found');
    }

    return {
      event,
      validator: this.getValidatorInfo(event.validator),
      evidence: this.evidencePool.get(event.evidence?.hash)
    };
  }

  /**
   * Get evidence from pool
   */
  getEvidence(evidenceHash) {
    return this.evidencePool.get(evidenceHash);
  }
}

module.exports = SlashingManager;
