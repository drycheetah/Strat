const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 20,
    maxlength: 5000
  },
  proposer: {
    type: String,
    required: true,
    index: true
  },
  proposerStake: {
    type: Number,
    required: true,
    default: 0
  },
  votesFor: {
    type: Number,
    default: 0,
    min: 0
  },
  votesAgainst: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'passed', 'rejected', 'executed', 'cancelled'],
    default: 'pending',
    index: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  executionData: {
    type: {
      type: String,
      enum: ['parameter_change', 'treasury_transfer', 'contract_upgrade', 'custom'],
      required: true
    },
    target: String,
    value: mongoose.Schema.Types.Mixed,
    calldata: String,
    description: String
  },
  minVotingPower: {
    type: Number,
    default: 1000, // Minimum total voting power required for proposal to be valid
    min: 0
  },
  quorum: {
    type: Number,
    default: 0.1, // 10% of total staked tokens must participate
    min: 0,
    max: 1
  },
  passingThreshold: {
    type: Number,
    default: 0.5, // 50% of votes must be in favor
    min: 0,
    max: 1
  },
  executedAt: {
    type: Date
  },
  executedBy: {
    type: String
  },
  cancelledAt: {
    type: Date
  },
  cancelledBy: {
    type: String
  },
  cancelReason: {
    type: String
  },
  totalVoters: {
    type: Number,
    default: 0,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
proposalSchema.index({ proposer: 1, createdAt: -1 });
proposalSchema.index({ status: 1, endTime: 1 });
proposalSchema.index({ startTime: 1, endTime: 1 });

/**
 * Check if proposal is currently active for voting
 */
proposalSchema.methods.isActive = function() {
  const now = Date.now();
  return this.status === 'active' &&
         this.startTime <= now &&
         this.endTime > now;
};

/**
 * Check if voting period has ended
 */
proposalSchema.methods.hasEnded = function() {
  return Date.now() > this.endTime;
};

/**
 * Calculate total votes cast
 */
proposalSchema.methods.getTotalVotes = function() {
  return this.votesFor + this.votesAgainst;
};

/**
 * Calculate vote percentage in favor
 */
proposalSchema.methods.getVotePercentage = function() {
  const total = this.getTotalVotes();
  if (total === 0) return 0;
  return (this.votesFor / total) * 100;
};

/**
 * Check if proposal has reached quorum
 */
proposalSchema.methods.hasReachedQuorum = function(totalStaked) {
  const totalVotes = this.getTotalVotes();
  const requiredVotes = totalStaked * this.quorum;
  return totalVotes >= requiredVotes;
};

/**
 * Check if proposal has passed voting
 */
proposalSchema.methods.hasPassed = function(totalStaked) {
  if (!this.hasReachedQuorum(totalStaked)) {
    return false;
  }

  const total = this.getTotalVotes();
  if (total === 0) return false;

  const votePercentage = this.votesFor / total;
  return votePercentage >= this.passingThreshold;
};

/**
 * Check if proposal can be executed
 */
proposalSchema.methods.canExecute = function(totalStaked) {
  return this.status === 'passed' &&
         this.hasPassed(totalStaked) &&
         !this.executedAt;
};

/**
 * Update proposal status based on voting results
 */
proposalSchema.methods.updateStatus = async function(totalStaked) {
  if (this.status === 'executed' || this.status === 'cancelled') {
    return this.status;
  }

  if (this.status === 'pending' && Date.now() >= this.startTime) {
    this.status = 'active';
  } else if (this.status === 'active' && this.hasEnded()) {
    if (this.hasPassed(totalStaked)) {
      this.status = 'passed';
    } else {
      this.status = 'rejected';
    }
  }

  await this.save();
  return this.status;
};

/**
 * Get proposal statistics
 */
proposalSchema.methods.getStats = function(totalStaked) {
  const totalVotes = this.getTotalVotes();
  const votePercentage = this.getVotePercentage();
  const hasReachedQuorum = this.hasReachedQuorum(totalStaked);
  const hasPassed = this.hasPassed(totalStaked);

  return {
    totalVotes,
    votesFor: this.votesFor,
    votesAgainst: this.votesAgainst,
    votePercentage: votePercentage.toFixed(2),
    totalVoters: this.totalVoters,
    hasReachedQuorum,
    hasPassed,
    quorumRequired: (totalStaked * this.quorum).toFixed(2),
    passingThreshold: (this.passingThreshold * 100).toFixed(1) + '%',
    timeRemaining: Math.max(0, this.endTime - Date.now())
  };
};

/**
 * Get active proposals
 */
proposalSchema.statics.getActiveProposals = async function() {
  const now = Date.now();
  return this.find({
    status: 'active',
    startTime: { $lte: now },
    endTime: { $gt: now }
  }).sort({ createdAt: -1 });
};

/**
 * Get proposals by status
 */
proposalSchema.statics.getByStatus = async function(status, limit = 50) {
  return this.find({ status })
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Get proposals created by an address
 */
proposalSchema.statics.getByProposer = async function(proposer, limit = 50) {
  return this.find({ proposer })
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('Proposal', proposalSchema);
