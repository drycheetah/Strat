const mongoose = require('mongoose');

const stakeSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  startBlock: {
    type: Number,
    required: true
  },
  lockPeriod: {
    type: Number,
    required: true, // Number of blocks to lock
    min: 1
  },
  unlockBlock: {
    type: Number,
    required: true
  },
  apy: {
    type: Number,
    required: true,
    default: 5.0 // Annual percentage yield
  },
  status: {
    type: String,
    enum: ['active', 'unlocked', 'withdrawn'],
    default: 'active'
  },
  rewardsEarned: {
    type: Number,
    default: 0
  },
  lastRewardBlock: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  unlockedAt: {
    type: Date
  },
  withdrawnAt: {
    type: Date
  }
});

// Index for querying active stakes
stakeSchema.index({ address: 1, status: 1 });
stakeSchema.index({ unlockBlock: 1, status: 1 });

/**
 * Calculate rewards earned for a stake
 */
stakeSchema.methods.calculateRewards = function(currentBlock) {
  if (this.status !== 'active') return 0;

  const blocksPassed = currentBlock - this.lastRewardBlock;
  if (blocksPassed <= 0) return 0;

  // Assume ~10 blocks per minute, ~525,600 minutes per year
  // That's approximately 5,256,000 blocks per year
  const blocksPerYear = 5256000;
  const rewardPerBlock = (this.amount * (this.apy / 100)) / blocksPerYear;

  return rewardPerBlock * blocksPassed;
};

/**
 * Check if stake can be unlocked
 */
stakeSchema.methods.canUnlock = function(currentBlock) {
  return this.status === 'active' && currentBlock >= this.unlockBlock;
};

/**
 * Get stake statistics for an address
 */
stakeSchema.statics.getAddressStats = async function(address, currentBlock) {
  const stakes = await this.find({ address, status: { $ne: 'withdrawn' } });

  let totalStaked = 0;
  let totalRewards = 0;
  let activeStakes = 0;

  for (let stake of stakes) {
    if (stake.status === 'active') {
      totalStaked += stake.amount;
      totalRewards += stake.rewardsEarned;
      totalRewards += stake.calculateRewards(currentBlock);
      activeStakes++;
    }
  }

  return {
    address,
    totalStaked,
    totalRewards,
    activeStakes,
    totalStakes: stakes.length
  };
};

/**
 * Get global staking statistics
 */
stakeSchema.statics.getGlobalStats = async function(currentBlock) {
  const activeStakes = await this.find({ status: 'active' });

  let totalStaked = 0;
  let totalRewards = 0;
  const uniqueStakers = new Set();

  for (let stake of activeStakes) {
    totalStaked += stake.amount;
    totalRewards += stake.rewardsEarned;
    totalRewards += stake.calculateRewards(currentBlock);
    uniqueStakers.add(stake.address);
  }

  return {
    totalStaked,
    totalRewards,
    activeStakes: activeStakes.length,
    uniqueStakers: uniqueStakers.size,
    averageStake: activeStakes.length > 0 ? totalStaked / activeStakes.length : 0
  };
};

module.exports = mongoose.model('Stake', stakeSchema);
