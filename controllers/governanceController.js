/**
 * Governance Controller
 * Handles DAO governance operations for STRAT
 */

const Proposal = require('../models/Proposal');
const Vote = require('../models/Vote');
const Delegation = require('../models/Delegation');
const Stake = require('../models/Stake');
const Wallet = require('../models/Wallet');

// Governance parameters
const PROPOSAL_CREATION_THRESHOLD = 100; // Minimum staked tokens to create proposal
const DEFAULT_VOTING_PERIOD = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const DEFAULT_EXECUTION_DELAY = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds

/**
 * Calculate voting power for an address
 * Voting power = staked tokens + delegated voting power
 */
async function calculateVotingPower(address, currentBlock) {
  // Get staked tokens
  const stakes = await Stake.find({ address, status: 'active' });
  let stakedAmount = 0;
  for (let stake of stakes) {
    stakedAmount += stake.amount;
  }

  // Get delegated voting power
  const delegatedPower = await Delegation.getDelegatedPower(address);

  return {
    stakedAmount,
    delegatedAmount: delegatedPower.totalPower,
    totalVotingPower: stakedAmount + delegatedPower.totalPower,
    delegatorCount: delegatedPower.delegatorCount
  };
}

/**
 * Get total staked tokens in the system (for quorum calculations)
 */
async function getTotalStaked() {
  const globalStats = await Stake.getGlobalStats(0);
  return globalStats.totalStaked || 1; // Minimum 1 to avoid division by zero
}

/**
 * Create a new proposal
 */
exports.createProposal = async (req, res) => {
  try {
    const {
      title,
      description,
      proposer,
      executionData,
      votingPeriodDays,
      quorum,
      passingThreshold
    } = req.body;

    // Validate required fields
    if (!title || !description || !proposer || !executionData) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide title, description, proposer, and executionData'
      });
    }

    // Check if wallet exists
    const wallet = await Wallet.findOne({ address: proposer });
    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    // Calculate voting power
    const currentBlock = req.blockchain.chain.length;
    const votingPower = await calculateVotingPower(proposer, currentBlock);

    // Check if proposer has enough staked tokens
    if (votingPower.stakedAmount < PROPOSAL_CREATION_THRESHOLD) {
      return res.status(403).json({
        error: 'Insufficient staked tokens',
        message: `You need at least ${PROPOSAL_CREATION_THRESHOLD} STRAT staked to create a proposal`,
        currentStake: votingPower.stakedAmount,
        required: PROPOSAL_CREATION_THRESHOLD
      });
    }

    // Validate execution data
    const validExecutionTypes = ['parameter_change', 'treasury_transfer', 'contract_upgrade', 'custom'];
    if (!executionData.type || !validExecutionTypes.includes(executionData.type)) {
      return res.status(400).json({
        error: 'Invalid execution data',
        message: `Execution type must be one of: ${validExecutionTypes.join(', ')}`
      });
    }

    // Calculate voting period
    const votingPeriod = votingPeriodDays
      ? votingPeriodDays * 24 * 60 * 60 * 1000
      : DEFAULT_VOTING_PERIOD;

    const now = Date.now();
    const startTime = new Date(now);
    const endTime = new Date(now + votingPeriod);

    // Create proposal
    const proposal = new Proposal({
      title,
      description,
      proposer,
      proposerStake: votingPower.stakedAmount,
      status: 'active', // Start active immediately
      startTime,
      endTime,
      executionData,
      quorum: quorum || 0.1, // Default 10% quorum
      passingThreshold: passingThreshold || 0.5 // Default 50% passing threshold
    });

    await proposal.save();

    // Emit WebSocket event
    if (req.io) {
      req.io.emit('proposal_created', {
        proposalId: proposal._id,
        title: proposal.title,
        proposer: proposal.proposer,
        endTime: proposal.endTime
      });
    }

    res.json({
      success: true,
      message: 'Proposal created successfully',
      proposal: {
        id: proposal._id,
        title: proposal.title,
        description: proposal.description,
        proposer: proposal.proposer,
        status: proposal.status,
        startTime: proposal.startTime,
        endTime: proposal.endTime,
        votingPeriodDays: (votingPeriod / (24 * 60 * 60 * 1000)).toFixed(1),
        quorum: (proposal.quorum * 100).toFixed(1) + '%',
        passingThreshold: (proposal.passingThreshold * 100).toFixed(1) + '%'
      }
    });

  } catch (error) {
    console.error('Create proposal error:', error);
    res.status(500).json({
      error: 'Failed to create proposal',
      message: error.message
    });
  }
};

/**
 * Cast a vote on a proposal
 */
exports.vote = async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { voter, support, reason } = req.body;

    // Validate inputs
    if (!voter || support === undefined) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide voter and support (true/false)'
      });
    }

    // Get proposal
    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({
        error: 'Proposal not found'
      });
    }

    // Check if proposal is active
    if (!proposal.isActive()) {
      return res.status(400).json({
        error: 'Proposal is not active',
        status: proposal.status,
        startTime: proposal.startTime,
        endTime: proposal.endTime
      });
    }

    // Check if already voted
    const existingVote = await Vote.hasVoted(proposalId, voter);
    if (existingVote) {
      return res.status(400).json({
        error: 'Already voted',
        message: 'You have already voted on this proposal'
      });
    }

    // Check if wallet exists
    const wallet = await Wallet.findOne({ address: voter });
    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    // Calculate voting power
    const currentBlock = req.blockchain.chain.length;
    const votingPower = await calculateVotingPower(voter, currentBlock);

    if (votingPower.totalVotingPower === 0) {
      return res.status(403).json({
        error: 'No voting power',
        message: 'You must have staked tokens or delegated voting power to vote'
      });
    }

    // Create vote
    const vote = new Vote({
      proposal: proposalId,
      voter,
      support,
      votingPower: votingPower.totalVotingPower,
      reason: reason || '',
      blockNumber: currentBlock,
      timestamp: new Date()
    });

    await vote.save();

    // Update proposal vote counts
    if (support) {
      proposal.votesFor += votingPower.totalVotingPower;
    } else {
      proposal.votesAgainst += votingPower.totalVotingPower;
    }
    proposal.totalVoters += 1;

    await proposal.save();

    // Emit WebSocket event
    if (req.io) {
      req.io.emit('vote_cast', {
        proposalId: proposal._id,
        voter,
        support,
        votingPower: votingPower.totalVotingPower,
        votesFor: proposal.votesFor,
        votesAgainst: proposal.votesAgainst
      });
    }

    res.json({
      success: true,
      message: 'Vote cast successfully',
      vote: {
        proposalId: proposal._id,
        voter,
        support,
        votingPower: votingPower.totalVotingPower,
        breakdown: {
          stakedAmount: votingPower.stakedAmount,
          delegatedAmount: votingPower.delegatedAmount
        },
        currentResults: {
          votesFor: proposal.votesFor,
          votesAgainst: proposal.votesAgainst,
          totalVoters: proposal.totalVoters
        }
      }
    });

  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({
      error: 'Failed to cast vote',
      message: error.message
    });
  }
};

/**
 * Execute a passed proposal
 */
exports.executeProposal = async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { executor } = req.body;

    // Get proposal
    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({
        error: 'Proposal not found'
      });
    }

    // Check if proposal has ended
    if (!proposal.hasEnded()) {
      return res.status(400).json({
        error: 'Voting period not ended',
        endTime: proposal.endTime,
        timeRemaining: proposal.endTime - Date.now()
      });
    }

    // Update status based on voting results
    const totalStaked = await getTotalStaked();
    await proposal.updateStatus(totalStaked);

    // Check if proposal can be executed
    if (!proposal.canExecute(totalStaked)) {
      return res.status(400).json({
        error: 'Proposal cannot be executed',
        status: proposal.status,
        hasPassed: proposal.hasPassed(totalStaked),
        hasReachedQuorum: proposal.hasReachedQuorum(totalStaked),
        stats: proposal.getStats(totalStaked)
      });
    }

    // Check if executor has permission (for now, anyone can execute passed proposals)
    // In production, you might want to restrict this to governance council or token holders

    // Execute based on execution data type
    let executionResult = {};
    switch (proposal.executionData.type) {
      case 'parameter_change':
        executionResult = await executeParameterChange(proposal.executionData);
        break;
      case 'treasury_transfer':
        executionResult = await executeTreasuryTransfer(proposal.executionData, req.blockchain);
        break;
      case 'contract_upgrade':
        executionResult = await executeContractUpgrade(proposal.executionData);
        break;
      case 'custom':
        executionResult = await executeCustomAction(proposal.executionData);
        break;
      default:
        throw new Error('Unknown execution type');
    }

    // Mark as executed
    proposal.status = 'executed';
    proposal.executedAt = new Date();
    proposal.executedBy = executor || 'system';
    await proposal.save();

    // Emit WebSocket event
    if (req.io) {
      req.io.emit('proposal_executed', {
        proposalId: proposal._id,
        title: proposal.title,
        executedBy: proposal.executedBy,
        executionResult
      });
    }

    res.json({
      success: true,
      message: 'Proposal executed successfully',
      proposal: {
        id: proposal._id,
        title: proposal.title,
        status: proposal.status,
        executedAt: proposal.executedAt,
        executedBy: proposal.executedBy,
        executionResult
      }
    });

  } catch (error) {
    console.error('Execute proposal error:', error);
    res.status(500).json({
      error: 'Failed to execute proposal',
      message: error.message
    });
  }
};

/**
 * Get all proposals with optional filters
 */
exports.getProposals = async (req, res) => {
  try {
    const {
      status,
      proposer,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (proposer) query.proposer = proposer;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'desc' ? -1 : 1;

    const proposals = await Proposal.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Proposal.countDocuments(query);
    const totalStaked = await getTotalStaked();

    const enriched = proposals.map(proposal => ({
      id: proposal._id,
      title: proposal.title,
      description: proposal.description,
      proposer: proposal.proposer,
      status: proposal.status,
      startTime: proposal.startTime,
      endTime: proposal.endTime,
      isActive: proposal.isActive(),
      hasEnded: proposal.hasEnded(),
      stats: proposal.getStats(totalStaked),
      executionData: proposal.executionData,
      executedAt: proposal.executedAt,
      executedBy: proposal.executedBy,
      createdAt: proposal.createdAt
    }));

    res.json({
      success: true,
      proposals: enriched,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get proposals error:', error);
    res.status(500).json({
      error: 'Failed to get proposals',
      message: error.message
    });
  }
};

/**
 * Get detailed information about a specific proposal
 */
exports.getProposalDetails = async (req, res) => {
  try {
    const { proposalId } = req.params;

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({
        error: 'Proposal not found'
      });
    }

    const totalStaked = await getTotalStaked();
    const voteBreakdown = await Vote.getProposalVotes(proposalId);

    res.json({
      success: true,
      proposal: {
        id: proposal._id,
        title: proposal.title,
        description: proposal.description,
        proposer: proposal.proposer,
        proposerStake: proposal.proposerStake,
        status: proposal.status,
        startTime: proposal.startTime,
        endTime: proposal.endTime,
        isActive: proposal.isActive(),
        hasEnded: proposal.hasEnded(),
        stats: proposal.getStats(totalStaked),
        executionData: proposal.executionData,
        executedAt: proposal.executedAt,
        executedBy: proposal.executedBy,
        createdAt: proposal.createdAt,
        voteBreakdown: {
          votesFor: voteBreakdown.votesFor,
          votesAgainst: voteBreakdown.votesAgainst,
          totalVotingPower: voteBreakdown.totalVotingPower,
          totalVoters: voteBreakdown.totalVoters,
          recentVotes: voteBreakdown.votes.slice(0, 10) // Latest 10 votes
        }
      }
    });

  } catch (error) {
    console.error('Get proposal details error:', error);
    res.status(500).json({
      error: 'Failed to get proposal details',
      message: error.message
    });
  }
};

/**
 * Delegate voting power to another address
 */
exports.delegateVotingPower = async (req, res) => {
  try {
    const { delegator, delegate, amount } = req.body;

    // Validate inputs
    if (!delegator || !delegate || !amount) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide delegator, delegate, and amount'
      });
    }

    if (delegator === delegate) {
      return res.status(400).json({
        error: 'Invalid delegation',
        message: 'Cannot delegate to yourself'
      });
    }

    // Check if wallets exist
    const delegatorWallet = await Wallet.findOne({ address: delegator });
    const delegateWallet = await Wallet.findOne({ address: delegate });

    if (!delegatorWallet || !delegateWallet) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    // Check if delegator has enough staked tokens
    const stakes = await Stake.find({ address: delegator, status: 'active' });
    let totalStaked = 0;
    for (let stake of stakes) {
      totalStaked += stake.amount;
    }

    if (totalStaked < amount) {
      return res.status(400).json({
        error: 'Insufficient staked tokens',
        message: 'You can only delegate voting power from staked tokens',
        staked: totalStaked,
        requested: amount
      });
    }

    // Check if already delegated to this address
    const existingDelegation = await Delegation.getActiveDelegation(delegator, delegate);
    if (existingDelegation) {
      return res.status(400).json({
        error: 'Already delegated',
        message: 'You have already delegated to this address. Revoke the existing delegation first.',
        existingAmount: existingDelegation.votingPower
      });
    }

    // Create delegation
    const currentBlock = req.blockchain.chain.length;
    const delegation = new Delegation({
      delegator,
      delegate,
      votingPower: amount,
      active: true,
      startBlock: currentBlock
    });

    await delegation.save();

    // Emit WebSocket event
    if (req.io) {
      req.io.to(`address:${delegator}`).emit('delegation_created', {
        delegate,
        amount
      });

      req.io.to(`address:${delegate}`).emit('delegation_received', {
        delegator,
        amount
      });
    }

    res.json({
      success: true,
      message: 'Voting power delegated successfully',
      delegation: {
        id: delegation._id,
        delegator,
        delegate,
        votingPower: amount,
        startBlock: currentBlock,
        createdAt: delegation.createdAt
      }
    });

  } catch (error) {
    console.error('Delegate voting power error:', error);
    res.status(500).json({
      error: 'Failed to delegate voting power',
      message: error.message
    });
  }
};

/**
 * Revoke delegation
 */
exports.revokeDelegation = async (req, res) => {
  try {
    const { delegationId } = req.params;

    const delegation = await Delegation.findById(delegationId);
    if (!delegation) {
      return res.status(404).json({
        error: 'Delegation not found'
      });
    }

    if (!delegation.active) {
      return res.status(400).json({
        error: 'Delegation already revoked'
      });
    }

    await delegation.revoke();

    // Emit WebSocket event
    if (req.io) {
      req.io.to(`address:${delegation.delegator}`).emit('delegation_revoked', {
        delegationId: delegation._id,
        delegate: delegation.delegate,
        amount: delegation.votingPower
      });
    }

    res.json({
      success: true,
      message: 'Delegation revoked successfully',
      delegation: {
        id: delegation._id,
        delegator: delegation.delegator,
        delegate: delegation.delegate,
        votingPower: delegation.votingPower,
        revokedAt: delegation.revokedAt
      }
    });

  } catch (error) {
    console.error('Revoke delegation error:', error);
    res.status(500).json({
      error: 'Failed to revoke delegation',
      message: error.message
    });
  }
};

/**
 * Get voting power for an address
 */
exports.getVotingPower = async (req, res) => {
  try {
    const { address } = req.params;

    const wallet = await Wallet.findOne({ address });
    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    const currentBlock = req.blockchain.chain.length;
    const votingPower = await calculateVotingPower(address, currentBlock);

    // Get delegation info
    const delegatorInfo = await Delegation.getDelegatorInfo(address);
    const delegatedPowerInfo = await Delegation.getDelegatedPower(address);

    res.json({
      success: true,
      address,
      votingPower: {
        staked: votingPower.stakedAmount,
        delegatedTo: delegatorInfo.totalDelegated,
        delegatedFrom: votingPower.delegatedAmount,
        total: votingPower.totalVotingPower,
        available: votingPower.stakedAmount - delegatorInfo.totalDelegated
      },
      delegations: {
        outgoing: delegatorInfo.delegations,
        incoming: delegatedPowerInfo.delegations
      }
    });

  } catch (error) {
    console.error('Get voting power error:', error);
    res.status(500).json({
      error: 'Failed to get voting power',
      message: error.message
    });
  }
};

/**
 * Get voting history for an address
 */
exports.getVotingHistory = async (req, res) => {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const votes = await Vote.getVoterHistory(address, limit);
    const stats = await Vote.getVoterStats(address);

    res.json({
      success: true,
      address,
      stats,
      votes: votes.map(vote => ({
        proposalId: vote.proposal._id,
        proposalTitle: vote.proposal.title,
        proposalStatus: vote.proposal.status,
        support: vote.support,
        votingPower: vote.votingPower,
        reason: vote.reason,
        timestamp: vote.timestamp,
        delegatedFrom: vote.delegatedFrom
      }))
    });

  } catch (error) {
    console.error('Get voting history error:', error);
    res.status(500).json({
      error: 'Failed to get voting history',
      message: error.message
    });
  }
};

/**
 * Get governance statistics
 */
exports.getGovernanceStats = async (req, res) => {
  try {
    const totalStaked = await getTotalStaked();
    const totalProposals = await Proposal.countDocuments();
    const activeProposals = await Proposal.countDocuments({ status: 'active' });
    const passedProposals = await Proposal.countDocuments({ status: 'passed' });
    const executedProposals = await Proposal.countDocuments({ status: 'executed' });
    const totalVotes = await Vote.countDocuments();
    const totalDelegations = await Delegation.countDocuments({ active: true });

    // Get top delegates
    const topDelegates = await Delegation.getTopDelegates(5);

    // Get recent proposals
    const recentProposals = await Proposal.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status createdAt votesFor votesAgainst');

    res.json({
      success: true,
      stats: {
        totalStaked,
        totalProposals,
        activeProposals,
        passedProposals,
        executedProposals,
        totalVotes,
        totalDelegations,
        proposalCreationThreshold: PROPOSAL_CREATION_THRESHOLD,
        defaultVotingPeriodDays: DEFAULT_VOTING_PERIOD / (24 * 60 * 60 * 1000)
      },
      topDelegates,
      recentProposals: recentProposals.map(p => ({
        id: p._id,
        title: p.title,
        status: p.status,
        votesFor: p.votesFor,
        votesAgainst: p.votesAgainst,
        createdAt: p.createdAt
      }))
    });

  } catch (error) {
    console.error('Get governance stats error:', error);
    res.status(500).json({
      error: 'Failed to get governance statistics',
      message: error.message
    });
  }
};

// Execution helper functions
async function executeParameterChange(executionData) {
  // Placeholder for parameter change execution
  console.log('Executing parameter change:', executionData);
  return {
    type: 'parameter_change',
    parameter: executionData.target,
    newValue: executionData.value,
    executed: true
  };
}

async function executeTreasuryTransfer(executionData, blockchain) {
  // Placeholder for treasury transfer execution
  console.log('Executing treasury transfer:', executionData);
  return {
    type: 'treasury_transfer',
    recipient: executionData.target,
    amount: executionData.value,
    executed: true
  };
}

async function executeContractUpgrade(executionData) {
  // Placeholder for contract upgrade execution
  console.log('Executing contract upgrade:', executionData);
  return {
    type: 'contract_upgrade',
    contract: executionData.target,
    newVersion: executionData.value,
    executed: true
  };
}

async function executeCustomAction(executionData) {
  // Placeholder for custom action execution
  console.log('Executing custom action:', executionData);
  return {
    type: 'custom',
    action: executionData.description,
    executed: true
  };
}
