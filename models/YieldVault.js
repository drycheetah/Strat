const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  shares: {
    type: Number,
    required: true,
    min: 0
  },
  depositedAt: {
    type: Date,
    default: Date.now
  },
  lastCompoundAt: {
    type: Date,
    default: Date.now
  },
  rewardsEarned: {
    type: Number,
    default: 0
  }
});

const yieldVaultSchema = new mongoose.Schema({
  vaultId: {
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
  asset: {
    type: String,
    required: true
  },
  strategy: {
    type: String,
    enum: ['LENDING', 'STAKING', 'LIQUIDITY_MINING', 'YIELD_FARMING', 'COMPOSITE'],
    required: true
  },
  totalDeposits: {
    type: Number,
    default: 0,
    min: 0
  },
  totalShares: {
    type: Number,
    default: 0,
    min: 0
  },
  totalRewards: {
    type: Number,
    default: 0
  },
  sharePrice: {
    type: Number,
    default: 1
  },
  deposits: [depositSchema],
  apy: {
    type: Number,
    default: 0
  },
  performanceFee: {
    type: Number,
    default: 0.1, // 10%
    min: 0,
    max: 0.5
  },
  withdrawalFee: {
    type: Number,
    default: 0.001, // 0.1%
    min: 0,
    max: 0.05
  },
  compoundFrequency: {
    type: Number,
    default: 86400000 // 24 hours in milliseconds
  },
  lastCompoundTime: {
    type: Date,
    default: Date.now
  },
  targetProtocols: [{
    protocol: String,
    allocation: Number, // percentage
    currentYield: Number
  }],
  performanceHistory: [{
    apy: Number,
    totalValue: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  minDeposit: {
    type: Number,
    default: 10
  },
  maxCapacity: {
    type: Number,
    default: 0 // 0 means unlimited
  },
  tvl: {
    type: Number,
    default: 0
  },
  autoCompound: {
    type: Boolean,
    default: true
  },
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Calculate share price
yieldVaultSchema.methods.calculateSharePrice = function() {
  if (this.totalShares === 0) return 1;
  return (this.totalDeposits + this.totalRewards) / this.totalShares;
};

// Deposit to vault
yieldVaultSchema.methods.deposit = async function(user, amount) {
  if (amount < this.minDeposit) {
    throw new Error(`Minimum deposit is ${this.minDeposit}`);
  }

  if (this.maxCapacity > 0 && this.totalDeposits + amount > this.maxCapacity) {
    throw new Error(`Vault at capacity. Maximum: ${this.maxCapacity}`);
  }

  // Calculate shares based on current share price
  const shares = amount / this.sharePrice;

  const deposit = {
    user,
    amount,
    shares,
    depositedAt: new Date(),
    lastCompoundAt: new Date(),
    rewardsEarned: 0
  };

  this.deposits.push(deposit);
  this.totalDeposits += amount;
  this.totalShares += shares;
  this.tvl = this.totalDeposits + this.totalRewards;

  await this.save();
  return { shares, sharePrice: this.sharePrice };
};

// Withdraw from vault
yieldVaultSchema.methods.withdraw = async function(userId, sharesToWithdraw) {
  const userDeposits = this.deposits.filter(d => d.user.toString() === userId.toString());

  if (userDeposits.length === 0) {
    throw new Error('No deposits found');
  }

  const totalUserShares = userDeposits.reduce((sum, d) => sum + d.shares, 0);

  if (sharesToWithdraw > totalUserShares) {
    throw new Error('Insufficient shares');
  }

  // Calculate withdrawal amount based on current share price
  const withdrawalAmount = sharesToWithdraw * this.sharePrice;
  const withdrawalFee = withdrawalAmount * this.withdrawalFee;
  const netWithdrawal = withdrawalAmount - withdrawalFee;

  // Remove shares proportionally from user's deposits
  let sharesRemaining = sharesToWithdraw;
  for (let i = userDeposits.length - 1; i >= 0 && sharesRemaining > 0; i--) {
    const deposit = userDeposits[i];
    const sharesToRemove = Math.min(deposit.shares, sharesRemaining);

    deposit.shares -= sharesToRemove;
    sharesRemaining -= sharesToRemove;

    if (deposit.shares === 0) {
      const depositIndex = this.deposits.findIndex(d => d._id.toString() === deposit._id.toString());
      this.deposits.splice(depositIndex, 1);
    }
  }

  this.totalShares -= sharesToWithdraw;
  this.totalDeposits -= withdrawalAmount;
  this.tvl = this.totalDeposits + this.totalRewards;

  await this.save();
  return {
    withdrawn: netWithdrawal,
    fee: withdrawalFee,
    sharesRedeemed: sharesToWithdraw
  };
};

// Compound rewards
yieldVaultSchema.methods.compound = async function() {
  if (!this.autoCompound) {
    throw new Error('Auto-compound is disabled');
  }

  const now = Date.now();
  const timeSinceLastCompound = now - this.lastCompoundTime.getTime();

  if (timeSinceLastCompound < this.compoundFrequency) {
    return { compounded: false, message: 'Too soon to compound' };
  }

  // Simulate earning rewards based on APY
  const timeInYears = timeSinceLastCompound / (1000 * 60 * 60 * 24 * 365);
  const rewards = this.totalDeposits * (this.apy / 100) * timeInYears;

  const performanceFeeAmount = rewards * this.performanceFee;
  const netRewards = rewards - performanceFeeAmount;

  this.totalRewards += netRewards;
  this.lastCompoundTime = new Date(now);

  // Update share price
  this.sharePrice = this.calculateSharePrice();
  this.tvl = this.totalDeposits + this.totalRewards;

  // Update performance history
  this.performanceHistory.push({
    apy: this.apy,
    totalValue: this.tvl,
    timestamp: new Date()
  });

  // Keep only last 100 records
  if (this.performanceHistory.length > 100) {
    this.performanceHistory = this.performanceHistory.slice(-100);
  }

  await this.save();

  return {
    compounded: true,
    rewards: netRewards,
    performanceFee: performanceFeeAmount,
    newSharePrice: this.sharePrice
  };
};

// Update APY
yieldVaultSchema.methods.updateAPY = async function() {
  // Calculate weighted average APY from target protocols
  if (this.targetProtocols.length === 0) {
    return this.apy;
  }

  const totalAllocation = this.targetProtocols.reduce((sum, p) => sum + p.allocation, 0);

  if (totalAllocation === 0) {
    return this.apy;
  }

  const weightedAPY = this.targetProtocols.reduce((sum, p) => {
    return sum + (p.currentYield * p.allocation / totalAllocation);
  }, 0);

  this.apy = weightedAPY;

  await this.save();
  return this.apy;
};

// Get user position
yieldVaultSchema.methods.getUserPosition = function(userId) {
  const userDeposits = this.deposits.filter(d => d.user.toString() === userId.toString());

  if (userDeposits.length === 0) {
    return null;
  }

  const totalShares = userDeposits.reduce((sum, d) => sum + d.shares, 0);
  const totalValue = totalShares * this.sharePrice;
  const totalDeposited = userDeposits.reduce((sum, d) => sum + d.amount, 0);
  const profit = totalValue - totalDeposited;

  return {
    totalShares,
    totalValue,
    totalDeposited,
    profit,
    roi: totalDeposited > 0 ? (profit / totalDeposited) * 100 : 0,
    deposits: userDeposits.length
  };
};

// Get vault statistics
yieldVaultSchema.methods.getStats = function() {
  return {
    vaultId: this.vaultId,
    name: this.name,
    asset: this.asset,
    strategy: this.strategy,
    tvl: this.tvl,
    totalDeposits: this.totalDeposits,
    totalRewards: this.totalRewards,
    totalShares: this.totalShares,
    sharePrice: this.sharePrice,
    apy: this.apy,
    performanceFee: this.performanceFee,
    withdrawalFee: this.withdrawalFee,
    depositors: this.deposits.length,
    uniqueDepositors: new Set(this.deposits.map(d => d.user.toString())).size,
    lastCompoundTime: this.lastCompoundTime,
    autoCompound: this.autoCompound,
    capacity: this.maxCapacity > 0 ? `${((this.tvl / this.maxCapacity) * 100).toFixed(2)}%` : 'Unlimited',
    active: this.active
  };
};

// Get performance metrics
yieldVaultSchema.methods.getPerformanceMetrics = function(days = 30) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const recentHistory = this.performanceHistory.filter(h => h.timestamp >= cutoffDate);

  if (recentHistory.length < 2) {
    return {
      period: `${days} days`,
      dataPoints: recentHistory.length,
      averageAPY: this.apy,
      growth: 0
    };
  }

  const averageAPY = recentHistory.reduce((sum, h) => sum + h.apy, 0) / recentHistory.length;
  const startValue = recentHistory[0].totalValue;
  const endValue = recentHistory[recentHistory.length - 1].totalValue;
  const growth = startValue > 0 ? ((endValue - startValue) / startValue) * 100 : 0;

  return {
    period: `${days} days`,
    dataPoints: recentHistory.length,
    averageAPY,
    startValue,
    endValue,
    growth,
    volatility: this.calculateVolatility(recentHistory)
  };
};

// Calculate volatility
yieldVaultSchema.methods.calculateVolatility = function(history) {
  if (history.length < 2) return 0;

  const returns = [];
  for (let i = 1; i < history.length; i++) {
    const ret = (history[i].totalValue - history[i - 1].totalValue) / history[i - 1].totalValue;
    returns.push(ret);
  }

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

  return Math.sqrt(variance) * 100; // as percentage
};

module.exports = mongoose.model('YieldVault', yieldVaultSchema);
