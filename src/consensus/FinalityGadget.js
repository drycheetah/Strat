const CryptoUtils = require('../crypto');
const logger = require('../../utils/logger');

/**
 * FinalityGadget - Implements Byzantine Fault Tolerant finality for blockchain
 * Provides fast finality guarantees using validator signatures
 */
class FinalityGadget {
  constructor(blockchain, validators, options = {}) {
    this.blockchain = blockchain;
    this.validators = new Map(); // address -> validator info
    this.votes = new Map(); // blockHash -> votes
    this.finalizedBlocks = new Set();
    this.finalizedHeight = 0;
    this.quorumThreshold = options.quorumThreshold || 0.67; // 2/3 majority
    this.finalityDelay = options.finalityDelay || 2; // Blocks before finality vote
    this.maxVoteAge = options.maxVoteAge || 100; // Blocks
    this.justifications = new Map(); // blockHash -> justification

    this.initializeValidators(validators);
  }

  /**
   * Initialize validator set
   */
  initializeValidators(validators) {
    for (let validator of validators) {
      this.validators.set(validator.address, {
        address: validator.address,
        stake: validator.stake || 1,
        active: true,
        votingPower: validator.stake || 1,
        lastVote: null,
        missedVotes: 0
      });
    }

    logger.info(`Initialized ${this.validators.size} validators`);
  }

  /**
   * Get total voting power
   */
  getTotalVotingPower() {
    let total = 0;
    for (let [address, validator] of this.validators) {
      if (validator.active) {
        total += validator.votingPower;
      }
    }
    return total;
  }

  /**
   * Check if quorum is reached for a block
   */
  hasQuorum(blockHash) {
    const votes = this.votes.get(blockHash) || [];
    const totalPower = this.getTotalVotingPower();

    let votePower = 0;
    for (let vote of votes) {
      const validator = this.validators.get(vote.validator);
      if (validator && validator.active) {
        votePower += validator.votingPower;
      }
    }

    return votePower >= (totalPower * this.quorumThreshold);
  }

  /**
   * Submit finality vote from validator
   */
  async submitVote(blockHash, blockHeight, validatorAddress, signature) {
    // Verify validator
    const validator = this.validators.get(validatorAddress);
    if (!validator) {
      throw new Error('Validator not found');
    }

    if (!validator.active) {
      throw new Error('Validator not active');
    }

    // Verify block exists
    const block = this.blockchain.chain[blockHeight];
    if (!block || block.hash !== blockHash) {
      throw new Error('Block not found or hash mismatch');
    }

    // Check finality delay
    const currentHeight = this.blockchain.chain.length;
    if (currentHeight - blockHeight < this.finalityDelay) {
      throw new Error('Block too recent for finality vote');
    }

    // Verify signature
    if (!this.verifyVoteSignature(blockHash, blockHeight, validatorAddress, signature)) {
      throw new Error('Invalid vote signature');
    }

    // Create vote
    const vote = {
      blockHash,
      blockHeight,
      validator: validatorAddress,
      signature,
      timestamp: Date.now(),
      votingPower: validator.votingPower
    };

    // Add vote
    if (!this.votes.has(blockHash)) {
      this.votes.set(blockHash, []);
    }

    const blockVotes = this.votes.get(blockHash);

    // Check if validator already voted
    const existingVote = blockVotes.find(v => v.validator === validatorAddress);
    if (existingVote) {
      throw new Error('Validator already voted for this block');
    }

    blockVotes.push(vote);

    // Update validator
    validator.lastVote = {
      blockHash,
      blockHeight,
      timestamp: Date.now()
    };

    logger.info(`Vote submitted by ${validatorAddress} for block ${blockHeight}`);

    // Check if quorum reached
    if (this.hasQuorum(blockHash)) {
      await this.finalizeBlock(blockHash, blockHeight);
    }

    return vote;
  }

  /**
   * Finalize block with quorum
   */
  async finalizeBlock(blockHash, blockHeight) {
    if (this.finalizedBlocks.has(blockHash)) {
      return; // Already finalized
    }

    logger.info(`Finalizing block ${blockHeight}: ${blockHash}`);

    // Verify quorum
    if (!this.hasQuorum(blockHash)) {
      throw new Error('Insufficient votes for finality');
    }

    // Verify chain continuity
    if (!this.verifyContinuity(blockHeight)) {
      throw new Error('Cannot finalize: previous blocks not finalized');
    }

    // Mark as finalized
    this.finalizedBlocks.add(blockHash);
    this.finalizedHeight = Math.max(this.finalizedHeight, blockHeight);

    // Create justification
    const justification = this.createJustification(blockHash, blockHeight);
    this.justifications.set(blockHash, justification);

    logger.info(`Block ${blockHeight} finalized with ${justification.votes.length} votes`);

    // Cleanup old votes
    this.cleanupOldVotes();

    return justification;
  }

  /**
   * Verify chain continuity for finalization
   */
  verifyContinuity(blockHeight) {
    // Genesis block is always finalized
    if (blockHeight === 0) {
      return true;
    }

    // Check if previous block is finalized
    const previousBlock = this.blockchain.chain[blockHeight - 1];
    if (!previousBlock) {
      return false;
    }

    return this.finalizedBlocks.has(previousBlock.hash);
  }

  /**
   * Create finality justification
   */
  createJustification(blockHash, blockHeight) {
    const votes = this.votes.get(blockHash) || [];

    let totalVotingPower = 0;
    const validatorVotes = votes.map(vote => {
      const validator = this.validators.get(vote.validator);
      totalVotingPower += validator.votingPower;

      return {
        validator: vote.validator,
        signature: vote.signature,
        votingPower: validator.votingPower,
        timestamp: vote.timestamp
      };
    });

    return {
      blockHash,
      blockHeight,
      votes: validatorVotes,
      totalVotingPower,
      quorumThreshold: this.quorumThreshold,
      timestamp: Date.now(),
      hash: CryptoUtils.hash(JSON.stringify({
        blockHash,
        blockHeight,
        votes: validatorVotes.map(v => v.signature)
      }))
    };
  }

  /**
   * Verify vote signature
   */
  verifyVoteSignature(blockHash, blockHeight, validatorAddress, signature) {
    // In production, use proper cryptographic signature verification
    // This is simplified
    const message = `${blockHash}:${blockHeight}:${validatorAddress}`;
    const expectedSignature = CryptoUtils.hash(message);

    // For now, just check signature exists
    return signature && signature.length > 0;
  }

  /**
   * Check if block is finalized
   */
  isFinalized(blockHash) {
    return this.finalizedBlocks.has(blockHash);
  }

  /**
   * Get finalized height
   */
  getFinalizedHeight() {
    return this.finalizedHeight;
  }

  /**
   * Get justification for finalized block
   */
  getJustification(blockHash) {
    return this.justifications.get(blockHash);
  }

  /**
   * Verify justification
   */
  verifyJustification(justification) {
    const { blockHash, blockHeight, votes, totalVotingPower } = justification;

    // Verify votes
    for (let vote of votes) {
      const validator = this.validators.get(vote.validator);
      if (!validator) {
        return { valid: false, reason: `Validator ${vote.validator} not found` };
      }

      if (vote.votingPower !== validator.votingPower) {
        return { valid: false, reason: 'Voting power mismatch' };
      }
    }

    // Verify quorum
    const totalPower = this.getTotalVotingPower();
    if (totalVotingPower < totalPower * this.quorumThreshold) {
      return { valid: false, reason: 'Insufficient voting power' };
    }

    // Verify hash
    const calculatedHash = CryptoUtils.hash(JSON.stringify({
      blockHash,
      blockHeight,
      votes: votes.map(v => v.signature)
    }));

    if (calculatedHash !== justification.hash) {
      return { valid: false, reason: 'Hash mismatch' };
    }

    return { valid: true };
  }

  /**
   * Process new block for finality
   */
  async processBlock(block) {
    const currentHeight = this.blockchain.chain.length;

    // Check if any blocks are ready for finality voting
    const votableHeight = currentHeight - this.finalityDelay;

    if (votableHeight > this.finalizedHeight) {
      const votableBlock = this.blockchain.chain[votableHeight];

      if (votableBlock && !this.finalizedBlocks.has(votableBlock.hash)) {
        logger.info(`Block ${votableHeight} ready for finality voting`);

        // In a real implementation, this would trigger validator votes
        // For now, we just mark it as ready
        return {
          readyForVoting: true,
          blockHeight: votableHeight,
          blockHash: votableBlock.hash
        };
      }
    }

    return { readyForVoting: false };
  }

  /**
   * Handle missed votes
   */
  penalizeMissedVotes() {
    const currentHeight = this.blockchain.chain.length;

    // Check validators that missed recent votes
    for (let [address, validator] of this.validators) {
      if (!validator.active) {
        continue;
      }

      const lastVote = validator.lastVote;

      if (!lastVote || currentHeight - lastVote.blockHeight > 10) {
        validator.missedVotes++;

        logger.warn(`Validator ${address} missed votes: ${validator.missedVotes}`);

        // Deactivate if too many missed votes
        if (validator.missedVotes > 100) {
          validator.active = false;
          logger.warn(`Validator ${address} deactivated for missing votes`);
        }
      }
    }
  }

  /**
   * Cleanup old votes
   */
  cleanupOldVotes() {
    const currentHeight = this.blockchain.chain.length;

    for (let [blockHash, votes] of this.votes) {
      if (votes.length > 0) {
        const blockHeight = votes[0].blockHeight;

        if (currentHeight - blockHeight > this.maxVoteAge) {
          this.votes.delete(blockHash);
        }
      }
    }
  }

  /**
   * Add validator
   */
  addValidator(address, stake) {
    if (this.validators.has(address)) {
      throw new Error('Validator already exists');
    }

    this.validators.set(address, {
      address,
      stake,
      active: true,
      votingPower: stake,
      lastVote: null,
      missedVotes: 0
    });

    logger.info(`Validator ${address} added with stake ${stake}`);
  }

  /**
   * Remove validator
   */
  removeValidator(address) {
    const validator = this.validators.get(address);

    if (!validator) {
      throw new Error('Validator not found');
    }

    validator.active = false;

    logger.info(`Validator ${address} removed`);
  }

  /**
   * Update validator stake
   */
  updateValidatorStake(address, newStake) {
    const validator = this.validators.get(address);

    if (!validator) {
      throw new Error('Validator not found');
    }

    validator.stake = newStake;
    validator.votingPower = newStake;

    logger.info(`Validator ${address} stake updated to ${newStake}`);
  }

  /**
   * Get finality statistics
   */
  getStats() {
    const activeValidators = Array.from(this.validators.values())
      .filter(v => v.active).length;

    const totalPower = this.getTotalVotingPower();
    const quorumPower = totalPower * this.quorumThreshold;

    return {
      totalValidators: this.validators.size,
      activeValidators,
      totalVotingPower: totalPower,
      quorumPower,
      quorumThreshold: this.quorumThreshold,
      finalizedHeight: this.finalizedHeight,
      finalizedBlocks: this.finalizedBlocks.size,
      pendingVotes: this.votes.size,
      justifications: this.justifications.size,
      finalityDelay: this.finalityDelay
    };
  }

  /**
   * Get validator info
   */
  getValidator(address) {
    return this.validators.get(address);
  }

  /**
   * Get all active validators
   */
  getActiveValidators() {
    return Array.from(this.validators.values()).filter(v => v.active);
  }

  /**
   * Export finality proof
   */
  exportFinalityProof(blockHash) {
    const justification = this.justifications.get(blockHash);

    if (!justification) {
      throw new Error('Block not finalized');
    }

    return {
      blockHash,
      blockHeight: justification.blockHeight,
      justification,
      finalizedHeight: this.finalizedHeight,
      validators: this.getActiveValidators().length
    };
  }
}

module.exports = FinalityGadget;
