const FlashLoanPool = require('../models/FlashLoan');

exports.createPool = async (req, res) => {
  try {
    const { asset, feeRate } = req.body;
    const poolId = `FL-POOL-${asset}-${Date.now()}`;
    const pool = new FlashLoanPool({ poolId, asset, feeRate: feeRate || 0.0009 });
    await pool.save();
    res.json({ success: true, pool: pool.getStats() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create pool', message: error.message });
  }
};

exports.getPools = async (req, res) => {
  try {
    const pools = await FlashLoanPool.find({ active: true });
    res.json({ success: true, pools: pools.map(p => p.getStats()), count: pools.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get pools', message: error.message });
  }
};

exports.executeFlashLoan = async (req, res) => {
  try {
    const { poolId, amount, executionSteps } = req.body;
    const pool = await FlashLoanPool.findOne({ poolId });
    if (!pool) return res.status(404).json({ error: 'Pool not found' });

    const loan = await pool.executeFlashLoan(req.user._id, amount, executionSteps);
    res.json({ success: true, loan });
  } catch (error) {
    res.status(400).json({ error: 'Failed to execute flash loan', message: error.message });
  }
};

exports.addLiquidity = async (req, res) => {
  try {
    const { poolId, amount } = req.body;
    const pool = await FlashLoanPool.findOne({ poolId });
    if (!pool) return res.status(404).json({ error: 'Pool not found' });

    const result = await pool.addLiquidity(req.user._id, amount);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ error: 'Failed to add liquidity', message: error.message });
  }
};

exports.removeLiquidity = async (req, res) => {
  try {
    const { poolId, providerId } = req.body;
    const pool = await FlashLoanPool.findOne({ poolId });
    if (!pool) return res.status(404).json({ error: 'Pool not found' });

    const result = await pool.removeLiquidity(providerId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ error: 'Failed to remove liquidity', message: error.message });
  }
};

exports.getLoanStats = async (req, res) => {
  try {
    const { poolId } = req.params;
    const { timeframe } = req.query;
    const pool = await FlashLoanPool.findOne({ poolId });
    if (!pool) return res.status(404).json({ error: 'Pool not found' });

    const stats = pool.getLoanStats(parseInt(timeframe) || 24);
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats', message: error.message });
  }
};

module.exports = exports;
