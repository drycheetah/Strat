const LiquidityPool = require('../models/LiquidityPool');
const Wallet = require('../models/Wallet');
const logger = require('../utils/logger');

/**
 * Get pool information - BACKED BY REAL SOL
 */
exports.getPoolInfo = async (req, res) => {
  try {
    const pool = await LiquidityPool.getPool(req.blockchain);

    res.json({
      success: true,
      pool: {
        solReserve: pool.solReserve,
        stratReserve: pool.stratReserve,
        price: pool.getPrice(),
        priceUSD: pool.getPriceUSD(),
        volume24h: pool.volume24h,
        trades24h: pool.trades24h,
        feePercent: pool.feePercent,
        backedByRealAssets: true,
        bridgeAddress: process.env.BRIDGE_SOL_ADDRESS
      }
    });
  } catch (error) {
    logger.error(`Get pool info error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get pool info',
      message: error.message
    });
  }
};

/**
 * Calculate swap output
 */
exports.calculateSwap = async (req, res) => {
  try {
    const { amountIn, isSOLInput } = req.body;

    if (!amountIn || amountIn <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be greater than 0'
      });
    }

    const pool = await LiquidityPool.getPool();
    const amountOut = pool.getAmountOut(parseFloat(amountIn), isSOLInput === true || isSOLInput === 'true');

    const priceImpact = ((amountIn / (isSOLInput ? pool.solReserve : pool.stratReserve)) * 100).toFixed(2);

    res.json({
      success: true,
      amountIn: parseFloat(amountIn),
      amountOut,
      priceImpact: parseFloat(priceImpact),
      currentPrice: pool.getPrice(),
      minimumReceived: amountOut * 0.99 // 1% slippage
    });
  } catch (error) {
    logger.error(`Calculate swap error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to calculate swap',
      message: error.message
    });
  }
};

/**
 * LIQUIDITY PROVIDER FUNCTIONS DISABLED
 *
 * This pool is backed by real SOL deposits to the bridge wallet.
 * Only the bridge owner provides liquidity by sending SOL to BRIDGE_SOL_ADDRESS.
 * Users acquire STRAT through the bridge, not by adding liquidity.
 */

exports.addLiquidity = async (req, res) => {
  res.status(403).json({
    error: 'Liquidity provision disabled',
    message: 'This pool is backed by real SOL. To acquire STRAT, use the SOL Bridge.',
    bridgeInfo: '/api/bridge/info'
  });
};

exports.removeLiquidity = async (req, res) => {
  res.status(403).json({
    error: 'Liquidity provision disabled',
    message: 'This pool is backed by real SOL reserves managed by the bridge operator.'
  });
};

exports.getUserPosition = async (req, res) => {
  res.json({
    success: true,
    position: {
      lpTokens: 0,
      poolShare: '0.0000',
      solAmount: 0,
      stratAmount: 0,
      valueUSD: 0,
      note: 'Liquidity provision is disabled. Pool backed by bridge operator.'
    }
  });
};

module.exports = {
  getPoolInfo: exports.getPoolInfo,
  calculateSwap: exports.calculateSwap,
  addLiquidity: exports.addLiquidity,
  removeLiquidity: exports.removeLiquidity,
  getUserPosition: exports.getUserPosition
};
