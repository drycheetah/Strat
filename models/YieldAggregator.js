const mongoose = require('mongoose');

const strategySchema = new mongoose.Schema({
  strategyId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['LENDING', 'STAKING', 'LIQUIDITY_MINING', 'YIELD_FARMING', 'ARBITRAGE', 'DELTA_NEUTRAL'],
    required: true
  },
  protocol: {
    type: String,
    required: true
  },
  asset: {
    type: String,
    required: true
  },
  currentAPY: {
    type: Number,
    default: 0
  },
  historicalAPY: [{
    apy: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  tvl: {
    type: Number,
    default: 0
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  allocatedAmount: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const yieldAggregatorSchema = new mongoose.Schema({
  aggregatorId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  asset: {
    type: String,
    required: true
  },
  strategies: [strategySchema],
  totalDeposits: {
    type: Number,
    default: 0
  },
  totalAllocated: {
    type: Number,
    default: 0
  },
  unallocatedFunds: {
    type: Number,
    default: 0
  },
  weightedAPY: {
    type: Number,
    default: 0
  },
  rebalanceThreshold: {
    type: Number,
    default: 0.05 // 5% APY difference triggers rebalance
  },
  lastRebalance: {
    type: Date,
    default: Date.now
  },
  rebalanceFrequency: {
    type: Number,
    default: 86400000 // 24 hours
  },
  maxStrategies: {
    type: Number,
    default: 10
  },
  minAllocationPerStrategy: {
    type: Number,
    default: 0.05 // 5% minimum
  },
  autoRebalance: {
    type: Boolean,
    default: true
  },
  riskTolerance: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'MEDIUM'
  },
  performanceHistory: [{
    weightedAPY: Number,
    totalValue: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  users: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    depositedAmount: Number,
    shares: Number,
    joinedAt: { type: Date, default: Date.now }
  }],
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Add strategy to aggregator
yieldAggregatorSchema.methods.addStrategy = async function(strategyData) {
  if (this.strategies.length >= this.maxStrategies) {
    throw new Error(`Maximum ${this.maxStrategies} strategies allowed`);
  }

  const exists = this.strategies.find(s => s.protocol === strategyData.protocol && s.type === strategyData.type);
  if (exists) {
    throw new Error('Strategy already exists');
  }

  const strategyId = `STRAT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const strategy = {
    strategyId,
    name: strategyData.name,
    type: strategyData.type,
    protocol: strategyData.protocol,
    asset: strategyData.asset,
    currentAPY: strategyData.currentAPY || 0,
    historicalAPY: [],
    tvl: strategyData.tvl || 0,
    riskScore: strategyData.riskScore || 50,
    allocatedAmount: 0,
    active: true
  };

  this.strategies.push(strategy);

  await this.save();
  return strategy;
};

// Remove strategy
yieldAggregatorSchema.methods.removeStrategy = async function(strategyId) {
  const strategyIndex = this.strategies.findIndex(s => s.strategyId === strategyId);
  if (strategyIndex === -1) {
    throw new Error('Strategy not found');
  }

  const strategy = this.strategies[strategyIndex];

  if (strategy.allocatedAmount > 0) {
    throw new Error('Cannot remove strategy with allocated funds');
  }

  this.strategies.splice(strategyIndex, 1);

  await this.save();
};

// Update strategy APY
yieldAggregatorSchema.methods.updateStrategyAPY = async function(strategyId, newAPY) {
  const strategy = this.strategies.find(s => s.strategyId === strategyId);
  if (!strategy) {
    throw new Error('Strategy not found');
  }

  strategy.currentAPY = newAPY;
  strategy.historicalAPY.push({
    apy: newAPY,
    timestamp: new Date()
  });

  // Keep only last 100 APY records
  if (strategy.historicalAPY.length > 100) {
    strategy.historicalAPY = strategy.historicalAPY.slice(-100);
  }

  this.calculateWeightedAPY();

  await this.save();
};

// Calculate weighted APY across all strategies
yieldAggregatorSchema.methods.calculateWeightedAPY = function() {
  if (this.totalAllocated === 0) {
    this.weightedAPY = 0;
    return 0;
  }

  const weighted = this.strategies.reduce((sum, strategy) => {
    if (!strategy.active) return sum;
    const weight = strategy.allocatedAmount / this.totalAllocated;
    return sum + (strategy.currentAPY * weight);
  }, 0);

  this.weightedAPY = weighted;
  return weighted;
};

// Optimize allocation across strategies
yieldAggregatorSchema.methods.optimizeAllocation = function() {
  const activeStrategies = this.strategies.filter(s => s.active);

  if (activeStrategies.length === 0) {
    return [];
  }

  // Filter strategies by risk tolerance
  const riskThresholds = {
    'LOW': 40,
    'MEDIUM': 70,
    'HIGH': 100
  };

  const suitableStrategies = activeStrategies.filter(s =>
    s.riskScore <= riskThresholds[this.riskTolerance]
  );

  if (suitableStrategies.length === 0) {
    return [];
  }

  // Sort by APY descending
  suitableStrategies.sort((a, b) => b.currentAPY - a.currentAPY);

  const totalFunds = this.totalDeposits;
  const allocations = [];

  // Allocate to top strategies with minimum allocation constraint
  let remainingFunds = totalFunds;
  const strategiesUsed = Math.min(suitableStrategies.length, this.maxStrategies);

  for (let i = 0; i < strategiesUsed; i++) {
    const strategy = suitableStrategies[i];
    let allocation;

    if (i === strategiesUsed - 1) {
      // Last strategy gets remaining funds
      allocation = remainingFunds;
    } else {
      // Allocate proportionally based on APY and risk
      const apyWeight = strategy.currentAPY / suitableStrategies[0].currentAPY;
      const riskAdjustment = 1 - (strategy.riskScore / 100);
      const weight = apyWeight * riskAdjustment;

      allocation = Math.max(totalFunds * this.minAllocationPerStrategy, totalFunds * weight / strategiesUsed);
      allocation = Math.min(allocation, remainingFunds);
    }

    allocations.push({
      strategyId: strategy.strategyId,
      protocol: strategy.protocol,
      allocation,
      percentage: (allocation / totalFunds) * 100,
      expectedAPY: strategy.currentAPY
    });

    remainingFunds -= allocation;
  }

  return allocations;
};

// Rebalance funds across strategies
yieldAggregatorSchema.methods.rebalance = async function() {
  const now = Date.now();
  const timeSinceRebalance = now - this.lastRebalance.getTime();

  if (timeSinceRebalance < this.rebalanceFrequency && this.autoRebalance) {
    return { rebalanced: false, message: 'Too soon to rebalance' };
  }

  const optimalAllocations = this.optimizeAllocation();

  if (optimalAllocations.length === 0) {
    return { rebalanced: false, message: 'No suitable strategies' };
  }

  // Reset current allocations
  this.strategies.forEach(s => s.allocatedAmount = 0);
  this.totalAllocated = 0;

  // Apply new allocations
  for (const allocation of optimalAllocations) {
    const strategy = this.strategies.find(s => s.strategyId === allocation.strategyId);
    if (strategy) {
      strategy.allocatedAmount = allocation.allocation;
      this.totalAllocated += allocation.allocation;
    }
  }

  this.unallocatedFunds = this.totalDeposits - this.totalAllocated;
  this.lastRebalance = new Date(now);
  this.calculateWeightedAPY();

  // Update performance history
  this.performanceHistory.push({
    weightedAPY: this.weightedAPY,
    totalValue: this.totalDeposits,
    timestamp: new Date()
  });

  // Keep only last 100 records
  if (this.performanceHistory.length > 100) {
    this.performanceHistory = this.performanceHistory.slice(-100);
  }

  await this.save();

  return {
    rebalanced: true,
    allocations: optimalAllocations,
    weightedAPY: this.weightedAPY,
    unallocatedFunds: this.unallocatedFunds
  };
};

// Check if rebalance is needed
yieldAggregatorSchema.methods.shouldRebalance = function() {
  const currentOptimal = this.optimizeAllocation();

  if (currentOptimal.length === 0) return false;

  // Check if APY difference exceeds threshold
  for (const optimal of currentOptimal) {
    const strategy = this.strategies.find(s => s.strategyId === optimal.strategyId);
    if (!strategy) continue;

    const currentAllocation = strategy.allocatedAmount;
    const optimalAllocation = optimal.allocation;
    const difference = Math.abs(optimalAllocation - currentAllocation);

    if (difference / this.totalDeposits > this.rebalanceThreshold) {
      return true;
    }
  }

  return false;
};

// Deposit to aggregator
yieldAggregatorSchema.methods.deposit = async function(user, amount) {
  const userIndex = this.users.findIndex(u => u.user.toString() === user.toString());

  if (userIndex === -1) {
    this.users.push({
      user,
      depositedAmount: amount,
      shares: amount, // Simplified share calculation
      joinedAt: new Date()
    });
  } else {
    this.users[userIndex].depositedAmount += amount;
    this.users[userIndex].shares += amount;
  }

  this.totalDeposits += amount;
  this.unallocatedFunds += amount;

  await this.save();

  // Trigger rebalance if needed
  if (this.shouldRebalance()) {
    await this.rebalance();
  }

  return { totalDeposits: this.totalDeposits, weightedAPY: this.weightedAPY };
};

// Withdraw from aggregator
yieldAggregatorSchema.methods.withdraw = async function(user, amount) {
  const userIndex = this.users.findIndex(u => u.user.toString() === user.toString());

  if (userIndex === -1) {
    throw new Error('User not found');
  }

  const userAccount = this.users[userIndex];

  if (amount > userAccount.depositedAmount) {
    throw new Error('Insufficient balance');
  }

  userAccount.depositedAmount -= amount;
  userAccount.shares -= amount; // Simplified

  if (userAccount.depositedAmount === 0) {
    this.users.splice(userIndex, 1);
  }

  this.totalDeposits -= amount;

  // Withdraw from unallocated first, then from strategies
  if (this.unallocatedFunds >= amount) {
    this.unallocatedFunds -= amount;
  } else {
    const needToWithdraw = amount - this.unallocatedFunds;
    this.unallocatedFunds = 0;

    // Withdraw proportionally from strategies
    for (const strategy of this.strategies) {
      if (needToWithdraw <= 0) break;

      const withdrawFromStrategy = Math.min(strategy.allocatedAmount, needToWithdraw);
      strategy.allocatedAmount -= withdrawFromStrategy;
      this.totalAllocated -= withdrawFromStrategy;
    }
  }

  this.calculateWeightedAPY();

  await this.save();

  return { withdrawn: amount, remainingBalance: userAccount.depositedAmount };
};

// Get aggregator statistics
yieldAggregatorSchema.methods.getStats = function() {
  const activeStrategies = this.strategies.filter(s => s.active);

  return {
    aggregatorId: this.aggregatorId,
    name: this.name,
    asset: this.asset,
    totalDeposits: this.totalDeposits,
    totalAllocated: this.totalAllocated,
    unallocatedFunds: this.unallocatedFunds,
    weightedAPY: this.weightedAPY,
    strategiesCount: activeStrategies.length,
    users: this.users.length,
    lastRebalance: this.lastRebalance,
    riskTolerance: this.riskTolerance,
    autoRebalance: this.autoRebalance,
    topStrategy: activeStrategies.length > 0
      ? activeStrategies.reduce((top, s) => s.currentAPY > top.currentAPY ? s : top)
      : null
  };
};

// Get best strategies
yieldAggregatorSchema.methods.getBestStrategies = function(limit = 5) {
  return this.strategies
    .filter(s => s.active)
    .sort((a, b) => b.currentAPY - a.currentAPY)
    .slice(0, limit)
    .map(s => ({
      name: s.name,
      protocol: s.protocol,
      type: s.type,
      currentAPY: s.currentAPY,
      riskScore: s.riskScore,
      allocatedAmount: s.allocatedAmount,
      tvl: s.tvl
    }));
};

module.exports = mongoose.model('YieldAggregator', yieldAggregatorSchema);
