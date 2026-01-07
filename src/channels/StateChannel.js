const CryptoUtils = require('../crypto');
const logger = require('../../utils/logger');

/**
 * StateChannel - Implements bidirectional payment channels for off-chain transactions
 * Enables instant, low-cost transactions with periodic settlement on-chain
 */
class StateChannel {
  constructor(participants, initialDeposits, blockchain) {
    this.channelId = CryptoUtils.hash(JSON.stringify({
      participants,
      timestamp: Date.now()
    }));
    this.participants = participants; // Array of addresses
    this.balances = new Map(); // address -> balance
    this.initialDeposits = initialDeposits; // address -> initial deposit
    this.blockchain = blockchain;
    this.state = 'pending'; // pending, open, closing, closed, disputed
    this.nonce = 0;
    this.stateUpdates = [];
    this.signatures = new Map(); // nonce -> signatures
    this.disputePeriod = 24 * 60 * 60 * 1000; // 24 hours
    this.createdAt = Date.now();
    this.closingInitiatedAt = null;
    this.finalState = null;

    // Initialize balances
    for (let participant of participants) {
      this.balances.set(participant, initialDeposits[participant] || 0);
    }
  }

  /**
   * Open channel on-chain
   */
  async open() {
    if (this.state !== 'pending') {
      throw new Error('Channel not in pending state');
    }

    logger.info(`Opening state channel ${this.channelId}`);

    try {
      // Verify all participants have deposited
      for (let participant of this.participants) {
        const deposit = this.initialDeposits[participant] || 0;
        const balance = this.blockchain.getBalance(participant);

        if (balance < deposit) {
          throw new Error(`Insufficient balance for participant ${participant}`);
        }
      }

      // Create opening transaction
      const openingTx = this.createOpeningTransaction();

      // Add to blockchain (this would lock funds)
      await this.blockchain.addTransaction(openingTx);

      this.state = 'open';
      this.addStateUpdate({
        type: 'open',
        nonce: this.nonce++,
        balances: Object.fromEntries(this.balances),
        timestamp: Date.now()
      });

      logger.info(`State channel ${this.channelId} opened successfully`);

      return {
        success: true,
        channelId: this.channelId,
        state: this.state
      };

    } catch (error) {
      logger.error(`Failed to open channel: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create off-chain payment
   */
  async createPayment(from, to, amount, privateKey) {
    if (this.state !== 'open') {
      throw new Error('Channel not open');
    }

    if (!this.participants.includes(from) || !this.participants.includes(to)) {
      throw new Error('Invalid participants');
    }

    const fromBalance = this.balances.get(from);
    if (fromBalance < amount) {
      throw new Error('Insufficient balance in channel');
    }

    logger.info(`Creating off-chain payment: ${amount} from ${from} to ${to}`);

    // Update balances
    this.balances.set(from, fromBalance - amount);
    this.balances.set(to, this.balances.get(to) + amount);

    // Create state update
    const stateUpdate = {
      type: 'payment',
      nonce: this.nonce++,
      from,
      to,
      amount,
      balances: Object.fromEntries(this.balances),
      timestamp: Date.now()
    };

    // Sign state update
    const signature = this.signStateUpdate(stateUpdate, privateKey);
    stateUpdate.signature = signature;

    this.addStateUpdate(stateUpdate);

    // Store signature
    const signatures = this.signatures.get(this.nonce - 1) || [];
    signatures.push({ participant: from, signature });
    this.signatures.set(this.nonce - 1, signatures);

    logger.info(`Off-chain payment created: nonce ${this.nonce - 1}`);

    return {
      success: true,
      nonce: this.nonce - 1,
      channelId: this.channelId,
      balances: Object.fromEntries(this.balances)
    };
  }

  /**
   * Sign state update by participant
   */
  async signUpdate(nonce, participant, privateKey) {
    const stateUpdate = this.stateUpdates.find(u => u.nonce === nonce);

    if (!stateUpdate) {
      throw new Error(`State update ${nonce} not found`);
    }

    if (!this.participants.includes(participant)) {
      throw new Error('Not a channel participant');
    }

    const signature = this.signStateUpdate(stateUpdate, privateKey);

    const signatures = this.signatures.get(nonce) || [];
    signatures.push({ participant, signature });
    this.signatures.set(nonce, signatures);

    logger.info(`State update ${nonce} signed by ${participant}`);

    return { success: true, nonce, signature };
  }

  /**
   * Verify all participants signed a state update
   */
  isFullySigned(nonce) {
    const signatures = this.signatures.get(nonce) || [];
    return signatures.length === this.participants.length;
  }

  /**
   * Initiate cooperative close
   */
  async initiateClose(initiator) {
    if (this.state !== 'open') {
      throw new Error('Channel not open');
    }

    if (!this.participants.includes(initiator)) {
      throw new Error('Not a channel participant');
    }

    logger.info(`Initiating channel close by ${initiator}`);

    this.state = 'closing';
    this.closingInitiatedAt = Date.now();

    // Create closing state
    this.finalState = {
      type: 'close',
      nonce: this.nonce++,
      balances: Object.fromEntries(this.balances),
      timestamp: Date.now(),
      initiator
    };

    this.addStateUpdate(this.finalState);

    return {
      success: true,
      channelId: this.channelId,
      state: this.state,
      disputePeriodEnds: this.closingInitiatedAt + this.disputePeriod
    };
  }

  /**
   * Challenge channel close with newer state
   */
  async challenge(challenger, newerNonce, signatures, privateKey) {
    if (this.state !== 'closing') {
      throw new Error('Channel not in closing state');
    }

    if (!this.participants.includes(challenger)) {
      throw new Error('Not a channel participant');
    }

    const challengeState = this.stateUpdates.find(u => u.nonce === newerNonce);

    if (!challengeState) {
      throw new Error('Challenge state not found');
    }

    if (newerNonce <= this.finalState.nonce) {
      throw new Error('Challenge state not newer');
    }

    // Verify signatures
    const validSignatures = this.verifySignatures(challengeState, signatures);
    if (validSignatures < this.participants.length) {
      throw new Error('Insufficient valid signatures');
    }

    logger.warn(`Channel ${this.channelId} challenged by ${challenger} with state ${newerNonce}`);

    // Update final state to challenged state
    this.finalState = challengeState;
    this.state = 'disputed';

    // Reset dispute period
    this.closingInitiatedAt = Date.now();

    return {
      success: true,
      channelId: this.channelId,
      state: this.state,
      newDisputePeriodEnds: this.closingInitiatedAt + this.disputePeriod
    };
  }

  /**
   * Finalize channel close
   */
  async finalize() {
    if (this.state !== 'closing' && this.state !== 'disputed') {
      throw new Error('Channel not in closing or disputed state');
    }

    // Check if dispute period has ended
    if (Date.now() < this.closingInitiatedAt + this.disputePeriod) {
      throw new Error('Dispute period not ended');
    }

    logger.info(`Finalizing channel ${this.channelId}`);

    try {
      // Create settlement transaction
      const settlementTx = this.createSettlementTransaction();

      // Add to blockchain
      await this.blockchain.addTransaction(settlementTx);

      this.state = 'closed';

      logger.info(`Channel ${this.channelId} closed successfully`);

      return {
        success: true,
        channelId: this.channelId,
        state: this.state,
        finalBalances: Object.fromEntries(this.balances)
      };

    } catch (error) {
      logger.error(`Failed to finalize channel: ${error.message}`);
      throw error;
    }
  }

  /**
   * Force close channel (unilateral)
   */
  async forceClose(participant, privateKey) {
    if (this.state !== 'open') {
      throw new Error('Channel not open');
    }

    if (!this.participants.includes(participant)) {
      throw new Error('Not a channel participant');
    }

    logger.warn(`Force closing channel ${this.channelId} by ${participant}`);

    // Get latest fully signed state
    const latestSignedState = this.getLatestFullySignedState();

    if (!latestSignedState) {
      // Use initial state
      this.finalState = this.stateUpdates[0];
    } else {
      this.finalState = latestSignedState;
      this.balances = new Map(Object.entries(this.finalState.balances));
    }

    this.state = 'closing';
    this.closingInitiatedAt = Date.now();

    return {
      success: true,
      channelId: this.channelId,
      state: this.state,
      disputePeriodEnds: this.closingInitiatedAt + this.disputePeriod
    };
  }

  /**
   * Get latest fully signed state
   */
  getLatestFullySignedState() {
    for (let i = this.stateUpdates.length - 1; i >= 0; i--) {
      const update = this.stateUpdates[i];
      if (this.isFullySigned(update.nonce)) {
        return update;
      }
    }
    return null;
  }

  /**
   * Create opening transaction
   */
  createOpeningTransaction() {
    // This would be a real transaction that locks funds
    return {
      type: 'channel_open',
      channelId: this.channelId,
      participants: this.participants,
      deposits: this.initialDeposits,
      timestamp: Date.now()
    };
  }

  /**
   * Create settlement transaction
   */
  createSettlementTransaction() {
    const finalBalances = this.finalState ?
      this.finalState.balances :
      Object.fromEntries(this.balances);

    return {
      type: 'channel_close',
      channelId: this.channelId,
      participants: this.participants,
      finalBalances,
      totalStateUpdates: this.stateUpdates.length,
      timestamp: Date.now()
    };
  }

  /**
   * Sign state update
   */
  signStateUpdate(stateUpdate, privateKey) {
    const data = JSON.stringify({
      channelId: this.channelId,
      nonce: stateUpdate.nonce,
      balances: stateUpdate.balances
    });

    return CryptoUtils.hash(data + privateKey);
  }

  /**
   * Verify signatures for state update
   */
  verifySignatures(stateUpdate, signatures) {
    let validCount = 0;

    for (let sig of signatures) {
      const data = JSON.stringify({
        channelId: this.channelId,
        nonce: stateUpdate.nonce,
        balances: stateUpdate.balances
      });

      // In production, use proper signature verification
      // This is simplified
      if (sig.signature) {
        validCount++;
      }
    }

    return validCount;
  }

  /**
   * Add state update to history
   */
  addStateUpdate(update) {
    this.stateUpdates.push(update);

    // Keep only recent updates (last 1000)
    if (this.stateUpdates.length > 1000) {
      this.stateUpdates.shift();
    }
  }

  /**
   * Get channel info
   */
  getInfo() {
    return {
      channelId: this.channelId,
      participants: this.participants,
      balances: Object.fromEntries(this.balances),
      state: this.state,
      nonce: this.nonce,
      stateUpdates: this.stateUpdates.length,
      createdAt: this.createdAt,
      closingInitiatedAt: this.closingInitiatedAt,
      disputePeriodEnds: this.closingInitiatedAt ?
        this.closingInitiatedAt + this.disputePeriod : null
    };
  }

  /**
   * Get channel statistics
   */
  getStats() {
    const totalTransferred = this.stateUpdates
      .filter(u => u.type === 'payment')
      .reduce((sum, u) => sum + (u.amount || 0), 0);

    return {
      channelId: this.channelId,
      state: this.state,
      participants: this.participants.length,
      totalStateUpdates: this.stateUpdates.length,
      totalPayments: this.stateUpdates.filter(u => u.type === 'payment').length,
      totalTransferred,
      currentNonce: this.nonce,
      channelAge: Date.now() - this.createdAt
    };
  }
}

/**
 * StateChannelManager - Manages multiple state channels
 */
class StateChannelManager {
  constructor(blockchain) {
    this.blockchain = blockchain;
    this.channels = new Map(); // channelId -> StateChannel
    this.participantChannels = new Map(); // address -> Set of channelIds
  }

  /**
   * Create new state channel
   */
  async createChannel(participants, initialDeposits) {
    const channel = new StateChannel(participants, initialDeposits, this.blockchain);

    this.channels.set(channel.channelId, channel);

    // Track participant channels
    for (let participant of participants) {
      if (!this.participantChannels.has(participant)) {
        this.participantChannels.set(participant, new Set());
      }
      this.participantChannels.get(participant).add(channel.channelId);
    }

    logger.info(`Created state channel ${channel.channelId}`);

    return channel;
  }

  /**
   * Get channel by ID
   */
  getChannel(channelId) {
    return this.channels.get(channelId);
  }

  /**
   * Get all channels for participant
   */
  getChannelsForParticipant(address) {
    const channelIds = this.participantChannels.get(address) || new Set();
    return Array.from(channelIds).map(id => this.channels.get(id));
  }

  /**
   * Get manager statistics
   */
  getStats() {
    const states = { pending: 0, open: 0, closing: 0, closed: 0, disputed: 0 };

    for (let channel of this.channels.values()) {
      states[channel.state]++;
    }

    return {
      totalChannels: this.channels.size,
      states,
      participants: this.participantChannels.size
    };
  }
}

module.exports = { StateChannel, StateChannelManager };
