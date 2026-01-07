/**
 * Governance Contract
 * Decentralized governance with proposal creation, voting, and execution
 */

class GovernanceContract {
  constructor(votingToken, votingPeriod, quorumPercentage, executionDelay) {
    this.votingToken = votingToken || null; // Address of voting token contract
    this.votingPeriod = votingPeriod || 7 * 24 * 60 * 60 * 1000; // 7 days default
    this.quorumPercentage = quorumPercentage || 10; // 10% default
    this.executionDelay = executionDelay || 2 * 24 * 60 * 60 * 1000; // 2 days default

    // Storage
    this.proposals = new Map();
    this.votes = new Map();
    this.proposalCounter = 0;
    this.owner = this.caller;

    // Settings
    this.proposalThreshold = 1000; // Minimum tokens to create proposal
    this.minVotingPeriod = 1 * 24 * 60 * 60 * 1000; // 1 day
    this.maxVotingPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days
  }

  // Proposal Creation

  createProposal(title, description, actions, metadata) {
    const proposer = this.caller;

    // Validate inputs
    if (!title || title.length === 0) {
      throw new Error('Title required');
    }

    if (!description || description.length === 0) {
      throw new Error('Description required');
    }

    // In production, would check proposer has enough voting power
    // const votingPower = this.getVotingPower(proposer);
    // if (votingPower < this.proposalThreshold) {
    //   throw new Error('Insufficient voting power to create proposal');
    // }

    const proposalId = ++this.proposalCounter;
    const now = Date.now();

    const proposal = {
      id: proposalId,
      title,
      description,
      proposer,
      actions: actions || [],
      metadata: metadata || {},
      startTime: now,
      endTime: now + this.votingPeriod,
      executionTime: 0,
      votesFor: 0,
      votesAgainst: 0,
      votesAbstain: 0,
      totalVotes: 0,
      status: 'Active', // Active, Succeeded, Defeated, Executed, Cancelled, Queued
      executed: false,
      cancelled: false,
      createdAt: now
    };

    this.proposals.set(proposalId, proposal);

    this.emit('ProposalCreated', {
      proposalId,
      proposer,
      title,
      description,
      startTime: now,
      endTime: proposal.endTime
    });

    return proposalId;
  }

  // Voting

  castVote(proposalId, support, reason) {
    const voter = this.caller;
    const proposal = this.proposals.get(proposalId);

    if (!proposal) {
      throw new Error('Proposal does not exist');
    }

    const now = Date.now();

    if (now < proposal.startTime) {
      throw new Error('Voting has not started');
    }

    if (now > proposal.endTime) {
      throw new Error('Voting period has ended');
    }

    if (proposal.cancelled) {
      throw new Error('Proposal is cancelled');
    }

    if (proposal.executed) {
      throw new Error('Proposal already executed');
    }

    const voteKey = `${proposalId}:${voter}`;

    if (this.votes.has(voteKey)) {
      throw new Error('Already voted on this proposal');
    }

    // Get voting power (in production, would query token contract)
    const votingPower = this.getVotingPower(voter);

    if (votingPower === 0) {
      throw new Error('No voting power');
    }

    // Record vote
    const vote = {
      proposalId,
      voter,
      support, // 0 = Against, 1 = For, 2 = Abstain
      votingPower,
      reason: reason || '',
      timestamp: now
    };

    this.votes.set(voteKey, vote);

    // Update proposal vote counts
    if (support === 0) {
      proposal.votesAgainst += votingPower;
    } else if (support === 1) {
      proposal.votesFor += votingPower;
    } else if (support === 2) {
      proposal.votesAbstain += votingPower;
    } else {
      throw new Error('Invalid vote support value (0=Against, 1=For, 2=Abstain)');
    }

    proposal.totalVotes += votingPower;

    this.emit('VoteCast', {
      proposalId,
      voter,
      support,
      votingPower,
      reason
    });

    return true;
  }

  castVoteWithReasonAndParams(proposalId, support, reason, params) {
    // Extended voting with additional parameters
    this.castVote(proposalId, support, reason);

    this.emit('VoteCastWithParams', {
      proposalId,
      voter: this.caller,
      support,
      reason,
      params
    });

    return true;
  }

  // Proposal State Management

  queue(proposalId) {
    const proposal = this.proposals.get(proposalId);

    if (!proposal) {
      throw new Error('Proposal does not exist');
    }

    if (proposal.status !== 'Active') {
      throw new Error('Proposal not in active state');
    }

    const now = Date.now();

    if (now <= proposal.endTime) {
      throw new Error('Voting period not ended');
    }

    // Check if proposal succeeded
    const quorumReached = this.hasReachedQuorum(proposalId);
    const voteSucceeded = proposal.votesFor > proposal.votesAgainst;

    if (!quorumReached) {
      proposal.status = 'Defeated';
      this.emit('ProposalDefeated', { proposalId, reason: 'Quorum not reached' });
      return false;
    }

    if (!voteSucceeded) {
      proposal.status = 'Defeated';
      this.emit('ProposalDefeated', { proposalId, reason: 'Vote failed' });
      return false;
    }

    // Queue for execution
    proposal.status = 'Queued';
    proposal.executionTime = now + this.executionDelay;

    this.emit('ProposalQueued', {
      proposalId,
      executionTime: proposal.executionTime
    });

    return true;
  }

  execute(proposalId) {
    const proposal = this.proposals.get(proposalId);

    if (!proposal) {
      throw new Error('Proposal does not exist');
    }

    if (proposal.status !== 'Queued') {
      throw new Error('Proposal not queued for execution');
    }

    if (proposal.executed) {
      throw new Error('Proposal already executed');
    }

    if (proposal.cancelled) {
      throw new Error('Proposal is cancelled');
    }

    const now = Date.now();

    if (now < proposal.executionTime) {
      throw new Error('Execution delay not passed');
    }

    // Execute proposal actions
    if (proposal.actions && proposal.actions.length > 0) {
      for (const action of proposal.actions) {
        try {
          this.executeAction(action);
        } catch (error) {
          throw new Error(`Action execution failed: ${error.message}`);
        }
      }
    }

    proposal.executed = true;
    proposal.status = 'Executed';

    this.emit('ProposalExecuted', { proposalId });

    return true;
  }

  executeAction(action) {
    // In production, would execute contract calls, transfers, etc.
    // For now, just log the action
    this.emit('ActionExecuted', { action });
    return true;
  }

  cancel(proposalId) {
    const proposal = this.proposals.get(proposalId);

    if (!proposal) {
      throw new Error('Proposal does not exist');
    }

    const caller = this.caller;

    // Only proposer or owner can cancel
    if (caller !== proposal.proposer && caller !== this.owner) {
      throw new Error('Not authorized to cancel');
    }

    if (proposal.executed) {
      throw new Error('Cannot cancel executed proposal');
    }

    if (proposal.cancelled) {
      throw new Error('Already cancelled');
    }

    proposal.cancelled = true;
    proposal.status = 'Cancelled';

    this.emit('ProposalCancelled', { proposalId, cancelledBy: caller });

    return true;
  }

  // View Functions

  getProposal(proposalId) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error('Proposal does not exist');
    }
    return proposal;
  }

  getProposalState(proposalId) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error('Proposal does not exist');
    }
    return proposal.status;
  }

  getVote(proposalId, voter) {
    const voteKey = `${proposalId}:${voter}`;
    return this.votes.get(voteKey) || null;
  }

  hasVoted(proposalId, voter) {
    const voteKey = `${proposalId}:${voter}`;
    return this.votes.has(voteKey);
  }

  getProposalVotes(proposalId) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error('Proposal does not exist');
    }

    return {
      for: proposal.votesFor,
      against: proposal.votesAgainst,
      abstain: proposal.votesAbstain,
      total: proposal.totalVotes
    };
  }

  hasReachedQuorum(proposalId) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error('Proposal does not exist');
    }

    // In production, would calculate based on total token supply
    const totalSupply = 1000000; // Mock value
    const quorumVotes = (totalSupply * this.quorumPercentage) / 100;

    return proposal.totalVotes >= quorumVotes;
  }

  getVotingPower(address) {
    // In production, would query voting token contract
    // For now, return mock value
    return 100;
  }

  // Configuration

  setVotingPeriod(newPeriod) {
    if (this.caller !== this.owner) {
      throw new Error('Only owner can set voting period');
    }

    if (newPeriod < this.minVotingPeriod || newPeriod > this.maxVotingPeriod) {
      throw new Error('Voting period out of allowed range');
    }

    this.votingPeriod = newPeriod;
    this.emit('VotingPeriodUpdated', { newPeriod });
    return true;
  }

  setQuorumPercentage(newQuorum) {
    if (this.caller !== this.owner) {
      throw new Error('Only owner can set quorum');
    }

    if (newQuorum < 1 || newQuorum > 100) {
      throw new Error('Quorum must be between 1 and 100');
    }

    this.quorumPercentage = newQuorum;
    this.emit('QuorumUpdated', { newQuorum });
    return true;
  }

  setExecutionDelay(newDelay) {
    if (this.caller !== this.owner) {
      throw new Error('Only owner can set execution delay');
    }

    this.executionDelay = newDelay;
    this.emit('ExecutionDelayUpdated', { newDelay });
    return true;
  }

  setProposalThreshold(newThreshold) {
    if (this.caller !== this.owner) {
      throw new Error('Only owner can set proposal threshold');
    }

    this.proposalThreshold = newThreshold;
    this.emit('ProposalThresholdUpdated', { newThreshold });
    return true;
  }

  // Ownership

  transferOwnership(newOwner) {
    if (this.caller !== this.owner) {
      throw new Error('Only owner can transfer ownership');
    }

    if (!newOwner || newOwner === '0x0') {
      throw new Error('Invalid new owner');
    }

    const oldOwner = this.owner;
    this.owner = newOwner;

    this.emit('OwnershipTransferred', { oldOwner, newOwner });
    return true;
  }
}

module.exports = GovernanceContract;
