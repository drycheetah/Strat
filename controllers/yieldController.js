const YieldAggregator = require('../models/YieldAggregator');

exports.createAggregator = async (req, res) => {
  try {
    const { name, asset, riskTolerance, rebalanceThreshold } = req.body;
    const aggregatorId = `AGG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const aggregator = new YieldAggregator({ aggregatorId, name, asset, riskTolerance, rebalanceThreshold });
    await aggregator.save();
    res.json({ success: true, aggregator: aggregator.getStats() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create aggregator', message: error.message });
  }
};

exports.getAggregators = async (req, res) => {
  try {
    const aggregators = await YieldAggregator.find({ active: true });
    res.json({ success: true, aggregators: aggregators.map(a => a.getStats()), count: aggregators.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get aggregators', message: error.message });
  }
};

exports.addStrategy = async (req, res) => {
  try {
    const { aggregatorId, name, type, protocol, asset, currentAPY, riskScore } = req.body;
    const aggregator = await YieldAggregator.findOne({ aggregatorId });
    if (!aggregator) return res.status(404).json({ error: 'Aggregator not found' });

    const strategy = await aggregator.addStrategy({ name, type, protocol, asset, currentAPY, riskScore });
    res.json({ success: true, strategy });
  } catch (error) {
    res.status(400).json({ error: 'Failed to add strategy', message: error.message });
  }
};

exports.rebalance = async (req, res) => {
  try {
    const { aggregatorId } = req.body;
    const aggregator = await YieldAggregator.findOne({ aggregatorId });
    if (!aggregator) return res.status(404).json({ error: 'Aggregator not found' });

    const result = await aggregator.rebalance();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ error: 'Failed to rebalance', message: error.message });
  }
};

exports.deposit = async (req, res) => {
  try {
    const { aggregatorId, amount } = req.body;
    const aggregator = await YieldAggregator.findOne({ aggregatorId });
    if (!aggregator) return res.status(404).json({ error: 'Aggregator not found' });

    const result = await aggregator.deposit(req.user._id, amount);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ error: 'Failed to deposit', message: error.message });
  }
};

exports.withdraw = async (req, res) => {
  try {
    const { aggregatorId, amount } = req.body;
    const aggregator = await YieldAggregator.findOne({ aggregatorId });
    if (!aggregator) return res.status(404).json({ error: 'Aggregator not found' });

    const result = await aggregator.withdraw(req.user._id, amount);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ error: 'Failed to withdraw', message: error.message });
  }
};

exports.getBestStrategies = async (req, res) => {
  try {
    const { aggregatorId } = req.params;
    const { limit } = req.query;
    const aggregator = await YieldAggregator.findOne({ aggregatorId });
    if (!aggregator) return res.status(404).json({ error: 'Aggregator not found' });

    const strategies = aggregator.getBestStrategies(parseInt(limit) || 5);
    res.json({ success: true, strategies });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get strategies', message: error.message });
  }
};

module.exports = exports;
