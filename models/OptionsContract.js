const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  optionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: ['CALL', 'PUT'],
    required: true
  },
  style: {
    type: String,
    enum: ['EUROPEAN', 'AMERICAN'],
    default: 'EUROPEAN'
  },
  underlyingAsset: {
    type: String,
    required: true
  },
  strikePrice: {
    type: Number,
    required: true,
    min: 0
  },
  premium: {
    type: Number,
    required: true,
    min: 0
  },
  expiryDate: {
    type: Date,
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  collateral: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'EXERCISED', 'EXPIRED', 'CANCELLED'],
    default: 'ACTIVE'
  },
  exercisedAt: Date,
  exercisePrice: Number,
  pnl: Number,
  impliedVolatility: {
    type: Number,
    min: 0,
    max: 5
  },
  delta: Number,
  gamma: Number,
  theta: Number,
  vega: Number,
  rho: Number
}, { timestamps: true });

const optionsContractSchema = new mongoose.Schema({
  pair: {
    type: String,
    required: true,
    index: true
  },
  baseAsset: {
    type: String,
    required: true
  },
  currentPrice: {
    type: Number,
    required: true
  },
  volatility: {
    type: Number,
    default: 0.5
  },
  riskFreeRate: {
    type: Number,
    default: 0.05
  },
  options: [optionSchema],
  totalVolume24h: {
    type: Number,
    default: 0
  },
  totalOpenInterest: {
    type: Number,
    default: 0
  },
  strikeDistribution: [{
    strike: Number,
    callCount: { type: Number, default: 0 },
    putCount: { type: Number, default: 0 },
    callVolume: { type: Number, default: 0 },
    putVolume: { type: Number, default: 0 }
  }],
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Black-Scholes formula for option pricing
optionsContractSchema.methods.calculateBlackScholes = function(type, strikePrice, timeToExpiry, volatility = null) {
  const S = this.currentPrice; // Current price
  const K = strikePrice; // Strike price
  const T = timeToExpiry; // Time to expiry in years
  const r = this.riskFreeRate; // Risk-free rate
  const sigma = volatility || this.volatility; // Volatility

  if (T <= 0) return 0;

  const d1 = (Math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  // Cumulative normal distribution function
  const normalCDF = (x) => {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - p : p;
  };

  if (type === 'CALL') {
    return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  } else {
    return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
  }
};

// Calculate Greeks
optionsContractSchema.methods.calculateGreeks = function(type, strikePrice, timeToExpiry, volatility = null) {
  const S = this.currentPrice;
  const K = strikePrice;
  const T = timeToExpiry;
  const r = this.riskFreeRate;
  const sigma = volatility || this.volatility;

  if (T <= 0) {
    return { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
  }

  const d1 = (Math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  const normalCDF = (x) => {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - p : p;
  };

  const normalPDF = (x) => {
    return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
  };

  let delta, theta, rho;

  if (type === 'CALL') {
    delta = normalCDF(d1);
    theta = (-S * normalPDF(d1) * sigma / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * normalCDF(d2)) / 365;
    rho = K * T * Math.exp(-r * T) * normalCDF(d2) / 100;
  } else {
    delta = normalCDF(d1) - 1;
    theta = (-S * normalPDF(d1) * sigma / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * normalCDF(-d2)) / 365;
    rho = -K * T * Math.exp(-r * T) * normalCDF(-d2) / 100;
  }

  const gamma = normalPDF(d1) / (S * sigma * Math.sqrt(T));
  const vega = S * normalPDF(d1) * Math.sqrt(T) / 100;

  return { delta, gamma, theta, vega, rho };
};

// Create a new option
optionsContractSchema.methods.createOption = async function(seller, type, style, strikePrice, expiryDate, collateral) {
  const now = Date.now();
  const timeToExpiry = (expiryDate.getTime() - now) / (1000 * 60 * 60 * 24 * 365); // in years

  if (timeToExpiry <= 0) {
    throw new Error('Expiry date must be in the future');
  }

  // Calculate premium using Black-Scholes
  const premium = this.calculateBlackScholes(type, strikePrice, timeToExpiry);

  // Calculate Greeks
  const greeks = this.calculateGreeks(type, strikePrice, timeToExpiry);

  // Calculate implied volatility (simplified - using current volatility)
  const impliedVolatility = this.volatility;

  const optionId = `${this.pair}-${type}-${strikePrice}-${expiryDate.getTime()}-${Date.now()}`;

  const option = {
    optionId,
    type,
    style,
    underlyingAsset: this.baseAsset,
    strikePrice,
    premium,
    expiryDate,
    seller,
    collateral,
    status: 'ACTIVE',
    impliedVolatility,
    ...greeks
  };

  this.options.push(option);
  this.totalOpenInterest += 1;

  // Update strike distribution
  let strikeLevel = this.strikeDistribution.find(s => s.strike === strikePrice);
  if (!strikeLevel) {
    strikeLevel = { strike: strikePrice, callCount: 0, putCount: 0, callVolume: 0, putVolume: 0 };
    this.strikeDistribution.push(strikeLevel);
  }

  if (type === 'CALL') {
    strikeLevel.callCount += 1;
  } else {
    strikeLevel.putCount += 1;
  }

  await this.save();
  return option;
};

// Buy an option
optionsContractSchema.methods.buyOption = async function(optionId, buyer) {
  const option = this.options.find(o => o.optionId === optionId);
  if (!option) {
    throw new Error('Option not found');
  }

  if (option.status !== 'ACTIVE') {
    throw new Error('Option is not available for purchase');
  }

  if (option.buyer) {
    throw new Error('Option already sold');
  }

  option.buyer = buyer;
  this.totalVolume24h += option.premium;

  // Update strike distribution volume
  const strikeLevel = this.strikeDistribution.find(s => s.strike === option.strikePrice);
  if (strikeLevel) {
    if (option.type === 'CALL') {
      strikeLevel.callVolume += option.premium;
    } else {
      strikeLevel.putVolume += option.premium;
    }
  }

  await this.save();
  return { premium: option.premium, option };
};

// Exercise an option
optionsContractSchema.methods.exerciseOption = async function(optionId) {
  const option = this.options.find(o => o.optionId === optionId);
  if (!option) {
    throw new Error('Option not found');
  }

  if (option.status !== 'ACTIVE') {
    throw new Error('Option cannot be exercised');
  }

  if (!option.buyer) {
    throw new Error('Option has no buyer');
  }

  const now = new Date();

  // Check if option can be exercised based on style
  if (option.style === 'EUROPEAN' && now < option.expiryDate) {
    throw new Error('European option can only be exercised at expiry');
  }

  if (now > option.expiryDate) {
    throw new Error('Option has expired');
  }

  // Calculate profit/loss
  let exerciseValue = 0;
  if (option.type === 'CALL') {
    exerciseValue = Math.max(0, this.currentPrice - option.strikePrice);
  } else {
    exerciseValue = Math.max(0, option.strikePrice - this.currentPrice);
  }

  if (exerciseValue === 0) {
    throw new Error('Option is out of the money');
  }

  option.status = 'EXERCISED';
  option.exercisedAt = now;
  option.exercisePrice = this.currentPrice;
  option.pnl = exerciseValue - option.premium;

  this.totalOpenInterest -= 1;

  await this.save();

  return {
    exerciseValue,
    pnl: option.pnl,
    premium: option.premium
  };
};

// Expire options
optionsContractSchema.methods.expireOptions = async function() {
  const now = new Date();
  const expiredOptions = [];

  for (let option of this.options) {
    if (option.status === 'ACTIVE' && now >= option.expiryDate) {
      let finalValue = 0;

      if (option.buyer) {
        // Calculate intrinsic value at expiry
        if (option.type === 'CALL') {
          finalValue = Math.max(0, this.currentPrice - option.strikePrice);
        } else {
          finalValue = Math.max(0, option.strikePrice - this.currentPrice);
        }

        option.pnl = finalValue - option.premium;
      }

      option.status = 'EXPIRED';
      option.exercisePrice = this.currentPrice;
      this.totalOpenInterest -= 1;

      expiredOptions.push({
        optionId: option.optionId,
        type: option.type,
        strikePrice: option.strikePrice,
        finalValue,
        pnl: option.pnl
      });
    }
  }

  if (expiredOptions.length > 0) {
    await this.save();
  }

  return expiredOptions;
};

// Update current price and recalculate Greeks
optionsContractSchema.methods.updatePrice = async function(newPrice) {
  this.currentPrice = newPrice;

  // Recalculate Greeks for all active options
  for (let option of this.options) {
    if (option.status === 'ACTIVE') {
      const now = Date.now();
      const timeToExpiry = (option.expiryDate.getTime() - now) / (1000 * 60 * 60 * 24 * 365);

      if (timeToExpiry > 0) {
        const greeks = this.calculateGreeks(option.type, option.strikePrice, timeToExpiry);
        option.delta = greeks.delta;
        option.gamma = greeks.gamma;
        option.theta = greeks.theta;
        option.vega = greeks.vega;
        option.rho = greeks.rho;
      }
    }
  }

  await this.save();
};

// Get option chain (all strikes and types)
optionsContractSchema.methods.getOptionChain = function(expiryDate = null) {
  let options = this.options.filter(o => o.status === 'ACTIVE');

  if (expiryDate) {
    options = options.filter(o => o.expiryDate.getTime() === new Date(expiryDate).getTime());
  }

  const chain = {};

  options.forEach(option => {
    const strike = option.strikePrice;
    if (!chain[strike]) {
      chain[strike] = { calls: [], puts: [] };
    }

    const optionData = {
      optionId: option.optionId,
      premium: option.premium,
      expiryDate: option.expiryDate,
      impliedVolatility: option.impliedVolatility,
      delta: option.delta,
      gamma: option.gamma,
      theta: option.theta,
      vega: option.vega,
      buyer: option.buyer ? true : false
    };

    if (option.type === 'CALL') {
      chain[strike].calls.push(optionData);
    } else {
      chain[strike].puts.push(optionData);
    }
  });

  return chain;
};

// Get contract statistics
optionsContractSchema.methods.getStats = function() {
  const activeOptions = this.options.filter(o => o.status === 'ACTIVE');

  return {
    pair: this.pair,
    currentPrice: this.currentPrice,
    volatility: this.volatility,
    totalOpenInterest: this.totalOpenInterest,
    totalVolume24h: this.totalVolume24h,
    activeOptions: activeOptions.length,
    callsCount: activeOptions.filter(o => o.type === 'CALL').length,
    putsCount: activeOptions.filter(o => o.type === 'PUT').length,
    putCallRatio: activeOptions.filter(o => o.type === 'CALL').length > 0
      ? activeOptions.filter(o => o.type === 'PUT').length / activeOptions.filter(o => o.type === 'CALL').length
      : 0,
    strikeDistribution: this.strikeDistribution.sort((a, b) => a.strike - b.strike)
  };
};

module.exports = mongoose.model('OptionsContract', optionsContractSchema);
