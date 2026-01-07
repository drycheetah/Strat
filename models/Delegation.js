const mongoose = require('mongoose');

const delegationSchema = new mongoose.Schema({
  delegator: {
    type: String,
    required: true,
    index: true
  },
  delegate: {
    type: String,
    required: true,
    index: true
  },
  votingPower: {
    type: Number,
    required: true,
    min: 0
  },
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  startBlock: {
    type: Number,
    required: true
  },
  endBlock: {
    type: Number
  },
  transactionHash: {
    type: String,
    unique: true,
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  revokedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound indexes
delegationSchema.index({ delegator: 1, active: 1 });
delegationSchema.index({ delegate: 1, active: 1 });
delegationSchema.index({ delegator: 1, delegate: 1 });

/**
 * Get total voting power delegated to an address
 */
delegationSchema.statics.getDelegatedPower = async function(delegateAddress) {
  const delegations = await this.find({
    delegate: delegateAddress,
    active: true
  });

  let totalPower = 0;
  let delegatorCount = 0;

  for (let delegation of delegations) {
    totalPower += delegation.votingPower;
    delegatorCount++;
  }

  return {
    totalPower,
    delegatorCount,
    delegations: delegations.map(d => ({
      delegator: d.delegator,
      votingPower: d.votingPower,
      since: d.createdAt
    }))
  };
};

/**
 * Get delegations made by an address
 */
delegationSchema.statics.getDelegatorInfo = async function(delegatorAddress) {
  const delegations = await this.find({
    delegator: delegatorAddress,
    active: true
  });

  let totalDelegated = 0;
  let delegateCount = 0;

  for (let delegation of delegations) {
    totalDelegated += delegation.votingPower;
    delegateCount++;
  }

  return {
    totalDelegated,
    delegateCount,
    delegations: delegations.map(d => ({
      delegate: d.delegate,
      votingPower: d.votingPower,
      since: d.createdAt
    }))
  };
};

/**
 * Check if delegator has delegated to specific delegate
 */
delegationSchema.statics.hasDelegated = async function(delegatorAddress, delegateAddress) {
  const delegation = await this.findOne({
    delegator: delegatorAddress,
    delegate: delegateAddress,
    active: true
  });
  return !!delegation;
};

/**
 * Get active delegation between two addresses
 */
delegationSchema.statics.getActiveDelegation = async function(delegatorAddress, delegateAddress) {
  return this.findOne({
    delegator: delegatorAddress,
    delegate: delegateAddress,
    active: true
  });
};

/**
 * Get top delegates by voting power
 */
delegationSchema.statics.getTopDelegates = async function(limit = 10) {
  const result = await this.aggregate([
    {
      $match: { active: true }
    },
    {
      $group: {
        _id: '$delegate',
        totalVotingPower: { $sum: '$votingPower' },
        delegatorCount: { $sum: 1 }
      }
    },
    {
      $sort: { totalVotingPower: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        _id: 0,
        delegate: '$_id',
        totalVotingPower: 1,
        delegatorCount: 1
      }
    }
  ]);

  return result;
};

/**
 * Revoke delegation
 */
delegationSchema.methods.revoke = async function() {
  this.active = false;
  this.revokedAt = new Date();
  await this.save();
};

module.exports = mongoose.model('Delegation', delegationSchema);
