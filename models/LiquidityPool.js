const mongoose = require('mongoose');
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');

const liquidityPoolSchema = new mongoose.Schema({
  // Pool reserves - BACKED BY REAL ASSETS
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
  },

  // Track last synced balance to detect real deposits
  lastSyncedSOL: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Sync SOL reserve with actual Solana wallet balance
liquidityPoolSchema.statics.syncSOLReserve = async function(blockchain) {
  const BRIDGE_ADDRESS = process.env.BRIDGE_SOL_ADDRESS;

  if (!BRIDGE_ADDRESS) {
    throw new Error('Bridge address not configured');
  }

  const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
  const bridgePubkey = new PublicKey(BRIDGE_ADDRESS);

  // Get actual SOL balance from Solana blockchain
  const balance = await connection.getBalance(bridgePubkey);
  const solBalance = balance / LAMPORTS_PER_SOL;

  // Calculate STRAT reserve from actual blockchain circulating supply
  let stratCirculating = 0;
  if (blockchain && blockchain.utxos) {
    for (let [key, utxo] of blockchain.utxos) {
      stratCirculating += utxo.amount;
    }
  }

  return {
    solReserve: solBalance,
    stratReserve: stratCirculating
  };
};

// Get current pool (singleton pattern) - SYNCED WITH REAL BALANCES
liquidityPoolSchema.statics.getPool = async function(blockchain) {
  let pool = await this.findOne();

  if (!pool) {
    // Initialize pool with REAL on-chain balances
    const reserves = await this.syncSOLReserve(blockchain);

    pool = await this.create({
      solReserve: reserves.solReserve,
      stratReserve: reserves.stratReserve,
      lastSyncedSOL: reserves.solReserve
    });
  } else {
    // Sync reserves with actual on-chain data on every call
    const reserves = await this.syncSOLReserve(blockchain);
    pool.solReserve = reserves.solReserve;
    pool.stratReserve = reserves.stratReserve;
    pool.lastSyncedSOL = reserves.solReserve;
    await pool.save();
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

// LIQUIDITY PROVIDER FUNCTIONS DISABLED
// Pool is backed by real SOL deposits to bridge wallet
// Only the bridge owner provides liquidity by depositing SOL to BRIDGE_ADDRESS
// Users get STRAT by sending SOL, not by adding liquidity

module.exports = mongoose.model('LiquidityPool', liquidityPoolSchema);
