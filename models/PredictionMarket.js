const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  outcome: {
    type: String,
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
  averagePrice: {
    type: Number,
    required: true
  },
  placedAt: {
    type: Date,
    default: Date.now
  },
  claimed: {
    type: Boolean,
    default: false
  },
  payout: {
    type: Number,
    default: 0
  }
});

const predictionMarketSchema = new mongoose.Schema({
  marketId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  question: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['CRYPTO', 'SPORTS', 'POLITICS', 'FINANCE', 'ENTERTAINMENT', 'OTHER'],
    required: true
  },
  marketType: {
    type: String,
    enum: ['BINARY', 'CATEGORICAL', 'SCALAR'],
    default: 'BINARY'
  },
  outcomes: [{
    name: {
      type: String,
      required: true
    },
    totalShares: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      default: 0.5 // Start at 50% for binary markets
    }
  }],
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resolver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  oracleAddress: String,
  totalLiquidity: {
    type: Number,
    default: 0
  },
  totalVolume: {
    type: Number,
    default: 0
  },
  bets: [betSchema],
  status: {
    type: String,
    enum: ['OPEN', 'CLOSED', 'RESOLVED', 'CANCELLED'],
    default: 'OPEN'
  },
  resolutionSource: String,
  winningOutcome: String,
  resolvedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  closingTime: {
    type: Date,
    required: true
  },
  resolutionTime: Date,
  minBet: {
    type: Number,
    default: 1
  },
  maxBet: {
    type: Number,
    default: 10000
  },
  fee: {
    type: Number,
    default: 0.02 // 2% fee
  },
  creatorFee: {
    type: Number,
    default: 0.01 // 1% to creator
  },
  liquidityProviders: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    amount: Number,
    shares: Number,
    addedAt: { type: Date, default: Date.now }
  }],
  priceHistory: [{
    outcome: String,
    price: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  tags: [String],
  featured: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Calculate outcome prices using LMSR (Logarithmic Market Scoring Rule)
predictionMarketSchema.methods.calculatePricesLMSR = function(b = 100) {
  // b is the liquidity parameter
  const outcomes = this.outcomes;
  const totalExp = outcomes.reduce((sum, outcome) => {
    return sum + Math.exp(outcome.totalShares / b);
  }, 0);

  outcomes.forEach(outcome => {
    outcome.price = Math.exp(outcome.totalShares / b) / totalExp;
  });

  return outcomes;
};

// Calculate cost for buying shares using LMSR
predictionMarketSchema.methods.calculateBuyCost = function(outcomeName, sharesToBuy, b = 100) {
  const outcome = this.outcomes.find(o => o.name === outcomeName);
  if (!outcome) {
    throw new Error('Outcome not found');
  }

  const currentShares = outcome.totalShares;
  const newShares = currentShares + sharesToBuy;

  const currentCost = b * Math.log(this.outcomes.reduce((sum, o) => {
    return sum + Math.exp(o.totalShares / b);
  }, 0));

  const newCost = b * Math.log(this.outcomes.reduce((sum, o) => {
    if (o.name === outcomeName) {
      return sum + Math.exp(newShares / b);
    }
    return sum + Math.exp(o.totalShares / b);
  }, 0));

  return newCost - currentCost;
};

// Place a bet
predictionMarketSchema.methods.placeBet = async function(user, outcomeName, amount) {
  if (this.status !== 'OPEN') {
    throw new Error('Market is not open for betting');
  }

  if (Date.now() >= this.closingTime.getTime()) {
    throw new Error('Market has closed');
  }

  if (amount < this.minBet || amount > this.maxBet) {
    throw new Error(`Bet amount must be between ${this.minBet} and ${this.maxBet}`);
  }

  const outcome = this.outcomes.find(o => o.name === outcomeName);
  if (!outcome) {
    throw new Error('Invalid outcome');
  }

  // Calculate shares using constant product formula for simplicity
  // In production, use LMSR or other AMM
  const sharesToReceive = amount / (outcome.price || 0.5);

  const fee = amount * this.fee;
  const creatorFee = amount * this.creatorFee;
  const netAmount = amount - fee - creatorFee;

  const bet = {
    user,
    outcome: outcomeName,
    amount,
    shares: sharesToReceive,
    averagePrice: amount / sharesToReceive,
    placedAt: new Date(),
    claimed: false
  };

  this.bets.push(bet);

  outcome.totalShares += sharesToReceive;
  outcome.totalAmount += netAmount;

  // Update prices based on new share distribution
  this.updatePrices();

  this.totalVolume += amount;
  this.totalLiquidity += netAmount;

  // Record price history
  this.priceHistory.push({
    outcome: outcomeName,
    price: outcome.price,
    timestamp: new Date()
  });

  await this.save();
  return bet;
};

// Update outcome prices
predictionMarketSchema.methods.updatePrices = function() {
  const totalShares = this.outcomes.reduce((sum, o) => sum + o.totalShares, 0);

  if (totalShares === 0) {
    this.outcomes.forEach(o => {
      o.price = 1 / this.outcomes.length;
    });
  } else {
    this.outcomes.forEach(outcome => {
      outcome.price = outcome.totalShares / totalShares;
    });
  }
};

// Close market for new bets
predictionMarketSchema.methods.closeMarket = async function() {
  if (this.status !== 'OPEN') {
    throw new Error('Market is not open');
  }

  this.status = 'CLOSED';
  await this.save();
};

// Resolve market with winning outcome
predictionMarketSchema.methods.resolveMarket = async function(winningOutcome, resolutionSource = '') {
  if (this.status !== 'CLOSED' && this.status !== 'OPEN') {
    throw new Error('Market must be open or closed to resolve');
  }

  const outcome = this.outcomes.find(o => o.name === winningOutcome);
  if (!outcome) {
    throw new Error('Invalid winning outcome');
  }

  this.status = 'RESOLVED';
  this.winningOutcome = winningOutcome;
  this.resolvedAt = new Date();
  this.resolutionSource = resolutionSource;

  // Calculate payouts for winning bets
  const winningBets = this.bets.filter(b => b.outcome === winningOutcome);
  const totalWinningShares = winningBets.reduce((sum, b) => sum + b.shares, 0);

  if (totalWinningShares > 0) {
    const payoutPerShare = this.totalLiquidity / totalWinningShares;

    for (let bet of this.bets) {
      if (bet.outcome === winningOutcome) {
        bet.payout = bet.shares * payoutPerShare;
      } else {
        bet.payout = 0;
      }
    }
  }

  await this.save();
  return {
    winningOutcome,
    totalPayout: this.totalLiquidity,
    winningBets: winningBets.length
  };
};

// Cancel market and refund all bets
predictionMarketSchema.methods.cancelMarket = async function(reason = '') {
  if (this.status === 'RESOLVED') {
    throw new Error('Cannot cancel resolved market');
  }

  this.status = 'CANCELLED';

  // Set refunds for all bets
  for (let bet of this.bets) {
    bet.payout = bet.amount; // Full refund
  }

  await this.save();
  return {
    refundedBets: this.bets.length,
    totalRefunded: this.bets.reduce((sum, b) => sum + b.amount, 0),
    reason
  };
};

// Claim winnings for a user
predictionMarketSchema.methods.claimWinnings = async function(userId) {
  if (this.status !== 'RESOLVED' && this.status !== 'CANCELLED') {
    throw new Error('Market must be resolved or cancelled to claim');
  }

  const userBets = this.bets.filter(b =>
    b.user.toString() === userId.toString() && !b.claimed && b.payout > 0
  );

  if (userBets.length === 0) {
    throw new Error('No winnings to claim');
  }

  let totalPayout = 0;
  for (let bet of userBets) {
    bet.claimed = true;
    totalPayout += bet.payout;
  }

  await this.save();
  return {
    totalPayout,
    betsClaimed: userBets.length
  };
};

// Add liquidity to market
predictionMarketSchema.methods.addLiquidity = async function(user, amount) {
  if (this.status !== 'OPEN') {
    throw new Error('Market is not open');
  }

  const shares = amount; // 1:1 for simplicity

  this.liquidityProviders.push({
    user,
    amount,
    shares,
    addedAt: new Date()
  });

  this.totalLiquidity += amount;

  await this.save();
  return { shares };
};

// Get user bets
predictionMarketSchema.methods.getUserBets = function(userId) {
  return this.bets.filter(b => b.user.toString() === userId.toString());
};

// Get market statistics
predictionMarketSchema.methods.getStats = function() {
  const now = Date.now();
  const timeUntilClose = this.closingTime.getTime() - now;

  return {
    marketId: this.marketId,
    question: this.question,
    category: this.category,
    marketType: this.marketType,
    outcomes: this.outcomes.map(o => ({
      name: o.name,
      price: o.price,
      probability: (o.price * 100).toFixed(2) + '%',
      totalAmount: o.totalAmount,
      totalShares: o.totalShares
    })),
    totalVolume: this.totalVolume,
    totalLiquidity: this.totalLiquidity,
    totalBets: this.bets.length,
    status: this.status,
    winningOutcome: this.winningOutcome,
    timeUntilClose: timeUntilClose > 0 ? timeUntilClose : 0,
    closingTime: this.closingTime,
    resolvedAt: this.resolvedAt,
    featured: this.featured,
    uniqueBettors: new Set(this.bets.map(b => b.user.toString())).size
  };
};

// Get leaderboard for this market
predictionMarketSchema.methods.getLeaderboard = function() {
  const userStats = {};

  this.bets.forEach(bet => {
    const userId = bet.user.toString();
    if (!userStats[userId]) {
      userStats[userId] = {
        user: bet.user,
        totalBet: 0,
        totalShares: 0,
        potentialPayout: 0,
        betsCount: 0
      };
    }

    userStats[userId].totalBet += bet.amount;
    userStats[userId].totalShares += bet.shares;
    userStats[userId].potentialPayout += bet.payout || 0;
    userStats[userId].betsCount += 1;
  });

  return Object.values(userStats)
    .sort((a, b) => b.potentialPayout - a.potentialPayout)
    .slice(0, 10);
};

module.exports = mongoose.model('PredictionMarket', predictionMarketSchema);
