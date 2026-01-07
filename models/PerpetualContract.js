const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  trader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  side: {
    type: String,
    enum: ['LONG', 'SHORT'],
    required: true
  },
  size: {
    type: Number,
    required: true,
    min: 0
  },
  collateral: {
    type: Number,
    required: true,
    min: 0
  },
  leverage: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  entryPrice: {
    type: Number,
    required: true
  },
  liquidationPrice: {
    type: Number,
    required: true
  },
  unrealizedPnL: {
    type: Number,
    default: 0
  },
  openedAt: {
    type: Date,
    default: Date.now
  },
  lastFundingPayment: {
    type: Date,
    default: Date.now
  },
  accumulatedFunding: {
    type: Number,
    default: 0
  }
});

const perpetualContractSchema = new mongoose.Schema({
  pair: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  baseAsset: {
    type: String,
    required: true
  },
  quoteAsset: {
    type: String,
    required: true
  },
  markPrice: {
    type: Number,
    required: true
  },
  indexPrice: {
    type: Number,
    required: true
  },
  fundingRate: {
    type: Number,
    default: 0
  },
  fundingInterval: {
    type: Number,
    default: 28800000 // 8 hours in milliseconds
  },
  lastFundingTime: {
    type: Date,
    default: Date.now
  },
  maxLeverage: {
    type: Number,
    default: 100
  },
  maintenanceMarginRate: {
    type: Number,
    default: 0.005 // 0.5%
  },
  takerFee: {
    type: Number,
    default: 0.0006 // 0.06%
  },
  makerFee: {
    type: Number,
    default: 0.0002 // 0.02%
  },
  totalLongPositions: {
    type: Number,
    default: 0
  },
  totalShortPositions: {
    type: Number,
    default: 0
  },
  openInterest: {
    type: Number,
    default: 0
  },
  volume24h: {
    type: Number,
    default: 0
  },
  positions: [positionSchema],
  fundingHistory: [{
    rate: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  priceHistory: [{
    markPrice: Number,
    indexPrice: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  insuranceFund: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Calculate funding rate based on mark price and index price
perpetualContractSchema.methods.calculateFundingRate = function() {
  const premium = (this.markPrice - this.indexPrice) / this.indexPrice;
  const clampedPremium = Math.max(-0.0005, Math.min(0.0005, premium));
  const fundingRate = clampedPremium + 0.0001; // Add interest rate component
  return fundingRate;
};

// Update funding rate
perpetualContractSchema.methods.updateFundingRate = async function() {
  const now = Date.now();
  if (now - this.lastFundingTime.getTime() >= this.fundingInterval) {
    const newRate = this.calculateFundingRate();
    this.fundingRate = newRate;
    this.lastFundingTime = new Date(now);

    this.fundingHistory.push({
      rate: newRate,
      timestamp: new Date(now)
    });

    // Keep only last 100 funding records
    if (this.fundingHistory.length > 100) {
      this.fundingHistory = this.fundingHistory.slice(-100);
    }

    await this.save();
  }
};

// Calculate liquidation price for a position
perpetualContractSchema.methods.calculateLiquidationPrice = function(position) {
  const maintenanceMargin = position.collateral * this.maintenanceMarginRate;

  if (position.side === 'LONG') {
    return position.entryPrice * (1 - (position.collateral - maintenanceMargin) / (position.size * position.entryPrice));
  } else {
    return position.entryPrice * (1 + (position.collateral - maintenanceMargin) / (position.size * position.entryPrice));
  }
};

// Calculate unrealized PnL for a position
perpetualContractSchema.methods.calculateUnrealizedPnL = function(position) {
  if (position.side === 'LONG') {
    return position.size * (this.markPrice - position.entryPrice);
  } else {
    return position.size * (position.entryPrice - this.markPrice);
  }
};

// Open a new position
perpetualContractSchema.methods.openPosition = async function(trader, side, size, collateral, leverage) {
  if (leverage > this.maxLeverage) {
    throw new Error(`Leverage exceeds maximum allowed: ${this.maxLeverage}x`);
  }

  const requiredMargin = (size * this.markPrice) / leverage;
  if (collateral < requiredMargin) {
    throw new Error('Insufficient collateral for leverage');
  }

  const position = {
    trader,
    side,
    size,
    collateral,
    leverage,
    entryPrice: this.markPrice,
    liquidationPrice: 0,
    unrealizedPnL: 0,
    openedAt: new Date(),
    lastFundingPayment: new Date(),
    accumulatedFunding: 0
  };

  position.liquidationPrice = this.calculateLiquidationPrice(position);

  this.positions.push(position);

  if (side === 'LONG') {
    this.totalLongPositions += size;
  } else {
    this.totalShortPositions += size;
  }

  this.openInterest += size * this.markPrice;

  await this.save();
  return position;
};

// Close a position
perpetualContractSchema.methods.closePosition = async function(positionId) {
  const positionIndex = this.positions.findIndex(p => p._id.toString() === positionId);
  if (positionIndex === -1) {
    throw new Error('Position not found');
  }

  const position = this.positions[positionIndex];
  const pnl = this.calculateUnrealizedPnL(position);
  const fee = position.size * this.markPrice * this.takerFee;

  if (position.side === 'LONG') {
    this.totalLongPositions -= position.size;
  } else {
    this.totalShortPositions -= position.size;
  }

  this.openInterest -= position.size * this.markPrice;
  this.positions.splice(positionIndex, 1);

  await this.save();

  return {
    pnl: pnl - fee - position.accumulatedFunding,
    fee,
    fundingPaid: position.accumulatedFunding
  };
};

// Apply funding to all positions
perpetualContractSchema.methods.applyFunding = async function() {
  const now = Date.now();
  const positions = this.positions;

  for (let position of positions) {
    const timeSinceLastPayment = now - position.lastFundingPayment.getTime();
    const intervals = Math.floor(timeSinceLastPayment / this.fundingInterval);

    if (intervals > 0) {
      const positionValue = position.size * this.markPrice;
      const fundingPayment = positionValue * this.fundingRate * intervals;

      if (position.side === 'LONG') {
        position.accumulatedFunding += fundingPayment;
      } else {
        position.accumulatedFunding -= fundingPayment;
      }

      position.lastFundingPayment = new Date(now);
    }
  }

  await this.save();
};

// Check for liquidations
perpetualContractSchema.methods.checkLiquidations = async function() {
  const liquidatedPositions = [];

  for (let i = this.positions.length - 1; i >= 0; i--) {
    const position = this.positions[i];
    const shouldLiquidate = (
      (position.side === 'LONG' && this.markPrice <= position.liquidationPrice) ||
      (position.side === 'SHORT' && this.markPrice >= position.liquidationPrice)
    );

    if (shouldLiquidate) {
      const pnl = this.calculateUnrealizedPnL(position);
      const remainingCollateral = position.collateral + pnl - position.accumulatedFunding;

      // Add remaining collateral to insurance fund
      if (remainingCollateral > 0) {
        this.insuranceFund += remainingCollateral;
      }

      if (position.side === 'LONG') {
        this.totalLongPositions -= position.size;
      } else {
        this.totalShortPositions -= position.size;
      }

      this.openInterest -= position.size * this.markPrice;

      liquidatedPositions.push({
        trader: position.trader,
        side: position.side,
        size: position.size,
        entryPrice: position.entryPrice,
        liquidationPrice: position.liquidationPrice,
        pnl,
        timestamp: new Date()
      });

      this.positions.splice(i, 1);
    }
  }

  if (liquidatedPositions.length > 0) {
    await this.save();
  }

  return liquidatedPositions;
};

// Update mark price and index price
perpetualContractSchema.methods.updatePrices = async function(markPrice, indexPrice) {
  this.markPrice = markPrice;
  this.indexPrice = indexPrice;

  this.priceHistory.push({
    markPrice,
    indexPrice,
    timestamp: new Date()
  });

  // Keep only last 1000 price records
  if (this.priceHistory.length > 1000) {
    this.priceHistory = this.priceHistory.slice(-1000);
  }

  // Update unrealized PnL for all positions
  for (let position of this.positions) {
    position.unrealizedPnL = this.calculateUnrealizedPnL(position);
  }

  await this.save();
  await this.checkLiquidations();
};

// Get contract statistics
perpetualContractSchema.methods.getStats = function() {
  return {
    pair: this.pair,
    markPrice: this.markPrice,
    indexPrice: this.indexPrice,
    fundingRate: this.fundingRate,
    nextFundingTime: new Date(this.lastFundingTime.getTime() + this.fundingInterval),
    openInterest: this.openInterest,
    totalLongPositions: this.totalLongPositions,
    totalShortPositions: this.totalShortPositions,
    volume24h: this.volume24h,
    longShortRatio: this.totalShortPositions > 0 ? this.totalLongPositions / this.totalShortPositions : 0,
    insuranceFund: this.insuranceFund,
    activePositions: this.positions.length
  };
};

module.exports = mongoose.model('PerpetualContract', perpetualContractSchema);
