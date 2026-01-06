const LiquidityPool = require('../models/LiquidityPool');
const Wallet = require('../models/Wallet');
const logger = require('../utils/logger');

/**
 * Get pool information
 */
exports.getPoolInfo = async (req, res) => {
  try {
    const pool = await LiquidityPool.getPool();

    res.json({
      success: true,
      pool: {
        solReserve: pool.solReserve,
        stratReserve: pool.stratReserve,
        totalLPTokens: pool.totalLPTokens,
        price: pool.getPrice(),
        priceUSD: pool.getPriceUSD(),
        volume24h: pool.volume24h,
        trades24h: pool.trades24h,
        feePercent: pool.feePercent
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
 * Add liquidity to pool
 */
exports.addLiquidity = async (req, res) => {
  try {
    const { solAmount, stratAmount } = req.body;
    const userId = req.user._id;

    if (!solAmount || !stratAmount || solAmount <= 0 || stratAmount <= 0) {
      return res.status(400).json({
        error: 'Invalid amounts',
        message: 'Both SOL and STRAT amounts must be greater than 0'
      });
    }

    // Get user wallet
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Check if user has enough STRAT
    if (wallet.balance < parseFloat(stratAmount)) {
      return res.status(400).json({
        error: 'Insufficient STRAT balance',
        message: `You have ${wallet.balance} STRAT, but trying to add ${stratAmount}`
      });
    }

    // Note: For SOL, we'd need to verify they sent SOL to a deposit address
    // For now, this is a simplified version

    const pool = await LiquidityPool.getPool();
    const result = await pool.addLiquidity(parseFloat(solAmount), parseFloat(stratAmount));

    // Deduct STRAT from wallet
    wallet.balance -= parseFloat(stratAmount);

    // Store LP tokens in wallet (we'd need to add lpTokens field to wallet model)
    if (!wallet.lpTokens) {
      wallet.lpTokens = 0;
    }
    wallet.lpTokens += result.lpTokens;

    await wallet.save();

    logger.info(`User ${userId} added liquidity: ${solAmount} SOL, ${stratAmount} STRAT`);

    res.json({
      success: true,
      message: 'Liquidity added successfully',
      lpTokens: result.lpTokens,
      totalLPTokens: wallet.lpTokens,
      poolShare: ((result.lpTokens / result.totalLPTokens) * 100).toFixed(4)
    });
  } catch (error) {
    logger.error(`Add liquidity error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to add liquidity',
      message: error.message
    });
  }
};

/**
 * Remove liquidity from pool
 */
exports.removeLiquidity = async (req, res) => {
  try {
    const { lpTokens } = req.body;
    const userId = req.user._id;

    if (!lpTokens || lpTokens <= 0) {
      return res.status(400).json({
        error: 'Invalid LP token amount',
        message: 'LP tokens must be greater than 0'
      });
    }

    // Get user wallet
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    if (!wallet.lpTokens || wallet.lpTokens < parseFloat(lpTokens)) {
      return res.status(400).json({
        error: 'Insufficient LP tokens',
        message: `You have ${wallet.lpTokens || 0} LP tokens`
      });
    }

    const pool = await LiquidityPool.getPool();
    const result = await pool.removeLiquidity(parseFloat(lpTokens));

    // Update wallet
    wallet.lpTokens -= parseFloat(lpTokens);
    wallet.balance += result.stratAmount;
    // Note: SOL would be sent back to their Solana wallet

    await wallet.save();

    logger.info(`User ${userId} removed liquidity: ${result.solAmount} SOL, ${result.stratAmount} STRAT`);

    res.json({
      success: true,
      message: 'Liquidity removed successfully',
      solReturned: result.solAmount,
      stratReturned: result.stratAmount,
      lpTokensBurned: result.lpTokensBurned,
      remainingLPTokens: wallet.lpTokens
    });
  } catch (error) {
    logger.error(`Remove liquidity error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to remove liquidity',
      message: error.message
    });
  }
};

/**
 * Get user's liquidity position
 */
exports.getUserPosition = async (req, res) => {
  try {
    const userId = req.user._id;

    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const pool = await LiquidityPool.getPool();

    const lpTokens = wallet.lpTokens || 0;
    const poolShare = pool.totalLPTokens > 0 ? (lpTokens / pool.totalLPTokens) : 0;

    const solAmount = pool.solReserve * poolShare;
    const stratAmount = pool.stratReserve * poolShare;

    res.json({
      success: true,
      position: {
        lpTokens,
        poolShare: (poolShare * 100).toFixed(4),
        solAmount,
        stratAmount,
        valueUSD: (solAmount * 140) + (stratAmount * pool.getPriceUSD())
      }
    });
  } catch (error) {
    logger.error(`Get user position error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get position',
      message: error.message
    });
  }
};

module.exports = {
  getPoolInfo: exports.getPoolInfo,
  calculateSwap: exports.calculateSwap,
  addLiquidity: exports.addLiquidity,
  removeLiquidity: exports.removeLiquidity,
  getUserPosition: exports.getUserPosition
};
