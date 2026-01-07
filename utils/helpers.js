// Helper utility functions for STRAT blockchain

const crypto = require('crypto');
const { PRECISION } = require('./constants');

/**
 * Format STRAT amount with proper decimal precision
 */
exports.formatSTRAT = (amount) => {
  return parseFloat(amount).toFixed(PRECISION.STRAT);
};

/**
 * Format USD amount
 */
exports.formatUSD = (amount) => {
  return parseFloat(amount).toFixed(PRECISION.USD);
};

/**
 * Format percentage
 */
exports.formatPercentage = (value) => {
  return parseFloat(value * 100).toFixed(PRECISION.PERCENTAGE) + '%';
};

/**
 * Generate random hash
 */
exports.generateHash = (data) => {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
};

/**
 * Validate Ethereum-style address
 */
exports.isValidAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Validate transaction hash
 */
exports.isValidTxHash = (hash) => {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
};

/**
 * Calculate time remaining
 */
exports.getTimeRemaining = (endTime) => {
  const now = Date.now();
  const remaining = endTime - now;

  if (remaining <= 0) {
    return { expired: true, remaining: 0 };
  }

  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return {
    expired: false,
    remaining,
    days,
    hours,
    minutes,
    seconds,
    formatted: `${days}d ${hours}h ${minutes}m ${seconds}s`
  };
};

/**
 * Calculate APY
 */
exports.calculateAPY = (principal, rate, time) => {
  const periods = time / 31536000000; // Convert time to years
  return principal * Math.pow((1 + rate), periods) - principal;
};

/**
 * Calculate APR from APY
 */
exports.aprToApy = (apr, compounds = 365) => {
  return Math.pow(1 + apr / compounds, compounds) - 1;
};

/**
 * Calculate slippage
 */
exports.calculateSlippage = (expected, actual) => {
  return Math.abs((actual - expected) / expected);
};

/**
 * Calculate price impact
 */
exports.calculatePriceImpact = (reserveIn, reserveOut, amountIn) => {
  const k = reserveIn * reserveOut;
  const newReserveIn = reserveIn + amountIn;
  const newReserveOut = k / newReserveIn;
  const amountOut = reserveOut - newReserveOut;

  const executionPrice = amountIn / amountOut;
  const marketPrice = reserveOut / reserveIn;

  return (executionPrice - marketPrice) / marketPrice;
};

/**
 * Paginate array
 */
exports.paginate = (array, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const paginatedItems = array.slice(offset, offset + limit);

  return {
    data: paginatedItems,
    pagination: {
      page,
      limit,
      total: array.length,
      totalPages: Math.ceil(array.length / limit),
      hasNext: offset + limit < array.length,
      hasPrev: page > 1
    }
  };
};

/**
 * Sleep/delay function
 */
exports.sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry function with exponential backoff
 */
exports.retry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await exports.sleep(delay);
    return exports.retry(fn, retries - 1, delay * 2);
  }
};

/**
 * Generate random number between min and max
 */
exports.randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Shuffle array
 */
exports.shuffle = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Calculate Merkle root
 */
exports.calculateMerkleRoot = (transactions) => {
  if (transactions.length === 0) return null;
  if (transactions.length === 1) return transactions[0];

  const hashes = transactions.map(tx =>
    crypto.createHash('sha256').update(JSON.stringify(tx)).digest('hex')
  );

  while (hashes.length > 1) {
    const newLevel = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] || left;
      const combined = crypto.createHash('sha256')
        .update(left + right)
        .digest('hex');
      newLevel.push(combined);
    }
    hashes.length = 0;
    hashes.push(...newLevel);
  }

  return hashes[0];
};

/**
 * Validate email
 */
exports.isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Sanitize string for display
 */
exports.sanitize = (str) => {
  return str.replace(/[<>]/g, '');
};

/**
 * Calculate transaction fee
 */
exports.calculateTxFee = (txSize, gasPrice) => {
  return txSize * gasPrice;
};

/**
 * Estimate gas for transaction
 */
exports.estimateGas = (tx) => {
  // Basic estimation - can be made more sophisticated
  const baseGas = 21000;
  const dataGas = tx.data ? tx.data.length * 68 : 0;
  return baseGas + dataGas;
};

/**
 * Convert Wei to STRAT
 */
exports.weiToSTRAT = (wei) => {
  return wei / Math.pow(10, 18);
};

/**
 * Convert STRAT to Wei
 */
exports.stratToWei = (strat) => {
  return strat * Math.pow(10, 18);
};

/**
 * Check if value is within range
 */
exports.inRange = (value, min, max) => {
  return value >= min && value <= max;
};

/**
 * Clamp value between min and max
 */
exports.clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Deep clone object
 */
exports.deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if object is empty
 */
exports.isEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};

/**
 * Group array by key
 */
exports.groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) result[group] = [];
    result[group].push(item);
    return result;
  }, {});
};

/**
 * Calculate moving average
 */
exports.movingAverage = (data, period) => {
  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const average = slice.reduce((sum, val) => sum + val, 0) / period;
    result.push(average);
  }
  return result;
};

/**
 * Calculate standard deviation
 */
exports.standardDeviation = (values) => {
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squareDiffs = values.map(val => Math.pow(val - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
};

/**
 * Generate UUID
 */
exports.generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Truncate address for display
 */
exports.truncateAddress = (address, start = 6, end = 4) => {
  if (!address) return '';
  return `${address.slice(0, start)}...${address.slice(-end)}`;
};

/**
 * Format large numbers (1000 => 1K)
 */
exports.formatNumber = (num) => {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toString();
};

/**
 * Calculate time ago
 */
exports.timeAgo = (timestamp) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1
  };

  for (const [name, value] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / value);
    if (interval >= 1) {
      return interval === 1 ? `1 ${name} ago` : `${interval} ${name}s ago`;
    }
  }

  return 'just now';
};

/**
 * Debounce function
 */
exports.debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 */
exports.throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};
