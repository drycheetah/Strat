const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  proposal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposal',
    required: true,
    index: true
  },
  voter: {
    type: String,
    required: true,
    index: true
  },
  support: {
    type: Boolean,
    required: true // true = vote for, false = vote against
  },
  votingPower: {
    type: Number,
    required: true,
    min: 0
  },
  delegatedFrom: {
    type: String, // If vote was cast by a delegate
    default: null
  },
  reason: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  transactionHash: {
    type: String,
    unique: true,
    sparse: true
  },
  blockNumber: {
    type: Number
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
voteSchema.index({ proposal: 1, voter: 1 }, { unique: true }); // One vote per voter per proposal
voteSchema.index({ proposal: 1, support: 1 });
voteSchema.index({ voter: 1, timestamp: -1 });
voteSchema.index({ delegatedFrom: 1 }, { sparse: true });

/**
 * Get vote breakdown for a proposal
 */
voteSchema.statics.getProposalVotes = async function(proposalId) {
  const votes = await this.find({ proposal: proposalId });

  let votesFor = 0;
  let votesAgainst = 0;
  let totalVotingPower = 0;
  let uniqueVoters = new Set();

  for (let vote of votes) {
    if (vote.support) {
      votesFor += vote.votingPower;
    } else {
      votesAgainst += vote.votingPower;
    }
    totalVotingPower += vote.votingPower;
    uniqueVoters.add(vote.voter);
  }

  return {
    votesFor,
    votesAgainst,
    totalVotingPower,
    totalVoters: uniqueVoters.size,
    votes: votes.map(v => ({
      voter: v.voter,
      support: v.support,
      votingPower: v.votingPower,
      reason: v.reason,
      timestamp: v.timestamp,
      delegatedFrom: v.delegatedFrom
    }))
  };
};

/**
 * Get voting history for an address
 */
voteSchema.statics.getVoterHistory = async function(voterAddress, limit = 50) {
  return this.find({ voter: voterAddress })
    .populate('proposal', 'title status createdAt')
    .sort({ timestamp: -1 })
    .limit(limit);
};

/**
 * Check if address has voted on proposal
 */
voteSchema.statics.hasVoted = async function(proposalId, voterAddress) {
  const vote = await this.findOne({
    proposal: proposalId,
    voter: voterAddress
  });
  return !!vote;
};

/**
 * Get vote for specific proposal and voter
 */
voteSchema.statics.getVote = async function(proposalId, voterAddress) {
  return this.findOne({
    proposal: proposalId,
    voter: voterAddress
  });
};

/**
 * Get delegated votes cast by an address
 */
voteSchema.statics.getDelegatedVotes = async function(delegateAddress) {
  return this.find({ delegatedFrom: delegateAddress })
    .populate('proposal', 'title status')
    .sort({ timestamp: -1 });
};

/**
 * Calculate voting statistics for an address
 */
voteSchema.statics.getVoterStats = async function(voterAddress) {
  const votes = await this.find({ voter: voterAddress });

  let totalVotes = votes.length;
  let votesFor = 0;
  let votesAgainst = 0;
  let totalVotingPowerUsed = 0;
  let delegatedVotesCount = 0;

  for (let vote of votes) {
    if (vote.support) {
      votesFor++;
    } else {
      votesAgainst++;
    }
    totalVotingPowerUsed += vote.votingPower;
    if (vote.delegatedFrom) {
      delegatedVotesCount++;
    }
  }

  return {
    totalVotes,
    votesFor,
    votesAgainst,
    totalVotingPowerUsed,
    delegatedVotesCount,
    participationRate: totalVotes > 0 ? ((votesFor / totalVotes) * 100).toFixed(2) : 0
  };
};

module.exports = mongoose.model('Vote', voteSchema);
