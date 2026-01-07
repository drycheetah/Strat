const ConcentratedLiquidity = require('../models/ConcentratedLiquidity');

exports.createPool = async (req, res) => {
  try {
    const { token0, token1, fee, initialPrice, tickSpacing } = req.body;
    const poolId = `CL-${token0}-${token1}-${Date.now()}`;

    const pool = new ConcentratedLiquidity({
      poolId,
      token0,
      token1,
      fee: fee || 0.003,
      currentPrice: initialPrice,
      sqrtPriceX96: new ConcentratedLiquidity().priceToSqrtPriceX96(initialPrice),
      currentTick: new ConcentratedLiquidity().priceToTick(initialPrice),
      tickSpacing: tickSpacing || 60
    });

    await pool.save();
    res.json({ success: true, pool: pool.getStats() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create pool', message: error.message });
  }
};

exports.getPools = async (req, res) => {
  try {
    const pools = await ConcentratedLiquidity.find({ active: true });
    res.json({ success: true, pools: pools.map(p => p.getStats()), count: pools.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get pools', message: error.message });
  }
};

exports.mintPosition = async (req, res) => {
  try {
    const { poolId, tickLower, tickUpper, amount0Desired, amount1Desired } = req.body;
    const pool = await ConcentratedLiquidity.findOne({ poolId });
    if (!pool) return res.status(404).json({ error: 'Pool not found' });

    const position = await pool.mint(req.user._id, tickLower, tickUpper, amount0Desired, amount1Desired);
    res.json({ success: true, position });
  } catch (error) {
    res.status(400).json({ error: 'Failed to mint position', message: error.message });
  }
};

exports.burnPosition = async (req, res) => {
  try {
    const { poolId, positionId } = req.body;
    const pool = await ConcentratedLiquidity.findOne({ poolId });
    if (!pool) return res.status(404).json({ error: 'Pool not found' });

    const result = await pool.burn(positionId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ error: 'Failed to burn position', message: error.message });
  }
};

exports.swap = async (req, res) => {
  try {
    const { poolId, zeroForOne, amountSpecified } = req.body;
    const pool = await ConcentratedLiquidity.findOne({ poolId });
    if (!pool) return res.status(404).json({ error: 'Pool not found' });

    const result = await pool.swap(zeroForOne, amountSpecified);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ error: 'Failed to swap', message: error.message });
  }
};

exports.collectFees = async (req, res) => {
  try {
    const { poolId, positionId } = req.body;
    const pool = await ConcentratedLiquidity.findOne({ poolId });
    if (!pool) return res.status(404).json({ error: 'Pool not found' });

    const fees = await pool.collectFees(positionId);
    res.json({ success: true, fees });
  } catch (error) {
    res.status(400).json({ error: 'Failed to collect fees', message: error.message });
  }
};

exports.getPositionInfo = async (req, res) => {
  try {
    const { poolId, positionId } = req.params;
    const pool = await ConcentratedLiquidity.findOne({ poolId });
    if (!pool) return res.status(404).json({ error: 'Pool not found' });

    const position = pool.getPositionInfo(positionId);
    res.json({ success: true, position });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get position', message: error.message });
  }
};

exports.getLiquidityDistribution = async (req, res) => {
  try {
    const { poolId } = req.params;
    const pool = await ConcentratedLiquidity.findOne({ poolId });
    if (!pool) return res.status(404).json({ error: 'Pool not found' });

    const distribution = pool.getLiquidityDistribution();
    res.json({ success: true, distribution });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get distribution', message: error.message });
  }
};

module.exports = exports;
