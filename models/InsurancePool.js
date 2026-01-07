const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
  policyId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  holder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coverageType: {
    type: String,
    enum: ['SMART_CONTRACT', 'EXCHANGE', 'STABLECOIN', 'SLASHING', 'LIQUIDATION', 'GENERAL'],
    required: true
  },
  coveredAmount: {
    type: Number,
    required: true,
    min: 0
  },
  premium: {
    type: Number,
    required: true,
    min: 0
  },
  premiumPaid: {
    type: Number,
    default: 0
  },
  coveragePeriod: {
    type: Number,
    required: true // in days
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  coveredProtocol: String,
  coveredAddress: String,
  status: {
    type: String,
    enum: ['ACTIVE', 'EXPIRED', 'CLAIMED', 'CANCELLED'],
    default: 'ACTIVE'
  },
  claimId: String,
  riskScore: {
    type: Number,
    min: 0,
    max: 100
  }
}, { timestamps: true });

const claimSchema = new mongoose.Schema({
  claimId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  policyId: {
    type: String,
    required: true
  },
  claimant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  claimAmount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true
  },
  evidence: [{
    type: String,
    url: String,
    description: String
  }],
  status: {
    type: String,
    enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'DENIED', 'PAID'],
    default: 'PENDING'
  },
  reviewers: [{
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    decision: {
      type: String,
      enum: ['APPROVE', 'DENY']
    },
    comment: String,
    votedAt: Date
  }],
  approvalVotes: {
    type: Number,
    default: 0
  },
  denialVotes: {
    type: Number,
    default: 0
  },
  payoutAmount: Number,
  paidAt: Date,
  filedAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: Date
});

const insurancePoolSchema = new mongoose.Schema({
  poolName: {
    type: String,
    required: true,
    unique: true
  },
  poolType: {
    type: String,
    enum: ['SMART_CONTRACT', 'EXCHANGE', 'STABLECOIN', 'SLASHING', 'LIQUIDATION', 'GENERAL'],
    required: true
  },
  totalCapital: {
    type: Number,
    default: 0,
    min: 0
  },
  availableCapital: {
    type: Number,
    default: 0,
    min: 0
  },
  totalCoverage: {
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
  capitalProviders: [{
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
      required: true,
      min: 0
    },
    rewardsEarned: {
      type: Number,
      default: 0
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  policies: [policySchema],
  claims: [claimSchema],
  premiumRate: {
    type: Number,
    default: 0.02, // 2% annual premium rate
    min: 0,
    max: 1
  },
  minimumCoverage: {
    type: Number,
    default: 100
  },
  maximumCoverage: {
    type: Number,
    default: 1000000
  },
  coverageRatio: {
    type: Number,
    default: 0.5, // Can cover up to 50% of pool capital
    min: 0,
    max: 1
  },
  claimApprovalThreshold: {
    type: Number,
    default: 0.66 // 66% approval needed
  },
  totalPremiumsCollected: {
    type: Number,
    default: 0
  },
  totalClaimsPaid: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Calculate risk score based on coverage type and protocol
insurancePoolSchema.methods.calculateRiskScore = function(coverageType, protocol) {
  const baseRisk = {
    'SMART_CONTRACT': 60,
    'EXCHANGE': 50,
    'STABLECOIN': 40,
    'SLASHING': 30,
    'LIQUIDATION': 45,
    'GENERAL': 55
  };

  // In production, this would analyze historical data, audits, etc.
  let score = baseRisk[coverageType] || 50;

  // Add randomness to simulate risk analysis
  score += Math.random() * 20 - 10;

  return Math.max(0, Math.min(100, score));
};

// Calculate premium for coverage
insurancePoolSchema.methods.calculatePremium = function(coveredAmount, coveragePeriod, riskScore) {
  // Premium = Coverage Amount * Premium Rate * (Period / 365) * Risk Multiplier
  const riskMultiplier = 0.5 + (riskScore / 100);
  const timeFactor = coveragePeriod / 365;
  const premium = coveredAmount * this.premiumRate * timeFactor * riskMultiplier;

  return premium;
};

// Purchase insurance policy
insurancePoolSchema.methods.purchasePolicy = async function(holder, coverageType, coveredAmount, coveragePeriod, coveredProtocol = '', coveredAddress = '') {
  if (coveredAmount < this.minimumCoverage) {
    throw new Error(`Coverage amount must be at least ${this.minimumCoverage}`);
  }

  if (coveredAmount > this.maximumCoverage) {
    throw new Error(`Coverage amount cannot exceed ${this.maximumCoverage}`);
  }

  const maxCoverageAvailable = this.availableCapital * this.coverageRatio;
  if (coveredAmount > maxCoverageAvailable) {
    throw new Error(`Insufficient pool capacity. Maximum available: ${maxCoverageAvailable}`);
  }

  const riskScore = this.calculateRiskScore(coverageType, coveredProtocol);
  const premium = this.calculatePremium(coveredAmount, coveragePeriod, riskScore);

  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + coveragePeriod * 24 * 60 * 60 * 1000);

  const policyId = `POLICY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const policy = {
    policyId,
    holder,
    coverageType,
    coveredAmount,
    premium,
    premiumPaid: premium,
    coveragePeriod,
    startDate,
    endDate,
    coveredProtocol,
    coveredAddress,
    status: 'ACTIVE',
    riskScore
  };

  this.policies.push(policy);
  this.totalCoverage += coveredAmount;
  this.totalPremiumsCollected += premium;
  this.updateUtilizationRate();

  // Distribute premium to capital providers
  await this.distributePremium(premium);

  await this.save();
  return policy;
};

// Provide capital to pool
insurancePoolSchema.methods.provideCapital = async function(provider, amount) {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  // Calculate shares based on current pool value
  const totalShares = this.capitalProviders.reduce((sum, cp) => sum + cp.shares, 0);
  let shares;

  if (totalShares === 0) {
    shares = amount; // First provider gets 1:1 shares
  } else {
    shares = (amount / this.totalCapital) * totalShares;
  }

  this.capitalProviders.push({
    provider,
    amount,
    shares,
    rewardsEarned: 0,
    joinedAt: new Date()
  });

  this.totalCapital += amount;
  this.availableCapital += amount;
  this.updateUtilizationRate();

  await this.save();
  return { shares, totalCapital: this.totalCapital };
};

// Withdraw capital from pool
insurancePoolSchema.methods.withdrawCapital = async function(providerId) {
  const providerIndex = this.capitalProviders.findIndex(cp => cp._id.toString() === providerId);
  if (providerIndex === -1) {
    throw new Error('Provider not found');
  }

  const provider = this.capitalProviders[providerIndex];
  const totalShares = this.capitalProviders.reduce((sum, cp) => sum + cp.shares, 0);
  const withdrawalAmount = (provider.shares / totalShares) * this.availableCapital;

  if (withdrawalAmount > this.availableCapital) {
    throw new Error('Insufficient available capital');
  }

  this.totalCapital -= withdrawalAmount;
  this.availableCapital -= withdrawalAmount;
  this.capitalProviders.splice(providerIndex, 1);
  this.updateUtilizationRate();

  await this.save();
  return {
    withdrawn: withdrawalAmount,
    rewards: provider.rewardsEarned
  };
};

// File a claim
insurancePoolSchema.methods.fileClaim = async function(policyId, claimant, claimAmount, description, evidence = []) {
  const policy = this.policies.find(p => p.policyId === policyId);
  if (!policy) {
    throw new Error('Policy not found');
  }

  if (policy.status !== 'ACTIVE') {
    throw new Error('Policy is not active');
  }

  if (policy.holder.toString() !== claimant.toString()) {
    throw new Error('Only policy holder can file claim');
  }

  const now = new Date();
  if (now < policy.startDate || now > policy.endDate) {
    throw new Error('Policy is not in coverage period');
  }

  if (claimAmount > policy.coveredAmount) {
    throw new Error('Claim amount exceeds coverage');
  }

  const claimId = `CLAIM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const claim = {
    claimId,
    policyId,
    claimant,
    claimAmount,
    description,
    evidence,
    status: 'PENDING',
    reviewers: [],
    approvalVotes: 0,
    denialVotes: 0,
    filedAt: new Date()
  };

  this.claims.push(claim);
  policy.claimId = claimId;

  await this.save();
  return claim;
};

// Review a claim
insurancePoolSchema.methods.reviewClaim = async function(claimId, reviewer, decision, comment = '') {
  const claim = this.claims.find(c => c.claimId === claimId);
  if (!claim) {
    throw new Error('Claim not found');
  }

  if (claim.status !== 'PENDING' && claim.status !== 'UNDER_REVIEW') {
    throw new Error('Claim is not under review');
  }

  // Check if reviewer already voted
  const existingVote = claim.reviewers.find(r => r.reviewer.toString() === reviewer.toString());
  if (existingVote) {
    throw new Error('Reviewer has already voted');
  }

  claim.reviewers.push({
    reviewer,
    decision,
    comment,
    votedAt: new Date()
  });

  if (decision === 'APPROVE') {
    claim.approvalVotes += 1;
  } else {
    claim.denialVotes += 1;
  }

  claim.status = 'UNDER_REVIEW';

  // Check if threshold reached
  const totalVotes = claim.approvalVotes + claim.denialVotes;
  const approvalRate = claim.approvalVotes / totalVotes;

  if (totalVotes >= 3) { // Minimum 3 votes
    if (approvalRate >= this.claimApprovalThreshold) {
      await this.approveClaim(claimId);
    } else {
      await this.denyClaim(claimId);
    }
  }

  await this.save();
  return claim;
};

// Approve claim
insurancePoolSchema.methods.approveClaim = async function(claimId) {
  const claim = this.claims.find(c => c.claimId === claimId);
  if (!claim) {
    throw new Error('Claim not found');
  }

  claim.status = 'APPROVED';
  claim.resolvedAt = new Date();

  await this.payClaim(claimId);
};

// Deny claim
insurancePoolSchema.methods.denyClaim = async function(claimId) {
  const claim = this.claims.find(c => c.claimId === claimId);
  if (!claim) {
    throw new Error('Claim not found');
  }

  claim.status = 'DENIED';
  claim.resolvedAt = new Date();

  // Reset policy claim ID
  const policy = this.policies.find(p => p.policyId === claim.policyId);
  if (policy) {
    policy.claimId = null;
  }

  await this.save();
};

// Pay approved claim
insurancePoolSchema.methods.payClaim = async function(claimId) {
  const claim = this.claims.find(c => c.claimId === claimId);
  if (!claim) {
    throw new Error('Claim not found');
  }

  if (claim.status !== 'APPROVED') {
    throw new Error('Claim is not approved');
  }

  if (claim.claimAmount > this.availableCapital) {
    throw new Error('Insufficient pool capital');
  }

  const policy = this.policies.find(p => p.policyId === claim.policyId);
  if (policy) {
    policy.status = 'CLAIMED';
  }

  claim.status = 'PAID';
  claim.payoutAmount = claim.claimAmount;
  claim.paidAt = new Date();

  this.availableCapital -= claim.claimAmount;
  this.totalCoverage -= policy ? policy.coveredAmount : 0;
  this.totalClaimsPaid += claim.claimAmount;
  this.updateUtilizationRate();

  await this.save();
  return { payoutAmount: claim.claimAmount };
};

// Distribute premium to capital providers
insurancePoolSchema.methods.distributePremium = async function(premiumAmount) {
  const totalShares = this.capitalProviders.reduce((sum, cp) => sum + cp.shares, 0);

  if (totalShares === 0) return;

  for (let provider of this.capitalProviders) {
    const share = (provider.shares / totalShares) * premiumAmount;
    provider.rewardsEarned += share;
  }

  this.availableCapital += premiumAmount;
};

// Update utilization rate
insurancePoolSchema.methods.updateUtilizationRate = function() {
  if (this.totalCapital === 0) {
    this.utilizationRate = 0;
  } else {
    this.utilizationRate = ((this.totalCapital - this.availableCapital) / this.totalCapital) * 100;
  }
};

// Expire policies
insurancePoolSchema.methods.expirePolicies = async function() {
  const now = new Date();
  let expiredCount = 0;

  for (let policy of this.policies) {
    if (policy.status === 'ACTIVE' && now >= policy.endDate) {
      policy.status = 'EXPIRED';
      this.totalCoverage -= policy.coveredAmount;
      expiredCount++;
    }
  }

  if (expiredCount > 0) {
    this.updateUtilizationRate();
    await this.save();
  }

  return expiredCount;
};

// Get pool statistics
insurancePoolSchema.methods.getStats = function() {
  const activePolicies = this.policies.filter(p => p.status === 'ACTIVE');
  const pendingClaims = this.claims.filter(c => c.status === 'PENDING' || c.status === 'UNDER_REVIEW');

  return {
    poolName: this.poolName,
    poolType: this.poolType,
    totalCapital: this.totalCapital,
    availableCapital: this.availableCapital,
    totalCoverage: this.totalCoverage,
    utilizationRate: this.utilizationRate,
    activePolicies: activePolicies.length,
    totalPolicies: this.policies.length,
    pendingClaims: pendingClaims.length,
    totalClaims: this.claims.length,
    totalPremiumsCollected: this.totalPremiumsCollected,
    totalClaimsPaid: this.totalClaimsPaid,
    profitLoss: this.totalPremiumsCollected - this.totalClaimsPaid,
    capitalProviders: this.capitalProviders.length,
    premiumRate: this.premiumRate,
    coverageRatio: this.coverageRatio
  };
};

module.exports = mongoose.model('InsurancePool', insurancePoolSchema);
