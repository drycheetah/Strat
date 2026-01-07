const MarginAccount = require('../models/MarginAccount');

exports.createAccount = async (req, res) => {
  try {
    const accountId = `MARGIN-${req.user._id}-${Date.now()}`;
    const account = new MarginAccount({ user: req.user._id, accountId });
    await account.save();
    res.json({ success: true, account: account.getStats() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create account', message: error.message });
  }
};

exports.getAccount = async (req, res) => {
  try {
    const account = await MarginAccount.findOne({ user: req.user._id });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json({ success: true, account: account.getStats() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get account', message: error.message });
  }
};

exports.deposit = async (req, res) => {
  try {
    const { amount } = req.body;
    const account = await MarginAccount.findOne({ user: req.user._id });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const result = await account.deposit(amount);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ error: 'Failed to deposit', message: error.message });
  }
};

exports.withdraw = async (req, res) => {
  try {
    const { amount } = req.body;
    const account = await MarginAccount.findOne({ user: req.user._id });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const result = await account.withdraw(amount);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ error: 'Failed to withdraw', message: error.message });
  }
};

exports.openPosition = async (req, res) => {
  try {
    const { asset, side, size, collateral, leverage } = req.body;
    const account = await MarginAccount.findOne({ user: req.user._id });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const position = await account.openPosition(asset, side, size, collateral, leverage);
    res.json({ success: true, position });
  } catch (error) {
    res.status(400).json({ error: 'Failed to open position', message: error.message });
  }
};

exports.closePosition = async (req, res) => {
  try {
    const { positionId } = req.body;
    const account = await MarginAccount.findOne({ user: req.user._id });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const result = await account.closePosition(positionId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ error: 'Failed to close position', message: error.message });
  }
};

exports.addCollateral = async (req, res) => {
  try {
    const { positionId, amount } = req.body;
    const account = await MarginAccount.findOne({ user: req.user._id });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const position = await account.addCollateral(positionId, amount);
    res.json({ success: true, position });
  } catch (error) {
    res.status(400).json({ error: 'Failed to add collateral', message: error.message });
  }
};

module.exports = exports;
