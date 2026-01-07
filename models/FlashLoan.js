const mongoose = require('mongoose');

const flashLoanSchema = new mongoose.Schema({
  loanId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  borrower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  asset: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  fee: {
    type: Number,
    required: true,
    min: 0
  },
  feeRate: {
    type: Number,
    default: 0.0009 // 0.09% fee
  },
  status: {
    type: String,
    enum: ['INITIATED', 'EXECUTED', 'REPAID', 'FAILED'],
    default: 'INITIATED'
  },
  executionSteps: [{
    step: Number,
    action: String,
    contract: String,
    parameters: mongoose.Schema.Types.Mixed,
    gasUsed: Number,
    success: Boolean,
    error: String,
    timestamp: { type: Date, default: Date.now }
  }],
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  executedAt: Date,
  repaidAt: Date,
  totalGasUsed: {
    type: Number,
    default: 0
  },
  profit: {
    type: Number,
    default: 0
  },
  blockNumber: Number,
  transactionHash: String,
  error: String
}, { timestamps: true });

const flashLoanPoolSchema = new mongoose.Schema({
  poolId: {
    type: String,
    required: true,
    unique: true
  },
  asset: {
    type: String,
    required: true,
    unique: true
  },
  totalLiquidity: {
    type: Number,
    default: 0,
    min: 0
  },
  availableLiquidity: {
    type: Number,
    default: 0,
    min: 0
  },
  utilizationRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  feeRate: {
    type: Number,
    default: 0.0009, // 0.09%
    min: 0,
    max: 0.1
  },
  totalLoans: {
    type: Number,
    default: 0
  },
  successfulLoans: {
    type: Number,
    default: 0
  },
  failedLoans: {
    type: Number,
    default: 0
  },
  totalFeesCollected: {
    type: Number,
    default: 0
  },
  totalVolumeLoaned: {
    type: Number,
    default: 0
  },
  loans: [flashLoanSchema],
  liquidityProviders: [{
    provider: {
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
      required: true
    },
    feesEarned: {
      type: Number,
      default: 0
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  maxLoanAmount: {
    type: Number,
    default: 0 // 0 means no limit (up to available liquidity)
  },
  minLoanAmount: {
    type: Number,
    default: 1
  },
  paused: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Execute flash loan
flashLoanPoolSchema.methods.executeFlashLoan = async function(borrower, amount, executionSteps) {
  if (this.paused) {
    throw new Error('Flash loan pool is paused');
  }

  if (amount < this.minLoanAmount) {
    throw new Error(`Loan amount must be at least ${this.minLoanAmount}`);
  }

  if (this.maxLoanAmount > 0 && amount > this.maxLoanAmount) {
    throw new Error(`Loan amount exceeds maximum ${this.maxLoanAmount}`);
  }

  if (amount > this.availableLiquidity) {
    throw new Error('Insufficient liquidity');
  }

  const fee = amount * this.feeRate;
  const loanId = `FL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const loan = {
    loanId,
    borrower,
    asset: this.asset,
    amount,
    fee,
    feeRate: this.feeRate,
    status: 'INITIATED',
    executionSteps: [],
    initiatedAt: new Date(),
    totalGasUsed: 0,
    profit: 0
  };

  // Temporarily reduce available liquidity
  this.availableLiquidity -= amount;

  try {
    // Execute each step in the flash loan
    for (let i = 0; i < executionSteps.length; i++) {
      const step = executionSteps[i];

      // Simulate execution (in production, this would interact with smart contracts)
      const executionResult = await this.executeStep(step, amount);

      loan.executionSteps.push({
        step: i + 1,
        action: step.action,
        contract: step.contract,
        parameters: step.parameters,
        gasUsed: executionResult.gasUsed,
        success: executionResult.success,
        error: executionResult.error,
        timestamp: new Date()
      });

      loan.totalGasUsed += executionResult.gasUsed;

      if (!executionResult.success) {
        throw new Error(`Execution step ${i + 1} failed: ${executionResult.error}`);
      }
    }

    // Check repayment
    const repaymentAmount = amount + fee;
    const hasRepayment = await this.verifyRepayment(borrower, repaymentAmount);

    if (!hasRepayment) {
      throw new Error('Flash loan not repaid in same transaction');
    }

    // Successful loan
    loan.status = 'REPAID';
    loan.executedAt = new Date();
    loan.repaidAt = new Date();

    // Calculate profit (simplified)
    loan.profit = fee - (loan.totalGasUsed * 0.0001); // Rough gas cost estimate

    this.availableLiquidity += amount + fee;
    this.totalFeesCollected += fee;
    this.totalVolumeLoaned += amount;
    this.successfulLoans += 1;

    // Distribute fees to liquidity providers
    await this.distributeFees(fee);

  } catch (error) {
    // Failed loan - restore liquidity
    loan.status = 'FAILED';
    loan.error = error.message;
    this.availableLiquidity += amount;
    this.failedLoans += 1;
  }

  this.loans.push(loan);
  this.totalLoans += 1;
  this.updateUtilizationRate();

  await this.save();
  return loan;
};

// Execute a single step (simulated)
flashLoanPoolSchema.methods.executeStep = async function(step, loanAmount) {
  // Simulate execution
  const gasUsed = Math.floor(Math.random() * 100000) + 50000;
  const success = Math.random() > 0.1; // 90% success rate for simulation

  return {
    gasUsed,
    success,
    error: success ? null : 'Execution reverted'
  };
};

// Verify repayment (simulated)
flashLoanPoolSchema.methods.verifyRepayment = async function(borrower, amount) {
  // In production, this would verify the repayment in the same transaction
  // For simulation, we'll return true 95% of the time
  return Math.random() > 0.05;
};

// Add liquidity to pool
flashLoanPoolSchema.methods.addLiquidity = async function(provider, amount) {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  // Calculate shares
  const totalShares = this.liquidityProviders.reduce((sum, lp) => sum + lp.shares, 0);
  let shares;

  if (totalShares === 0) {
    shares = amount; // First provider gets 1:1 shares
  } else {
    shares = (amount / this.totalLiquidity) * totalShares;
  }

  this.liquidityProviders.push({
    provider,
    amount,
    shares,
    feesEarned: 0,
    joinedAt: new Date()
  });

  this.totalLiquidity += amount;
  this.availableLiquidity += amount;
  this.updateUtilizationRate();

  await this.save();
  return { shares, totalLiquidity: this.totalLiquidity };
};

// Remove liquidity from pool
flashLoanPoolSchema.methods.removeLiquidity = async function(providerId) {
  const providerIndex = this.liquidityProviders.findIndex(lp => lp._id.toString() === providerId);
  if (providerIndex === -1) {
    throw new Error('Provider not found');
  }

  const provider = this.liquidityProviders[providerIndex];
  const totalShares = this.liquidityProviders.reduce((sum, lp) => sum + lp.shares, 0);
  const withdrawAmount = (provider.shares / totalShares) * this.availableLiquidity;

  if (withdrawAmount > this.availableLiquidity) {
    throw new Error('Insufficient available liquidity');
  }

  const feesEarned = provider.feesEarned;

  this.totalLiquidity -= withdrawAmount;
  this.availableLiquidity -= withdrawAmount;
  this.liquidityProviders.splice(providerIndex, 1);
  this.updateUtilizationRate();

  await this.save();
  return {
    withdrawn: withdrawAmount,
    feesEarned
  };
};

// Distribute fees to liquidity providers
flashLoanPoolSchema.methods.distributeFees = async function(feeAmount) {
  const totalShares = this.liquidityProviders.reduce((sum, lp) => sum + lp.shares, 0);

  if (totalShares === 0) return;

  for (let provider of this.liquidityProviders) {
    const share = (provider.shares / totalShares) * feeAmount;
    provider.feesEarned += share;
  }
};

// Update utilization rate
flashLoanPoolSchema.methods.updateUtilizationRate = function() {
  if (this.totalLiquidity === 0) {
    this.utilizationRate = 0;
  } else {
    this.utilizationRate = ((this.totalLiquidity - this.availableLiquidity) / this.totalLiquidity) * 100;
  }
};

// Get loan statistics
flashLoanPoolSchema.methods.getLoanStats = function(timeframe = 24) {
  // timeframe in hours
  const cutoffTime = new Date(Date.now() - timeframe * 60 * 60 * 1000);
  const recentLoans = this.loans.filter(l => l.initiatedAt >= cutoffTime);

  const successful = recentLoans.filter(l => l.status === 'REPAID').length;
  const failed = recentLoans.filter(l => l.status === 'FAILED').length;
  const totalVolume = recentLoans.reduce((sum, l) => sum + l.amount, 0);
  const totalFees = recentLoans.filter(l => l.status === 'REPAID').reduce((sum, l) => sum + l.fee, 0);

  return {
    timeframe: `${timeframe}h`,
    totalLoans: recentLoans.length,
    successfulLoans: successful,
    failedLoans: failed,
    successRate: recentLoans.length > 0 ? (successful / recentLoans.length) * 100 : 0,
    totalVolume,
    totalFees,
    averageLoanSize: recentLoans.length > 0 ? totalVolume / recentLoans.length : 0
  };
};

// Get pool statistics
flashLoanPoolSchema.methods.getStats = function() {
  return {
    poolId: this.poolId,
    asset: this.asset,
    totalLiquidity: this.totalLiquidity,
    availableLiquidity: this.availableLiquidity,
    utilizationRate: this.utilizationRate,
    feeRate: this.feeRate,
    totalLoans: this.totalLoans,
    successfulLoans: this.successfulLoans,
    failedLoans: this.failedLoans,
    successRate: this.totalLoans > 0 ? (this.successfulLoans / this.totalLoans) * 100 : 0,
    totalFeesCollected: this.totalFeesCollected,
    totalVolumeLoaned: this.totalVolumeLoaned,
    liquidityProviders: this.liquidityProviders.length,
    averageLoanSize: this.successfulLoans > 0 ? this.totalVolumeLoaned / this.successfulLoans : 0,
    paused: this.paused
  };
};

// Get top borrowers
flashLoanPoolSchema.methods.getTopBorrowers = function(limit = 10) {
  const borrowerStats = {};

  this.loans.forEach(loan => {
    const borrowerId = loan.borrower.toString();
    if (!borrowerStats[borrowerId]) {
      borrowerStats[borrowerId] = {
        borrower: loan.borrower,
        totalLoans: 0,
        successfulLoans: 0,
        totalVolume: 0,
        totalFees: 0,
        totalProfit: 0
      };
    }

    borrowerStats[borrowerId].totalLoans += 1;
    borrowerStats[borrowerId].totalVolume += loan.amount;

    if (loan.status === 'REPAID') {
      borrowerStats[borrowerId].successfulLoans += 1;
      borrowerStats[borrowerId].totalFees += loan.fee;
      borrowerStats[borrowerId].totalProfit += loan.profit || 0;
    }
  });

  return Object.values(borrowerStats)
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .slice(0, limit);
};

// Pause/unpause pool
flashLoanPoolSchema.methods.togglePause = async function() {
  this.paused = !this.paused;
  await this.save();
  return this.paused;
};

module.exports = mongoose.model('FlashLoanPool', flashLoanPoolSchema);
