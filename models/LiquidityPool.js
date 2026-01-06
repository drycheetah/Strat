const mongoose = require('mongoose');

const liquidityPoolSchema = new mongoose.Schema({
  // Pool reserves
  solReserve: {
    type: Number,
    required: true,
    default: 0
  },
  stratReserve: {
    type: Number,
    required: true,
    default: 0
  },

  // Liquidity provider tokens
  totalLPTokens: {
    type: Number,
    default: 0
  },

  // Pool statistics
  volume24h: {
    type: Number,
    default: 0
  },
  trades24h: {
    type: Number,
    default: 0
  },

  // Fee settings (0.3% standard)
  feePercent: {
    type: Number,
    default: 0.3
  },

  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Get current pool (singleton pattern)
liquidityPoolSchema.statics.getPool = async function() {
  let pool = await this.findOne();
  if (!pool) {
    // Initialize with starting liquidity
    // 10 SOL : 100 STRAT (1 SOL = 10 STRAT starting price)
    pool = await this.create({
      solReserve: parseFloat(process.env.INITIAL_SOL_RESERVE) || 10,
      stratReserve: parseFloat(process.env.INITIAL_STRAT_RESERVE) || 100,
      totalLPTokens: 31.622776601683793 // sqrt(10 * 100)
    });
  }
  return pool;
};

// Calculate current price (STRAT in terms of SOL)
liquidityPoolSchema.methods.getPrice = function() {
  if (this.stratReserve === 0) return 0;
  return this.solReserve / this.stratReserve;
};

// Calculate current price in USD (assuming SOL price)
liquidityPoolSchema.methods.getPriceUSD = function(solPriceUSD = 140) {
  const stratPerSol = this.stratReserve / this.solReserve;
  return solPriceUSD / stratPerSol;
};

// Calculate amount out using constant product formula: x * y = k
// Includes 0.3% fee
liquidityPoolSchema.methods.getAmountOut = function(amountIn, isSOLInput) {
  const feeMultiplier = 1 - (this.feePercent / 100);
  const amountInWithFee = amountIn * feeMultiplier;

  if (isSOLInput) {
    // SOL -> STRAT
    const newSolReserve = this.solReserve + amountInWithFee;
    const k = this.solReserve * this.stratReserve;
    const newStratReserve = k / newSolReserve;
    return this.stratReserve - newStratReserve;
  } else {
    // STRAT -> SOL
    const newStratReserve = this.stratReserve + amountInWithFee;
    const k = this.solReserve * this.stratReserve;
    const newSolReserve = k / newStratReserve;
    return this.solReserve - newSolReserve;
  }
};

// Execute swap
liquidityPoolSchema.methods.swap = async function(amountIn, isSOLInput, minAmountOut) {
  const amountOut = this.getAmountOut(amountIn, isSOLInput);

  // Slippage protection
  if (amountOut < minAmountOut) {
    throw new Error(`Slippage too high. Expected ${minAmountOut}, got ${amountOut}`);
  }

  const feeMultiplier = 1 - (this.feePercent / 100);
  const amountInWithFee = amountIn * feeMultiplier;

  if (isSOLInput) {
    this.solReserve += amountInWithFee;
    this.stratReserve -= amountOut;
  } else {
    this.stratReserve += amountInWithFee;
    this.solReserve -= amountOut;
  }

  this.volume24h += isSOLInput ? amountIn : amountOut;
  this.trades24h += 1;
  this.lastUpdated = Date.now();

  await this.save();

  return {
    amountIn,
    amountOut,
    newPrice: this.getPrice(),
    solReserve: this.solReserve,
    stratReserve: this.stratReserve
  };
};

// Add liquidity
liquidityPoolSchema.methods.addLiquidity = async function(solAmount, stratAmount) {
  const currentRatio = this.solReserve / this.stratReserve;
  const providedRatio = solAmount / stratAmount;

  // Check if ratio matches (with 1% tolerance for first liquidity)
  if (this.totalLPTokens > 0 && Math.abs(currentRatio - providedRatio) / currentRatio > 0.01) {
    throw new Error('Liquidity must be added in current pool ratio');
  }

  // Calculate LP tokens to mint
  let lpTokens;
  if (this.totalLPTokens === 0) {
    lpTokens = Math.sqrt(solAmount * stratAmount);
  } else {
    const lpFromSOL = (solAmount / this.solReserve) * this.totalLPTokens;
    const lpFromSTRAT = (stratAmount / this.stratReserve) * this.totalLPTokens;
    lpTokens = Math.min(lpFromSOL, lpFromSTRAT);
  }

  this.solReserve += solAmount;
  this.stratReserve += stratAmount;
  this.totalLPTokens += lpTokens;
  this.lastUpdated = Date.now();

  await this.save();

  return {
    lpTokens,
    solAdded: solAmount,
    stratAdded: stratAmount,
    totalLPTokens: this.totalLPTokens
  };
};

// Remove liquidity
liquidityPoolSchema.methods.removeLiquidity = async function(lpTokens) {
  if (lpTokens > this.totalLPTokens) {
    throw new Error('Insufficient LP tokens');
  }

  const solAmount = (lpTokens / this.totalLPTokens) * this.solReserve;
  const stratAmount = (lpTokens / this.totalLPTokens) * this.stratReserve;

  this.solReserve -= solAmount;
  this.stratReserve -= stratAmount;
  this.totalLPTokens -= lpTokens;
  this.lastUpdated = Date.now();

  await this.save();

  return {
    solAmount,
    stratAmount,
    lpTokensBurned: lpTokens
  };
};

module.exports = mongoose.model('LiquidityPool', liquidityPoolSchema);
