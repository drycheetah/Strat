const mongoose = require('mongoose');

const marginPositionSchema = new mongoose.Schema({
  positionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  asset: {
    type: String,
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
  entryPrice: {
    type: Number,
    required: true
  },
  currentPrice: {
    type: Number,
    required: true
  },
  collateral: {
    type: Number,
    required: true,
    min: 0
  },
  borrowed: {
    type: Number,
    required: true,
    min: 0
  },
  leverage: {
    type: Number,
    required: true,
    min: 1
  },
  liquidationPrice: {
    type: Number,
    required: true
  },
  marginRatio: {
    type: Number,
    required: true
  },
  unrealizedPnL: {
    type: Number,
    default: 0
  },
  interestAccrued: {
    type: Number,
    default: 0
  },
  lastInterestUpdate: {
    type: Date,
    default: Date.now
  },
  openedAt: {
    type: Date,
    default: Date.now
  },
  closedAt: Date,
  status: {
    type: String,
    enum: ['OPEN', 'CLOSED', 'LIQUIDATED'],
    default: 'OPEN'
  }
});

const marginAccountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  accountId: {
    type: String,
    required: true,
    unique: true
  },
  totalEquity: {
    type: Number,
    default: 0,
    min: 0
  },
  totalCollateral: {
    type: Number,
    default: 0,
    min: 0
  },
  totalBorrowed: {
    type: Number,
    default: 0,
    min: 0
  },
  totalInterest: {
    type: Number,
    default: 0
  },
  availableMargin: {
    type: Number,
    default: 0
  },
  usedMargin: {
    type: Number,
    default: 0
  },
  marginLevel: {
    type: Number,
    default: 100
  },
  positions: [marginPositionSchema],
  maxLeverage: {
    type: Number,
    default: 10,
    min: 1,
    max: 100
  },
  maintenanceMarginRate: {
    type: Number,
    default: 0.05 // 5%
  },
  interestRate: {
    type: Number,
    default: 0.1 // 10% annual
  },
  liquidationFee: {
    type: Number,
    default: 0.05 // 5%
  },
  tradingFee: {
    type: Number,
    default: 0.001 // 0.1%
  },
  totalPnL: {
    type: Number,
    default: 0
  },
  totalFees: {
    type: Number,
    default: 0
  },
  riskLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW'
  },
  alerts: [{
    type: {
      type: String,
      enum: ['MARGIN_CALL', 'LIQUIDATION_WARNING', 'INTEREST_DUE']
    },
    message: String,
    timestamp: { type: Date, default: Date.now },
    acknowledged: { type: Boolean, default: false }
  }],
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Calculate liquidation price
marginAccountSchema.methods.calculateLiquidationPrice = function(position) {
  const maintenanceMargin = position.collateral * this.maintenanceMarginRate;

  if (position.side === 'LONG') {
    // For long: liquidationPrice = (borrowed + interest - collateral + maintenanceMargin) / size
    return (position.borrowed + position.interestAccrued - position.collateral + maintenanceMargin) / position.size;
  } else {
    // For short: liquidationPrice = (borrowed + collateral - maintenanceMargin) / size
    return (position.borrowed + position.collateral - maintenanceMargin) / position.size;
  }
};

// Calculate unrealized PnL
marginAccountSchema.methods.calculateUnrealizedPnL = function(position) {
  if (position.side === 'LONG') {
    return position.size * (position.currentPrice - position.entryPrice);
  } else {
    return position.size * (position.entryPrice - position.currentPrice);
  }
};

// Calculate margin ratio
marginAccountSchema.methods.calculateMarginRatio = function(position) {
  const equity = position.collateral + position.unrealizedPnL - position.interestAccrued;
  const positionValue = position.size * position.currentPrice;
  return positionValue > 0 ? (equity / positionValue) * 100 : 0;
};

// Open margin position
marginAccountSchema.methods.openPosition = async function(asset, side, size, collateral, leverage) {
  if (leverage > this.maxLeverage) {
    throw new Error(`Leverage ${leverage}x exceeds maximum ${this.maxLeverage}x`);
  }

  if (collateral > this.availableMargin) {
    throw new Error('Insufficient available margin');
  }

  const positionValue = size * collateral; // Simplified price calculation
  const borrowed = positionValue - collateral;

  if (borrowed < 0) {
    throw new Error('Invalid position parameters');
  }

  const entryPrice = collateral; // Simplified - should use actual market price
  const fee = positionValue * this.tradingFee;

  const positionId = `POS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const position = {
    positionId,
    asset,
    side,
    size,
    entryPrice,
    currentPrice: entryPrice,
    collateral: collateral - fee,
    borrowed,
    leverage,
    liquidationPrice: 0,
    marginRatio: 100,
    unrealizedPnL: 0,
    interestAccrued: 0,
    lastInterestUpdate: new Date(),
    openedAt: new Date(),
    status: 'OPEN'
  };

  position.liquidationPrice = this.calculateLiquidationPrice(position);
  position.marginRatio = this.calculateMarginRatio(position);

  this.positions.push(position);
  this.totalBorrowed += borrowed;
  this.usedMargin += collateral;
  this.availableMargin -= collateral;
  this.totalFees += fee;

  this.updateMarginLevel();

  await this.save();
  return position;
};

// Close position
marginAccountSchema.methods.closePosition = async function(positionId) {
  const positionIndex = this.positions.findIndex(p => p.positionId === positionId);
  if (positionIndex === -1) {
    throw new Error('Position not found');
  }

  const position = this.positions[positionIndex];

  if (position.status !== 'OPEN') {
    throw new Error('Position is not open');
  }

  // Accrue final interest
  await this.accrueInterest(positionId);

  const pnl = this.calculateUnrealizedPnL(position);
  const closingValue = position.size * position.currentPrice;
  const fee = closingValue * this.tradingFee;

  const netPnL = pnl - position.interestAccrued - fee;

  position.status = 'CLOSED';
  position.closedAt = new Date();

  this.totalBorrowed -= position.borrowed;
  this.usedMargin -= position.collateral;
  this.availableMargin += position.collateral + netPnL;
  this.totalEquity += netPnL;
  this.totalPnL += netPnL;
  this.totalFees += fee;
  this.totalInterest += position.interestAccrued;

  this.updateMarginLevel();

  await this.save();

  return {
    pnl: netPnL,
    fee,
    interest: position.interestAccrued,
    finalEquity: this.totalEquity
  };
};

// Add collateral to position
marginAccountSchema.methods.addCollateral = async function(positionId, amount) {
  const position = this.positions.find(p => p.positionId === positionId);
  if (!position) {
    throw new Error('Position not found');
  }

  if (amount > this.availableMargin) {
    throw new Error('Insufficient available margin');
  }

  position.collateral += amount;
  position.marginRatio = this.calculateMarginRatio(position);
  position.liquidationPrice = this.calculateLiquidationPrice(position);

  this.availableMargin -= amount;
  this.usedMargin += amount;

  this.updateMarginLevel();

  await this.save();
  return position;
};

// Accrue interest on position
marginAccountSchema.methods.accrueInterest = async function(positionId) {
  const position = this.positions.find(p => p.positionId === positionId);
  if (!position || position.status !== 'OPEN') {
    return 0;
  }

  const now = Date.now();
  const timeSinceLastUpdate = (now - position.lastInterestUpdate.getTime()) / (1000 * 60 * 60 * 24 * 365); // in years

  if (timeSinceLastUpdate > 0) {
    const interest = position.borrowed * this.interestRate * timeSinceLastUpdate;
    position.interestAccrued += interest;
    position.lastInterestUpdate = new Date(now);

    // Update margin ratio
    position.marginRatio = this.calculateMarginRatio(position);

    await this.save();
  }

  return position.interestAccrued;
};

// Update position price
marginAccountSchema.methods.updatePositionPrice = async function(positionId, newPrice) {
  const position = this.positions.find(p => p.positionId === positionId);
  if (!position) {
    throw new Error('Position not found');
  }

  position.currentPrice = newPrice;
  position.unrealizedPnL = this.calculateUnrealizedPnL(position);
  position.marginRatio = this.calculateMarginRatio(position);

  this.updateMarginLevel();

  await this.save();
  await this.checkLiquidations();
};

// Update margin level
marginAccountSchema.methods.updateMarginLevel = function() {
  if (this.usedMargin === 0) {
    this.marginLevel = 100;
    this.riskLevel = 'LOW';
    return;
  }

  const totalUnrealizedPnL = this.positions
    .filter(p => p.status === 'OPEN')
    .reduce((sum, p) => sum + p.unrealizedPnL, 0);

  const totalInterest = this.positions
    .filter(p => p.status === 'OPEN')
    .reduce((sum, p) => sum + p.interestAccrued, 0);

  const equity = this.totalCollateral + totalUnrealizedPnL - totalInterest;
  this.marginLevel = (equity / this.usedMargin) * 100;

  // Update risk level
  if (this.marginLevel < 110) {
    this.riskLevel = 'CRITICAL';
    this.addAlert('LIQUIDATION_WARNING', 'Margin level below 110% - liquidation imminent');
  } else if (this.marginLevel < 130) {
    this.riskLevel = 'HIGH';
    this.addAlert('MARGIN_CALL', 'Margin level below 130% - add collateral to avoid liquidation');
  } else if (this.marginLevel < 200) {
    this.riskLevel = 'MEDIUM';
  } else {
    this.riskLevel = 'LOW';
  }
};

// Add alert
marginAccountSchema.methods.addAlert = function(type, message) {
  // Don't add duplicate alerts
  const hasUnacknowledged = this.alerts.some(a =>
    a.type === type && !a.acknowledged && Date.now() - a.timestamp.getTime() < 3600000
  );

  if (!hasUnacknowledged) {
    this.alerts.push({ type, message, timestamp: new Date(), acknowledged: false });
  }
};

// Check liquidations
marginAccountSchema.methods.checkLiquidations = async function() {
  const liquidations = [];

  for (let i = this.positions.length - 1; i >= 0; i--) {
    const position = this.positions[i];

    if (position.status !== 'OPEN') continue;

    const shouldLiquidate = (
      (position.side === 'LONG' && position.currentPrice <= position.liquidationPrice) ||
      (position.side === 'SHORT' && position.currentPrice >= position.liquidationPrice)
    );

    if (shouldLiquidate) {
      const pnl = this.calculateUnrealizedPnL(position);
      const liquidationFee = position.collateral * this.liquidationFee;
      const remainingCollateral = position.collateral - liquidationFee;

      position.status = 'LIQUIDATED';
      position.closedAt = new Date();

      this.totalBorrowed -= position.borrowed;
      this.usedMargin -= position.collateral;
      this.totalPnL += pnl - position.interestAccrued;
      this.totalFees += liquidationFee;
      this.totalInterest += position.interestAccrued;

      liquidations.push({
        positionId: position.positionId,
        asset: position.asset,
        side: position.side,
        size: position.size,
        pnl,
        liquidationFee,
        timestamp: new Date()
      });

      this.positions.splice(i, 1);
    }
  }

  if (liquidations.length > 0) {
    this.updateMarginLevel();
    await this.save();
  }

  return liquidations;
};

// Deposit collateral
marginAccountSchema.methods.deposit = async function(amount) {
  this.totalCollateral += amount;
  this.totalEquity += amount;
  this.availableMargin += amount;

  this.updateMarginLevel();

  await this.save();
  return { totalEquity: this.totalEquity, availableMargin: this.availableMargin };
};

// Withdraw collateral
marginAccountSchema.methods.withdraw = async function(amount) {
  if (amount > this.availableMargin) {
    throw new Error('Insufficient available margin');
  }

  this.totalCollateral -= amount;
  this.totalEquity -= amount;
  this.availableMargin -= amount;

  this.updateMarginLevel();

  await this.save();
  return { totalEquity: this.totalEquity, availableMargin: this.availableMargin };
};

// Get account statistics
marginAccountSchema.methods.getStats = function() {
  const openPositions = this.positions.filter(p => p.status === 'OPEN');

  return {
    accountId: this.accountId,
    totalEquity: this.totalEquity,
    totalCollateral: this.totalCollateral,
    totalBorrowed: this.totalBorrowed,
    availableMargin: this.availableMargin,
    usedMargin: this.usedMargin,
    marginLevel: this.marginLevel,
    riskLevel: this.riskLevel,
    totalPnL: this.totalPnL,
    totalFees: this.totalFees,
    totalInterest: this.totalInterest,
    openPositions: openPositions.length,
    totalPositions: this.positions.length,
    maxLeverage: this.maxLeverage,
    unacknowledgedAlerts: this.alerts.filter(a => !a.acknowledged).length
  };
};

module.exports = mongoose.model('MarginAccount', marginAccountSchema);
