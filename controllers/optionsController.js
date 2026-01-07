const OptionsContract = require('../models/OptionsContract');

// Create options contract
exports.createContract = async (req, res) => {
  try {
    const { pair, baseAsset, currentPrice, volatility } = req.body;

    const contract = new OptionsContract({
      pair,
      baseAsset,
      currentPrice,
      volatility: volatility || 0.5
    });

    await contract.save();

    res.json({
      success: true,
      contract: contract.getStats()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create contract', message: error.message });
  }
};

// Get all options contracts
exports.getContracts = async (req, res) => {
  try {
    const contracts = await OptionsContract.find({ active: true });

    res.json({
      success: true,
      contracts: contracts.map(c => c.getStats()),
      count: contracts.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get contracts', message: error.message });
  }
};

// Create option
exports.createOption = async (req, res) => {
  try {
    const { pair, type, style, strikePrice, expiryDate, collateral } = req.body;

    const contract = await OptionsContract.findOne({ pair });
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const option = await contract.createOption(
      req.user._id,
      type,
      style,
      strikePrice,
      new Date(expiryDate),
      collateral
    );

    res.json({
      success: true,
      option: {
        optionId: option.optionId,
        type: option.type,
        strikePrice: option.strikePrice,
        premium: option.premium,
        expiryDate: option.expiryDate,
        delta: option.delta,
        gamma: option.gamma,
        theta: option.theta,
        vega: option.vega
      }
    });
  } catch (error) {
    res.status(400).json({ error: 'Failed to create option', message: error.message });
  }
};

// Buy option
exports.buyOption = async (req, res) => {
  try {
    const { pair, optionId } = req.body;

    const contract = await OptionsContract.findOne({ pair });
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const result = await contract.buyOption(optionId, req.user._id);

    res.json({
      success: true,
      premium: result.premium,
      option: result.option,
      message: 'Option purchased successfully'
    });
  } catch (error) {
    res.status(400).json({ error: 'Failed to buy option', message: error.message });
  }
};

// Exercise option
exports.exerciseOption = async (req, res) => {
  try {
    const { pair, optionId } = req.body;

    const contract = await OptionsContract.findOne({ pair });
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const result = await contract.exerciseOption(optionId);

    res.json({
      success: true,
      exerciseValue: result.exerciseValue,
      pnl: result.pnl,
      premium: result.premium,
      message: 'Option exercised successfully'
    });
  } catch (error) {
    res.status(400).json({ error: 'Failed to exercise option', message: error.message });
  }
};

// Get option chain
exports.getOptionChain = async (req, res) => {
  try {
    const { pair } = req.params;
    const { expiryDate } = req.query;

    const contract = await OptionsContract.findOne({ pair });
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const chain = contract.getOptionChain(expiryDate);

    res.json({
      success: true,
      chain,
      currentPrice: contract.currentPrice,
      volatility: contract.volatility
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get option chain', message: error.message });
  }
};

// Update price
exports.updatePrice = async (req, res) => {
  try {
    const { pair, price } = req.body;

    const contract = await OptionsContract.findOne({ pair });
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    await contract.updatePrice(price);
    const expired = await contract.expireOptions();

    res.json({
      success: true,
      newPrice: contract.currentPrice,
      expiredOptions: expired.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update price', message: error.message });
  }
};

module.exports = exports;
