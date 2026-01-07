const mongoose = require('mongoose');

const collateralPositionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collateralAmount: {
    type: Number,
    required: true,
    min: 0
  },
  syntheticMinted: {
    type: Number,
    required: true,
    min: 0
  },
  collateralRatio: {
    type: Number,
    required: true
  },
  liquidationPrice: {
    type: Number,
    required: true
  },
  debt: {
    type: Number,
    default: 0
  },
  lastInterestUpdate: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const syntheticAssetSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  assetType: {
    type: String,
    enum: ['CRYPTO', 'STOCK', 'COMMODITY', 'FOREX', 'INDEX', 'CUSTOM'],
    required: true
  },
  targetAsset: {
    type: String,
    required: true // e.g., 'BTC', 'AAPL', 'GOLD', 'EUR/USD'
  },
  currentPrice: {
    type: Number,
    required: true,
    min: 0
  },
  oracleAddress: {
    type: String,
    required: true
  },
  collateralToken: {
    type: String,
    default: 'STRAT'
  },
  collateralPrice: {
    type: Number,
    required: true,
    min: 0
  },
  minCollateralRatio: {
    type: Number,
    default: 150, // 150% minimum collateral ratio
    min: 100
  },
  liquidationRatio: {
    type: Number,
    default: 120, // 120% liquidation threshold
    min: 100
  },
  stabilityFee: {
    type: Number,
    default: 0.05 // 5% annual interest rate
  },
  liquidationPenalty: {
    type: Number,
    default: 0.1 // 10% liquidation penalty
  },
  totalSupply: {
    type: Number,
    default: 0,
    min: 0
  },
  totalCollateral: {
    type: Number,
    default: 0,
    min: 0
  },
  positions: [collateralPositionSchema],
  priceHistory: [{
    price: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  volume24h: {
    type: Number,
    default: 0
  },
  liquidationReserve: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Calculate collateral ratio for a position
syntheticAssetSchema.methods.calculateCollateralRatio = function(collateralAmount, syntheticAmount) {
  const collateralValue = collateralAmount * this.collateralPrice;
  const syntheticValue = syntheticAmount * this.currentPrice;
  return syntheticValue > 0 ? (collateralValue / syntheticValue) * 100 : Infinity;
};

// Calculate liquidation price
syntheticAssetSchema.methods.calculateLiquidationPrice = function(collateralAmount, syntheticAmount) {
  // Price at which collateral ratio = liquidation ratio
  // collateralAmount * collateralPrice / (syntheticAmount * targetPrice) = liquidationRatio / 100
  // targetPrice = (collateralAmount * collateralPrice * 100) / (syntheticAmount * liquidationRatio)
  if (syntheticAmount === 0) return 0;
  return (collateralAmount * this.collateralPrice * 100) / (syntheticAmount * this.liquidationRatio);
};

// Mint synthetic asset
syntheticAssetSchema.methods.mintSynthetic = async function(user, collateralAmount, syntheticAmount) {
  const collateralRatio = this.calculateCollateralRatio(collateralAmount, syntheticAmount);

  if (collateralRatio < this.minCollateralRatio) {
    throw new Error(`Collateral ratio ${collateralRatio.toFixed(2)}% is below minimum ${this.minCollateralRatio}%`);
  }

  const liquidationPrice = this.calculateLiquidationPrice(collateralAmount, syntheticAmount);

  const position = {
    user,
    collateralAmount,
    syntheticMinted: syntheticAmount,
    collateralRatio,
    liquidationPrice,
    debt: 0,
    lastInterestUpdate: new Date(),
    createdAt: new Date()
  };

  this.positions.push(position);
  this.totalSupply += syntheticAmount;
  this.totalCollateral += collateralAmount;

  await this.save();
  return position;
};

// Burn synthetic asset and withdraw collateral
syntheticAssetSchema.methods.burnSynthetic = async function(positionId, syntheticAmount) {
  const positionIndex = this.positions.findIndex(p => p._id.toString() === positionId);
  if (positionIndex === -1) {
    throw new Error('Position not found');
  }

  const position = this.positions[positionIndex];

  // Calculate accrued interest
  await this.accrueInterest(positionId);

  if (syntheticAmount > position.syntheticMinted) {
    throw new Error('Cannot burn more than minted amount');
  }

  // Calculate collateral to return proportionally
  const collateralToReturn = (syntheticAmount / position.syntheticMinted) * position.collateralAmount;

  position.syntheticMinted -= syntheticAmount;
  position.collateralAmount -= collateralToReturn;

  this.totalSupply -= syntheticAmount;
  this.totalCollateral -= collateralToReturn;

  if (position.syntheticMinted === 0) {
    // Remove position if fully closed
    this.positions.splice(positionIndex, 1);
  } else {
    // Recalculate collateral ratio and liquidation price
    position.collateralRatio = this.calculateCollateralRatio(position.collateralAmount, position.syntheticMinted);
    position.liquidationPrice = this.calculateLiquidationPrice(position.collateralAmount, position.syntheticMinted);
  }

  await this.save();
  return { collateralReturned: collateralToReturn };
};

// Add collateral to existing position
syntheticAssetSchema.methods.addCollateral = async function(positionId, collateralAmount) {
  const position = this.positions.find(p => p._id.toString() === positionId);
  if (!position) {
    throw new Error('Position not found');
  }

  position.collateralAmount += collateralAmount;
  position.collateralRatio = this.calculateCollateralRatio(position.collateralAmount, position.syntheticMinted);
  position.liquidationPrice = this.calculateLiquidationPrice(position.collateralAmount, position.syntheticMinted);

  this.totalCollateral += collateralAmount;

  await this.save();
  return position;
};

// Mint more synthetics from existing position
syntheticAssetSchema.methods.mintMore = async function(positionId, syntheticAmount) {
  const position = this.positions.find(p => p._id.toString() === positionId);
  if (!position) {
    throw new Error('Position not found');
  }

  const newSyntheticTotal = position.syntheticMinted + syntheticAmount;
  const newCollateralRatio = this.calculateCollateralRatio(position.collateralAmount, newSyntheticTotal);

  if (newCollateralRatio < this.minCollateralRatio) {
    throw new Error(`New collateral ratio ${newCollateralRatio.toFixed(2)}% is below minimum ${this.minCollateralRatio}%`);
  }

  position.syntheticMinted = newSyntheticTotal;
  position.collateralRatio = newCollateralRatio;
  position.liquidationPrice = this.calculateLiquidationPrice(position.collateralAmount, position.syntheticMinted);

  this.totalSupply += syntheticAmount;

  await this.save();
  return position;
};

// Accrue stability fee (interest) on a position
syntheticAssetSchema.methods.accrueInterest = async function(positionId) {
  const position = this.positions.find(p => p._id.toString() === positionId);
  if (!position) {
    throw new Error('Position not found');
  }

  const now = Date.now();
  const timeSinceLastUpdate = (now - position.lastInterestUpdate.getTime()) / (1000 * 60 * 60 * 24 * 365); // in years

  if (timeSinceLastUpdate > 0) {
    const interest = position.syntheticMinted * this.stabilityFee * timeSinceLastUpdate;
    position.debt += interest;
    position.lastInterestUpdate = new Date(now);

    // Update collateral ratio
    const totalDebt = position.syntheticMinted + position.debt;
    position.collateralRatio = this.calculateCollateralRatio(position.collateralAmount, totalDebt);

    await this.save();
  }

  return position.debt;
};

// Check and execute liquidations
syntheticAssetSchema.methods.checkLiquidations = async function() {
  const liquidations = [];

  for (let i = this.positions.length - 1; i >= 0; i--) {
    const position = this.positions[i];

    // Accrue interest first
    const timeSinceLastUpdate = (Date.now() - position.lastInterestUpdate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (timeSinceLastUpdate > 0) {
      const interest = position.syntheticMinted * this.stabilityFee * timeSinceLastUpdate;
      position.debt += interest;
      position.lastInterestUpdate = new Date();
    }

    const totalDebt = position.syntheticMinted + position.debt;
    const currentRatio = this.calculateCollateralRatio(position.collateralAmount, totalDebt);

    if (currentRatio <= this.liquidationRatio) {
      // Liquidate position
      const collateralValue = position.collateralAmount * this.collateralPrice;
      const penalty = collateralValue * this.liquidationPenalty;
      const collateralAfterPenalty = position.collateralAmount * (1 - this.liquidationPenalty);

      // Add penalty to liquidation reserve
      this.liquidationReserve += penalty / this.collateralPrice;

      this.totalSupply -= position.syntheticMinted;
      this.totalCollateral -= position.collateralAmount;

      liquidations.push({
        user: position.user,
        collateralAmount: position.collateralAmount,
        collateralAfterPenalty,
        syntheticMinted: position.syntheticMinted,
        debt: position.debt,
        collateralRatio: currentRatio,
        penalty,
        timestamp: new Date()
      });

      this.positions.splice(i, 1);
    }
  }

  if (liquidations.length > 0) {
    await this.save();
  }

  return liquidations;
};

// Update price from oracle
syntheticAssetSchema.methods.updatePrice = async function(newPrice, newCollateralPrice = null) {
  this.currentPrice = newPrice;

  if (newCollateralPrice) {
    this.collateralPrice = newCollateralPrice;
  }

  this.priceHistory.push({
    price: newPrice,
    timestamp: new Date()
  });

  // Keep only last 1000 price records
  if (this.priceHistory.length > 1000) {
    this.priceHistory = this.priceHistory.slice(-1000);
  }

  // Update collateral ratios and liquidation prices for all positions
  for (let position of this.positions) {
    const totalDebt = position.syntheticMinted + position.debt;
    position.collateralRatio = this.calculateCollateralRatio(position.collateralAmount, totalDebt);
    position.liquidationPrice = this.calculateLiquidationPrice(position.collateralAmount, position.syntheticMinted);
  }

  await this.save();
  await this.checkLiquidations();
};

// Get global collateral ratio
syntheticAssetSchema.methods.getGlobalCollateralRatio = function() {
  const totalCollateralValue = this.totalCollateral * this.collateralPrice;
  const totalDebtValue = this.totalSupply * this.currentPrice;
  return totalDebtValue > 0 ? (totalCollateralValue / totalDebtValue) * 100 : Infinity;
};

// Get user positions
syntheticAssetSchema.methods.getUserPositions = function(userId) {
  return this.positions.filter(p => p.user.toString() === userId.toString());
};

// Get statistics
syntheticAssetSchema.methods.getStats = function() {
  return {
    symbol: this.symbol,
    name: this.name,
    assetType: this.assetType,
    targetAsset: this.targetAsset,
    currentPrice: this.currentPrice,
    totalSupply: this.totalSupply,
    totalCollateral: this.totalCollateral,
    globalCollateralRatio: this.getGlobalCollateralRatio(),
    minCollateralRatio: this.minCollateralRatio,
    liquidationRatio: this.liquidationRatio,
    stabilityFee: this.stabilityFee,
    volume24h: this.volume24h,
    activePositions: this.positions.length,
    liquidationReserve: this.liquidationReserve,
    totalCollateralValue: this.totalCollateral * this.collateralPrice,
    totalDebtValue: this.totalSupply * this.currentPrice
  };
};

module.exports = mongoose.model('SyntheticAsset', syntheticAssetSchema);
