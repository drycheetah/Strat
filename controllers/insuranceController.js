const InsurancePool = require('../models/InsurancePool');

exports.createPool = async (req, res) => {
  try {
    const { poolName, poolType, premiumRate } = req.body;
    const pool = new InsurancePool({ poolName, poolType, premiumRate: premiumRate || 0.02 });
    await pool.save();
    res.json({ success: true, pool: pool.getStats() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create pool', message: error.message });
  }
};

exports.getPools = async (req, res) => {
  try {
    const pools = await InsurancePool.find({ active: true });
    res.json({ success: true, pools: pools.map(p => p.getStats()), count: pools.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get pools', message: error.message });
  }
};

exports.purchasePolicy = async (req, res) => {
  try {
    const { poolName, coverageType, coveredAmount, coveragePeriod, coveredProtocol, coveredAddress } = req.body;
    const pool = await InsurancePool.findOne({ poolName });
    if (!pool) return res.status(404).json({ error: 'Pool not found' });

    const policy = await pool.purchasePolicy(req.user._id, coverageType, coveredAmount, coveragePeriod, coveredProtocol, coveredAddress);
    res.json({ success: true, policy });
  } catch (error) {
    res.status(400).json({ error: 'Failed to purchase policy', message: error.message });
  }
};

exports.provideCapital = async (req, res) => {
  try {
    const { poolName, amount } = req.body;
    const pool = await InsurancePool.findOne({ poolName });
    if (!pool) return res.status(404).json({ error: 'Pool not found' });

    const result = await pool.provideCapital(req.user._id, amount);
    res.json({ success: true, shares: result.shares, totalCapital: result.totalCapital });
  } catch (error) {
    res.status(400).json({ error: 'Failed to provide capital', message: error.message });
  }
};

exports.fileClaim = async (req, res) => {
  try {
    const { poolName, policyId, claimAmount, description, evidence } = req.body;
    const pool = await InsurancePool.findOne({ poolName });
    if (!pool) return res.status(404).json({ error: 'Pool not found' });

    const claim = await pool.fileClaim(policyId, req.user._id, claimAmount, description, evidence);
    res.json({ success: true, claim });
  } catch (error) {
    res.status(400).json({ error: 'Failed to file claim', message: error.message });
  }
};

exports.reviewClaim = async (req, res) => {
  try {
    const { poolName, claimId, decision, comment } = req.body;
    const pool = await InsurancePool.findOne({ poolName });
    if (!pool) return res.status(404).json({ error: 'Pool not found' });

    const claim = await pool.reviewClaim(claimId, req.user._id, decision, comment);
    res.json({ success: true, claim });
  } catch (error) {
    res.status(400).json({ error: 'Failed to review claim', message: error.message });
  }
};

module.exports = exports;
