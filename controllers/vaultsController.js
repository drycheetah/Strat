const YieldVault = require('../models/YieldVault');

exports.createVault = async (req, res) => {
  try {
    const { name, description, asset, strategy, performanceFee, withdrawalFee } = req.body;
    const vaultId = `VAULT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const vault = new YieldVault({ vaultId, name, description, asset, strategy, performanceFee, withdrawalFee });
    await vault.save();
    res.json({ success: true, vault: vault.getStats() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create vault', message: error.message });
  }
};

exports.getVaults = async (req, res) => {
  try {
    const vaults = await YieldVault.find({ active: true }).sort({ apy: -1 });
    res.json({ success: true, vaults: vaults.map(v => v.getStats()), count: vaults.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get vaults', message: error.message });
  }
};

exports.deposit = async (req, res) => {
  try {
    const { vaultId, amount } = req.body;
    const vault = await YieldVault.findOne({ vaultId });
    if (!vault) return res.status(404).json({ error: 'Vault not found' });

    const result = await vault.deposit(req.user._id, amount);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ error: 'Failed to deposit', message: error.message });
  }
};

exports.withdraw = async (req, res) => {
  try {
    const { vaultId, shares } = req.body;
    const vault = await YieldVault.findOne({ vaultId });
    if (!vault) return res.status(404).json({ error: 'Vault not found' });

    const result = await vault.withdraw(req.user._id, shares);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ error: 'Failed to withdraw', message: error.message });
  }
};

exports.compound = async (req, res) => {
  try {
    const { vaultId } = req.body;
    const vault = await YieldVault.findOne({ vaultId });
    if (!vault) return res.status(404).json({ error: 'Vault not found' });

    const result = await vault.compound();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ error: 'Failed to compound', message: error.message });
  }
};

exports.getUserPosition = async (req, res) => {
  try {
    const { vaultId } = req.params;
    const vault = await YieldVault.findOne({ vaultId });
    if (!vault) return res.status(404).json({ error: 'Vault not found' });

    const position = vault.getUserPosition(req.user._id);
    res.json({ success: true, position });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get position', message: error.message });
  }
};

exports.getPerformanceMetrics = async (req, res) => {
  try {
    const { vaultId } = req.params;
    const { days } = req.query;
    const vault = await YieldVault.findOne({ vaultId });
    if (!vault) return res.status(404).json({ error: 'Vault not found' });

    const metrics = vault.getPerformanceMetrics(parseInt(days) || 30);
    res.json({ success: true, metrics });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get metrics', message: error.message });
  }
};

module.exports = exports;
