const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  positionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tickLower: {
    type: Number,
    required: true
  },
  tickUpper: {
    type: Number,
    required: true
  },
  liquidity: {
    type: Number,
    required: true,
    min: 0
  },
  token0Amount: {
    type: Number,
    required: true,
    min: 0
  },
  token1Amount: {
    type: Number,
    required: true,
    min: 0
  },
  feesEarned0: {
    type: Number,
    default: 0
  },
  feesEarned1: {
    type: Number,
    default: 0
  },
  lastFeeCollection: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  active: {
    type: Boolean,
    default: true
  }
});

const tickSchema = new mongoose.Schema({
  tickIndex: {
    type: Number,
    required: true
  },
  liquidityGross: {
    type: Number,
    default: 0
  },
  liquidityNet: {
    type: Number,
    default: 0
  },
  feeGrowthOutside0: {
    type: Number,
    default: 0
  },
  feeGrowthOutside1: {
    type: Number,
    default: 0
  },
  initialized: {
    type: Boolean,
    default: false
  }
});

const concentratedLiquiditySchema = new mongoose.Schema({
  poolId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  token0: {
    type: String,
    required: true
  },
  token1: {
    type: String,
    required: true
  },
  fee: {
    type: Number,
    required: true,
    default: 0.003 // 0.3%
  },
  tickSpacing: {
    type: Number,
    default: 60
  },
  currentTick: {
    type: Number,
    default: 0
  },
  currentPrice: {
    type: Number,
    required: true
  },
  sqrtPriceX96: {
    type: String, // Stored as string for precision
    required: true
  },
  liquidity: {
    type: Number,
    default: 0
  },
  feeGrowthGlobal0: {
    type: Number,
    default: 0
  },
  feeGrowthGlobal1: {
    type: Number,
    default: 0
  },
  positions: [positionSchema],
  ticks: [tickSchema],
  volume24h0: {
    type: Number,
    default: 0
  },
  volume24h1: {
    type: Number,
    default: 0
  },
  feesCollected24h: {
    type: Number,
    default: 0
  },
  tvl: {
    type: Number,
    default: 0
  },
  observations: [{
    timestamp: { type: Date, default: Date.now },
    tick: Number,
    price: Number,
    liquidity: Number
  }],
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Convert price to tick
concentratedLiquiditySchema.methods.priceToTick = function(price) {
  return Math.floor(Math.log(price) / Math.log(1.0001));
};

// Convert tick to price
concentratedLiquiditySchema.methods.tickToPrice = function(tick) {
  return Math.pow(1.0001, tick);
};

// Convert price to sqrt price Q96 format (simplified)
concentratedLiquiditySchema.methods.priceToSqrtPriceX96 = function(price) {
  const sqrtPrice = Math.sqrt(price);
  const Q96 = Math.pow(2, 96);
  return (sqrtPrice * Q96).toString();
};

// Get or create tick
concentratedLiquiditySchema.methods.getTick = function(tickIndex) {
  let tick = this.ticks.find(t => t.tickIndex === tickIndex);

  if (!tick) {
    tick = {
      tickIndex,
      liquidityGross: 0,
      liquidityNet: 0,
      feeGrowthOutside0: 0,
      feeGrowthOutside1: 0,
      initialized: false
    };
    this.ticks.push(tick);
  }

  return tick;
};

// Mint new position
concentratedLiquiditySchema.methods.mint = async function(owner, tickLower, tickUpper, amount0Desired, amount1Desired) {
  // Validate ticks
  if (tickLower >= tickUpper) {
    throw new Error('Invalid tick range');
  }

  if (tickLower % this.tickSpacing !== 0 || tickUpper % this.tickSpacing !== 0) {
    throw new Error('Ticks must align with tick spacing');
  }

  // Calculate liquidity from amounts
  const liquidityFromAmount0 = this.getLiquidityForAmount0(
    this.tickToPrice(tickLower),
    this.tickToPrice(tickUpper),
    amount0Desired
  );

  const liquidityFromAmount1 = this.getLiquidityForAmount1(
    this.tickToPrice(tickLower),
    this.tickToPrice(tickUpper),
    amount1Desired
  );

  const liquidity = Math.min(liquidityFromAmount0, liquidityFromAmount1);

  // Calculate actual amounts needed
  const amount0 = this.getAmount0ForLiquidity(
    this.tickToPrice(tickLower),
    this.tickToPrice(tickUpper),
    liquidity
  );

  const amount1 = this.getAmount1ForLiquidity(
    this.tickToPrice(tickLower),
    this.tickToPrice(tickUpper),
    liquidity
  );

  const positionId = `POS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const position = {
    positionId,
    owner,
    tickLower,
    tickUpper,
    liquidity,
    token0Amount: amount0,
    token1Amount: amount1,
    feesEarned0: 0,
    feesEarned1: 0,
    lastFeeCollection: new Date(),
    createdAt: new Date(),
    active: true
  };

  this.positions.push(position);

  // Update ticks
  const lowerTick = this.getTick(tickLower);
  const upperTick = this.getTick(tickUpper);

  lowerTick.liquidityGross += liquidity;
  lowerTick.liquidityNet += liquidity;
  lowerTick.initialized = true;

  upperTick.liquidityGross += liquidity;
  upperTick.liquidityNet -= liquidity;
  upperTick.initialized = true;

  // Update pool liquidity if position is in range
  if (this.currentTick >= tickLower && this.currentTick < tickUpper) {
    this.liquidity += liquidity;
  }

  this.updateTVL();

  await this.save();
  return position;
};

// Burn position
concentratedLiquiditySchema.methods.burn = async function(positionId) {
  const positionIndex = this.positions.findIndex(p => p.positionId === positionId);
  if (positionIndex === -1) {
    throw new Error('Position not found');
  }

  const position = this.positions[positionIndex];

  if (!position.active) {
    throw new Error('Position is not active');
  }

  // Collect fees first
  await this.collectFees(positionId);

  // Update ticks
  const lowerTick = this.getTick(position.tickLower);
  const upperTick = this.getTick(position.tickUpper);

  lowerTick.liquidityGross -= position.liquidity;
  lowerTick.liquidityNet -= position.liquidity;

  upperTick.liquidityGross -= position.liquidity;
  upperTick.liquidityNet += position.liquidity;

  // Update pool liquidity if position is in range
  if (this.currentTick >= position.tickLower && this.currentTick < position.tickUpper) {
    this.liquidity -= position.liquidity;
  }

  position.active = false;

  this.updateTVL();

  await this.save();

  return {
    token0Amount: position.token0Amount,
    token1Amount: position.token1Amount,
    feesEarned0: position.feesEarned0,
    feesEarned1: position.feesEarned1
  };
};

// Calculate liquidity for token0 amount
concentratedLiquiditySchema.methods.getLiquidityForAmount0 = function(priceLower, priceUpper, amount0) {
  const sqrtPriceLower = Math.sqrt(priceLower);
  const sqrtPriceUpper = Math.sqrt(priceUpper);
  return amount0 * sqrtPriceLower * sqrtPriceUpper / (sqrtPriceUpper - sqrtPriceLower);
};

// Calculate liquidity for token1 amount
concentratedLiquiditySchema.methods.getLiquidityForAmount1 = function(priceLower, priceUpper, amount1) {
  const sqrtPriceLower = Math.sqrt(priceLower);
  const sqrtPriceUpper = Math.sqrt(priceUpper);
  return amount1 / (sqrtPriceUpper - sqrtPriceLower);
};

// Calculate token0 amount for liquidity
concentratedLiquiditySchema.methods.getAmount0ForLiquidity = function(priceLower, priceUpper, liquidity) {
  const sqrtPriceLower = Math.sqrt(priceLower);
  const sqrtPriceUpper = Math.sqrt(priceUpper);
  return liquidity * (sqrtPriceUpper - sqrtPriceLower) / (sqrtPriceLower * sqrtPriceUpper);
};

// Calculate token1 amount for liquidity
concentratedLiquiditySchema.methods.getAmount1ForLiquidity = function(priceLower, priceUpper, liquidity) {
  const sqrtPriceLower = Math.sqrt(priceLower);
  const sqrtPriceUpper = Math.sqrt(priceUpper);
  return liquidity * (sqrtPriceUpper - sqrtPriceLower);
};

// Swap tokens
concentratedLiquiditySchema.methods.swap = async function(zeroForOne, amountSpecified, sqrtPriceLimitX96 = null) {
  if (this.liquidity === 0) {
    throw new Error('No liquidity available');
  }

  let amountIn = Math.abs(amountSpecified);
  let amountOut = 0;

  // Simplified swap calculation using x*y=k for demonstration
  // In production, use proper tick-based calculations
  if (zeroForOne) {
    // Selling token0 for token1
    const fee = amountIn * this.fee;
    const amountInWithFee = amountIn - fee;

    amountOut = (this.liquidity * amountInWithFee) / (this.liquidity + amountInWithFee);

    this.volume24h0 += amountIn;
    this.feesCollected24h += fee;

    // Update fee growth
    this.feeGrowthGlobal0 += fee / this.liquidity;

    // Update price
    this.currentPrice = this.currentPrice * (this.liquidity / (this.liquidity + amountInWithFee));
  } else {
    // Selling token1 for token0
    const fee = amountIn * this.fee;
    const amountInWithFee = amountIn - fee;

    amountOut = (this.liquidity * amountInWithFee) / (this.liquidity + amountInWithFee);

    this.volume24h1 += amountIn;
    this.feesCollected24h += fee;

    // Update fee growth
    this.feeGrowthGlobal1 += fee / this.liquidity;

    // Update price
    this.currentPrice = this.currentPrice * ((this.liquidity + amountInWithFee) / this.liquidity);
  }

  // Update current tick
  this.currentTick = this.priceToTick(this.currentPrice);
  this.sqrtPriceX96 = this.priceToSqrtPriceX96(this.currentPrice);

  // Record observation
  this.observations.push({
    timestamp: new Date(),
    tick: this.currentTick,
    price: this.currentPrice,
    liquidity: this.liquidity
  });

  // Keep only last 1000 observations
  if (this.observations.length > 1000) {
    this.observations = this.observations.slice(-1000);
  }

  await this.save();

  return {
    amountIn,
    amountOut,
    newPrice: this.currentPrice,
    newTick: this.currentTick
  };
};

// Collect fees for position
concentratedLiquiditySchema.methods.collectFees = async function(positionId) {
  const position = this.positions.find(p => p.positionId === positionId);
  if (!position) {
    throw new Error('Position not found');
  }

  // Calculate fees based on fee growth (simplified)
  const isInRange = this.currentTick >= position.tickLower && this.currentTick < position.tickUpper;

  if (isInRange) {
    const feeGrowth0 = this.feeGrowthGlobal0;
    const feeGrowth1 = this.feeGrowthGlobal1;

    const fees0 = (position.liquidity * feeGrowth0) / 1e18; // Normalized
    const fees1 = (position.liquidity * feeGrowth1) / 1e18;

    position.feesEarned0 += fees0;
    position.feesEarned1 += fees1;
    position.lastFeeCollection = new Date();
  }

  await this.save();

  return {
    feesEarned0: position.feesEarned0,
    feesEarned1: position.feesEarned1
  };
};

// Update TVL
concentratedLiquiditySchema.methods.updateTVL = function() {
  const activePositions = this.positions.filter(p => p.active);

  const totalToken0 = activePositions.reduce((sum, p) => sum + p.token0Amount, 0);
  const totalToken1 = activePositions.reduce((sum, p) => sum + p.token1Amount, 0);

  // Simplified TVL calculation (in production, use actual token prices)
  this.tvl = totalToken0 + (totalToken1 * this.currentPrice);
};

// Get position info
concentratedLiquiditySchema.methods.getPositionInfo = function(positionId) {
  const position = this.positions.find(p => p.positionId === positionId);
  if (!position) {
    return null;
  }

  const priceLower = this.tickToPrice(position.tickLower);
  const priceUpper = this.tickToPrice(position.tickUpper);
  const isInRange = this.currentTick >= position.tickLower && this.currentTick < position.tickUpper;

  return {
    positionId: position.positionId,
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
    priceLower,
    priceUpper,
    liquidity: position.liquidity,
    token0Amount: position.token0Amount,
    token1Amount: position.token1Amount,
    feesEarned0: position.feesEarned0,
    feesEarned1: position.feesEarned1,
    isInRange,
    active: position.active,
    createdAt: position.createdAt
  };
};

// Get pool statistics
concentratedLiquiditySchema.methods.getStats = function() {
  const activePositions = this.positions.filter(p => p.active);
  const inRangePositions = activePositions.filter(p =>
    this.currentTick >= p.tickLower && this.currentTick < p.tickUpper
  );

  return {
    poolId: this.poolId,
    token0: this.token0,
    token1: this.token1,
    currentPrice: this.currentPrice,
    currentTick: this.currentTick,
    fee: this.fee,
    liquidity: this.liquidity,
    tvl: this.tvl,
    volume24h: this.volume24h0 + this.volume24h1,
    feesCollected24h: this.feesCollected24h,
    totalPositions: this.positions.length,
    activePositions: activePositions.length,
    inRangePositions: inRangePositions.length,
    utilizationRate: activePositions.length > 0 ? (inRangePositions.length / activePositions.length) * 100 : 0
  };
};

// Get liquidity distribution
concentratedLiquiditySchema.methods.getLiquidityDistribution = function() {
  const distribution = {};

  for (const tick of this.ticks) {
    if (tick.initialized) {
      distribution[tick.tickIndex] = {
        price: this.tickToPrice(tick.tickIndex),
        liquidity: tick.liquidityGross
      };
    }
  }

  return distribution;
};

module.exports = mongoose.model('ConcentratedLiquidity', concentratedLiquiditySchema);
