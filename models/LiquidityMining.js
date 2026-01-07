const mongoose = require('mongoose');

const minerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stakedAmount: {
    type: Number,
    required: true,
    min: 0
  },
  shares: {
    type: Number,
    required: true,
    min: 0
  },
  rewardDebt: {
    type: Number,
    default: 0
  },
  pendingRewards: {
    type: Number,
    default: 0
  },
  totalRewardsClaimed: {
    type: Number,
    default: 0
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastClaimAt: {
    type: Date,
    default: Date.now
  }
});

const liquidityMiningSchema = new mongoose.Schema({
  programId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  poolId: {
    type: String,
    required: true
  },
  stakingToken: {
    type: String,
    required: true
  },
  rewardToken: {
    type: String,
    required: true
  },
  rewardPerBlock: {
    type: Number,
    required: true,
    min: 0
  },
  startBlock: {
    type: Number,
    required: true
  },
  endBlock: {
    type: Number,
    required: true
  },
  currentBlock: {
    type: Number,
    default: 0
  },
  totalStaked: {
    type: Number,
    default: 0
  },
  totalShares: {
    type: Number,
    default: 0
  },
  accRewardPerShare: {
    type: Number,
    default: 0
  },
  lastRewardBlock: {
    type: Number,
    default: 0
  },
  miners: [minerSchema],
  totalRewardsDistributed: {
    type: Number,
    default: 0
  },
  multiplier: {
    type: Number,
    default: 1,
    min: 0.1,
    max: 10
  },
  lockupPeriod: {
    type: Number,
    default: 0 // in blocks
  },
  earlyWithdrawalPenalty: {
    type: Number,
    default: 0.1, // 10%
    min: 0,
    max: 0.5
  },
  boostMultipliers: [{
    minLockup: Number, // blocks
    multiplier: Number
  }],
  tier: {
    type: String,
    enum: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'],
    default: 'BRONZE'
  },
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Update reward variables
liquidityMiningSchema.methods.updatePool = async function(currentBlock) {
  if (currentBlock <= this.lastRewardBlock) {
    return;
  }

  if (this.totalStaked === 0) {
    this.lastRewardBlock = currentBlock;
    this.currentBlock = currentBlock;
    await this.save();
    return;
  }

  const blocks = Math.min(currentBlock, this.endBlock) - this.lastRewardBlock;
  const reward = blocks * this.rewardPerBlock * this.multiplier;

  this.accRewardPerShare += (reward * 1e12) / this.totalStaked; // Precision scaling
  this.lastRewardBlock = currentBlock;
  this.currentBlock = currentBlock;
  this.totalRewardsDistributed += reward;

  await this.save();
};

// Stake tokens
liquidityMiningSchema.methods.stake = async function(user, amount, currentBlock) {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  if (currentBlock < this.startBlock) {
    throw new Error('Mining program has not started');
  }

  if (currentBlock > this.endBlock) {
    throw new Error('Mining program has ended');
  }

  // Update pool first
  await this.updatePool(currentBlock);

  let miner = this.miners.find(m => m.user.toString() === user.toString());

  if (!miner) {
    miner = {
      user,
      stakedAmount: 0,
      shares: 0,
      rewardDebt: 0,
      pendingRewards: 0,
      totalRewardsClaimed: 0,
      joinedAt: new Date(),
      lastClaimAt: new Date()
    };
    this.miners.push(miner);
  } else {
    // Calculate pending rewards before update
    const pending = ((miner.stakedAmount * this.accRewardPerShare) / 1e12) - miner.rewardDebt;
    miner.pendingRewards += pending;
  }

  miner.stakedAmount += amount;
  miner.shares += amount; // 1:1 for simplicity
  miner.rewardDebt = (miner.stakedAmount * this.accRewardPerShare) / 1e12;

  this.totalStaked += amount;
  this.totalShares += amount;

  await this.save();

  return {
    stakedAmount: miner.stakedAmount,
    totalStaked: this.totalStaked,
    currentAPY: this.calculateAPY()
  };
};

// Unstake tokens
liquidityMiningSchema.methods.unstake = async function(user, amount, currentBlock) {
  const miner = this.miners.find(m => m.user.toString() === user.toString());
  if (!miner) {
    throw new Error('No stake found');
  }

  if (amount > miner.stakedAmount) {
    throw new Error('Insufficient staked amount');
  }

  // Update pool first
  await this.updatePool(currentBlock);

  // Calculate pending rewards
  const pending = ((miner.stakedAmount * this.accRewardPerShare) / 1e12) - miner.rewardDebt;
  miner.pendingRewards += pending;

  // Check lockup
  const blocksStaked = currentBlock - this.startBlock;
  let penalty = 0;

  if (blocksStaked < this.lockupPeriod) {
    penalty = amount * this.earlyWithdrawalPenalty;
  }

  const netWithdrawal = amount - penalty;

  miner.stakedAmount -= amount;
  miner.shares -= amount;
  miner.rewardDebt = (miner.stakedAmount * this.accRewardPerShare) / 1e12;

  this.totalStaked -= amount;
  this.totalShares -= amount;

  // Remove miner if no stake left
  if (miner.stakedAmount === 0) {
    const minerIndex = this.miners.findIndex(m => m.user.toString() === user.toString());
    if (minerIndex !== -1) {
      this.miners.splice(minerIndex, 1);
    }
  }

  await this.save();

  return {
    withdrawn: netWithdrawal,
    penalty,
    pendingRewards: miner.pendingRewards
  };
};

// Claim rewards
liquidityMiningSchema.methods.claimRewards = async function(user, currentBlock) {
  const miner = this.miners.find(m => m.user.toString() === user.toString());
  if (!miner) {
    throw new Error('No stake found');
  }

  // Update pool first
  await this.updatePool(currentBlock);

  // Calculate total pending rewards
  const pending = ((miner.stakedAmount * this.accRewardPerShare) / 1e12) - miner.rewardDebt;
  const totalRewards = miner.pendingRewards + pending;

  if (totalRewards === 0) {
    throw new Error('No rewards to claim');
  }

  // Apply boost multiplier if applicable
  const blocksStaked = currentBlock - this.startBlock;
  let boostMultiplier = 1;

  for (const boost of this.boostMultipliers) {
    if (blocksStaked >= boost.minLockup) {
      boostMultiplier = Math.max(boostMultiplier, boost.multiplier);
    }
  }

  const boostedRewards = totalRewards * boostMultiplier;

  miner.pendingRewards = 0;
  miner.rewardDebt = (miner.stakedAmount * this.accRewardPerShare) / 1e12;
  miner.totalRewardsClaimed += boostedRewards;
  miner.lastClaimAt = new Date();

  await this.save();

  return {
    rewards: boostedRewards,
    baseRewards: totalRewards,
    boostMultiplier,
    totalClaimed: miner.totalRewardsClaimed
  };
};

// Get pending rewards
liquidityMiningSchema.methods.getPendingRewards = async function(user, currentBlock) {
  const miner = this.miners.find(m => m.user.toString() === user.toString());
  if (!miner) {
    return 0;
  }

  let accRewardPerShare = this.accRewardPerShare;

  if (currentBlock > this.lastRewardBlock && this.totalStaked > 0) {
    const blocks = Math.min(currentBlock, this.endBlock) - this.lastRewardBlock;
    const reward = blocks * this.rewardPerBlock * this.multiplier;
    accRewardPerShare += (reward * 1e12) / this.totalStaked;
  }

  const pending = ((miner.stakedAmount * accRewardPerShare) / 1e12) - miner.rewardDebt;
  return miner.pendingRewards + pending;
};

// Calculate APY
liquidityMiningSchema.methods.calculateAPY = function() {
  if (this.totalStaked === 0) return 0;

  // Blocks per year (assuming 13 seconds per block)
  const blocksPerYear = (365 * 24 * 60 * 60) / 13;
  const yearlyRewards = this.rewardPerBlock * blocksPerYear * this.multiplier;

  // Simplified APY calculation
  return (yearlyRewards / this.totalStaked) * 100;
};

// Get user info
liquidityMiningSchema.methods.getUserInfo = async function(user, currentBlock) {
  const miner = this.miners.find(m => m.user.toString() === user.toString());
  if (!miner) {
    return null;
  }

  const pendingRewards = await this.getPendingRewards(user, currentBlock);
  const shareOfPool = this.totalStaked > 0 ? (miner.stakedAmount / this.totalStaked) * 100 : 0;

  return {
    stakedAmount: miner.stakedAmount,
    shares: miner.shares,
    pendingRewards,
    totalRewardsClaimed: miner.totalRewardsClaimed,
    shareOfPool,
    joinedAt: miner.joinedAt,
    lastClaimAt: miner.lastClaimAt
  };
};

// Get program statistics
liquidityMiningSchema.methods.getStats = function() {
  const isActive = this.currentBlock >= this.startBlock && this.currentBlock <= this.endBlock;
  const blocksRemaining = Math.max(0, this.endBlock - this.currentBlock);

  return {
    programId: this.programId,
    name: this.name,
    stakingToken: this.stakingToken,
    rewardToken: this.rewardToken,
    totalStaked: this.totalStaked,
    totalMiners: this.miners.length,
    rewardPerBlock: this.rewardPerBlock,
    currentAPY: this.calculateAPY(),
    multiplier: this.multiplier,
    startBlock: this.startBlock,
    endBlock: this.endBlock,
    currentBlock: this.currentBlock,
    blocksRemaining,
    isActive,
    totalRewardsDistributed: this.totalRewardsDistributed,
    lockupPeriod: this.lockupPeriod,
    tier: this.tier,
    active: this.active
  };
};

// Get leaderboard
liquidityMiningSchema.methods.getLeaderboard = function(limit = 10) {
  return this.miners
    .sort((a, b) => b.stakedAmount - a.stakedAmount)
    .slice(0, limit)
    .map((m, index) => ({
      rank: index + 1,
      user: m.user,
      stakedAmount: m.stakedAmount,
      totalRewardsClaimed: m.totalRewardsClaimed,
      shareOfPool: this.totalStaked > 0 ? (m.stakedAmount / this.totalStaked) * 100 : 0,
      joinedAt: m.joinedAt
    }));
};

module.exports = mongoose.model('LiquidityMining', liquidityMiningSchema);
