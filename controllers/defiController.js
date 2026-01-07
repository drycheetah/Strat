/**
 * DeFi Controller
 * Handles liquidity pools, yield farming, lending, and AMM functionality
 */

const LiquidityPool = require('../models/LiquidityPool');
const YieldFarm = require('../models/YieldFarm');
const LendingPool = require('../models/LendingPool');
const { Transaction } = require('../src/transaction');
const Wallet = require('../models/Wallet');

/**
 * Create a new liquidity pool
 */
exports.createPool = async (req, res) => {
  try {
    const { tokenA, tokenB, amountA, amountB, fee } = req.body;

    const pool = new LiquidityPool({
      tokenA,
      tokenB,
      reserveA: amountA,
      reserveB: amountB,
      fee: fee || 0.3, // 0.3% default fee
      totalLiquidity: Math.sqrt(amountA * amountB),
      creator: req.user._id,
    });

    await pool.save();

    res.json({
      success: true,
      pool: {
        id: pool._id,
        tokenA: pool.tokenA,
        tokenB: pool.tokenB,
        reserveA: pool.reserveA,
        reserveB: pool.reserveB,
        totalLiquidity: pool.totalLiquidity,
      },
    });
  } catch (error) {
    console.error('Create pool error:', error);
    res.status(500).json({
      error: 'Failed to create liquidity pool',
      message: error.message,
    });
  }
};

/**
 * Add liquidity to a pool
 */
exports.addLiquidity = async (req, res) => {
  try {
    const { poolId, amountA, amountB } = req.body;

    const pool = await LiquidityPool.findById(poolId);
    if (!pool) {
      return res.status(404).json({ error: 'Pool not found' });
    }

    // Calculate optimal amounts based on current ratio
    const ratioA = pool.reserveA / pool.reserveB;
    const optimalAmountB = amountA / ratioA;

    if (Math.abs(optimalAmountB - amountB) > amountB * 0.05) {
      return res.status(400).json({
        error: 'Amount ratio mismatch',
        message: `Expected ${optimalAmountB} of tokenB for ${amountA} of tokenA`,
      });
    }

    // Calculate LP tokens to mint
    const liquidityMinted = (amountA / pool.reserveA) * pool.totalLiquidity;

    pool.reserveA += amountA;
    pool.reserveB += amountB;
    pool.totalLiquidity += liquidityMinted;

    await pool.save();

    res.json({
      success: true,
      liquidityMinted,
      totalLiquidity: pool.totalLiquidity,
      shareOfPool: (liquidityMinted / pool.totalLiquidity) * 100,
    });
  } catch (error) {
    console.error('Add liquidity error:', error);
    res.status(500).json({
      error: 'Failed to add liquidity',
      message: error.message,
    });
  }
};

/**
 * Swap tokens using AMM
 */
exports.swap = async (req, res) => {
  try {
    const { poolId, tokenIn, amountIn, minAmountOut } = req.body;

    const pool = await LiquidityPool.findById(poolId);
    if (!pool) {
      return res.status(404).json({ error: 'Pool not found' });
    }

    // Calculate output amount using constant product formula: x * y = k
    const isTokenA = tokenIn === pool.tokenA;
    const reserveIn = isTokenA ? pool.reserveA : pool.reserveB;
    const reserveOut = isTokenA ? pool.reserveB : pool.reserveA;

    const amountInWithFee = amountIn * (1 - pool.fee / 100);
    const amountOut =
      (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);

    if (amountOut < minAmountOut) {
      return res.status(400).json({
        error: 'Slippage too high',
        expectedMin: minAmountOut,
        actualAmount: amountOut,
      });
    }

    // Update reserves
    if (isTokenA) {
      pool.reserveA += amountIn;
      pool.reserveB -= amountOut;
    } else {
      pool.reserveB += amountIn;
      pool.reserveA -= amountOut;
    }

    pool.volume24h += amountIn;
    await pool.save();

    res.json({
      success: true,
      amountOut,
      priceImpact: ((amountOut / reserveOut) * 100).toFixed(2),
      newPrice: pool.reserveB / pool.reserveA,
    });
  } catch (error) {
    console.error('Swap error:', error);
    res.status(500).json({
      error: 'Failed to swap',
      message: error.message,
    });
  }
};

/**
 * Get all liquidity pools
 */
exports.getPools = async (req, res) => {
  try {
    const pools = await LiquidityPool.find()
      .sort({ totalLiquidity: -1 })
      .limit(50);

    const poolsData = pools.map((pool) => ({
      id: pool._id,
      tokenA: pool.tokenA,
      tokenB: pool.tokenB,
      reserveA: pool.reserveA,
      reserveB: pool.reserveB,
      totalLiquidity: pool.totalLiquidity,
      volume24h: pool.volume24h,
      apy: pool.calculateAPY(),
      price: pool.reserveB / pool.reserveA,
    }));

    res.json({
      success: true,
      pools: poolsData,
      count: poolsData.length,
    });
  } catch (error) {
    console.error('Get pools error:', error);
    res.status(500).json({
      error: 'Failed to get pools',
      message: error.message,
    });
  }
};

/**
 * Create yield farm
 */
exports.createFarm = async (req, res) => {
  try {
    const { poolId, rewardToken, rewardPerBlock, startBlock, endBlock } =
      req.body;

    const farm = new YieldFarm({
      pool: poolId,
      rewardToken,
      rewardPerBlock,
      startBlock,
      endBlock,
      creator: req.user._id,
    });

    await farm.save();

    res.json({
      success: true,
      farm: {
        id: farm._id,
        poolId: farm.pool,
        rewardPerBlock: farm.rewardPerBlock,
        apy: await farm.calculateAPY(),
      },
    });
  } catch (error) {
    console.error('Create farm error:', error);
    res.status(500).json({
      error: 'Failed to create farm',
      message: error.message,
    });
  }
};

/**
 * Stake in yield farm
 */
exports.stakeFarm = async (req, res) => {
  try {
    const { farmId, amount } = req.body;

    const farm = await YieldFarm.findById(farmId);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found' });
    }

    await farm.stake(req.user._id, amount);

    res.json({
      success: true,
      staked: amount,
      totalStaked: farm.totalStaked,
      pendingRewards: await farm.getPendingRewards(req.user._id),
    });
  } catch (error) {
    console.error('Stake farm error:', error);
    res.status(500).json({
      error: 'Failed to stake',
      message: error.message,
    });
  }
};

/**
 * Supply to lending pool
 */
exports.supply = async (req, res) => {
  try {
    const { token, amount } = req.body;

    let pool = await LendingPool.findOne({ token });
    if (!pool) {
      pool = new LendingPool({ token });
      await pool.save();
    }

    await pool.supply(req.user._id, amount);

    res.json({
      success: true,
      supplied: amount,
      totalSupplied: pool.totalSupplied,
      supplyAPY: pool.supplyAPY,
    });
  } catch (error) {
    console.error('Supply error:', error);
    res.status(500).json({
      error: 'Failed to supply',
      message: error.message,
    });
  }
};

/**
 * Borrow from lending pool
 */
exports.borrow = async (req, res) => {
  try {
    const { token, amount } = req.body;

    const pool = await LendingPool.findOne({ token });
    if (!pool) {
      return res.status(404).json({ error: 'Lending pool not found' });
    }

    await pool.borrow(req.user._id, amount);

    res.json({
      success: true,
      borrowed: amount,
      totalBorrowed: pool.totalBorrowed,
      borrowAPY: pool.borrowAPY,
      healthFactor: await pool.getHealthFactor(req.user._id),
    });
  } catch (error) {
    console.error('Borrow error:', error);
    res.status(500).json({
      error: 'Failed to borrow',
      message: error.message,
    });
  }
};

/**
 * Get lending pools
 */
exports.getLendingPools = async (req, res) => {
  try {
    const pools = await LendingPool.find();

    const poolsData = pools.map((pool) => ({
      token: pool.token,
      totalSupplied: pool.totalSupplied,
      totalBorrowed: pool.totalBorrowed,
      utilizationRate: (pool.totalBorrowed / pool.totalSupplied) * 100,
      supplyAPY: pool.supplyAPY,
      borrowAPY: pool.borrowAPY,
      available: pool.totalSupplied - pool.totalBorrowed,
    }));

    res.json({
      success: true,
      pools: poolsData,
    });
  } catch (error) {
    console.error('Get lending pools error:', error);
    res.status(500).json({
      error: 'Failed to get lending pools',
      message: error.message,
    });
  }
};

module.exports = exports;
