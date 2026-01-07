const PerpetualContract = require('../models/PerpetualContract');

// Create new perpetual contract
exports.createContract = async (req, res) => {
  try {
    const { pair, baseAsset, quoteAsset, markPrice, indexPrice, maxLeverage } = req.body;

    const contract = new PerpetualContract({
      pair,
      baseAsset,
      quoteAsset,
      markPrice,
      indexPrice,
      maxLeverage: maxLeverage || 100
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

// Get all perpetual contracts
exports.getContracts = async (req, res) => {
  try {
    const contracts = await PerpetualContract.find({ active: true });

    res.json({
      success: true,
      contracts: contracts.map(c => c.getStats()),
      count: contracts.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get contracts', message: error.message });
  }
};

// Get contract by pair
exports.getContract = async (req, res) => {
  try {
    const { pair } = req.params;
    const contract = await PerpetualContract.findOne({ pair });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    res.json({
      success: true,
      contract: contract.getStats(),
      positions: contract.positions.length,
      priceHistory: contract.priceHistory.slice(-100)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get contract', message: error.message });
  }
};

// Open position
exports.openPosition = async (req, res) => {
  try {
    const { pair, side, size, collateral, leverage } = req.body;

    const contract = await PerpetualContract.findOne({ pair });
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const position = await contract.openPosition(
      req.user._id,
      side,
      size,
      collateral,
      leverage
    );

    res.json({
      success: true,
      position: {
        id: position._id,
        side: position.side,
        size: position.size,
        entryPrice: position.entryPrice,
        liquidationPrice: position.liquidationPrice,
        collateral: position.collateral,
        leverage: position.leverage
      }
    });
  } catch (error) {
    res.status(400).json({ error: 'Failed to open position', message: error.message });
  }
};

// Close position
exports.closePosition = async (req, res) => {
  try {
    const { pair, positionId } = req.body;

    const contract = await PerpetualContract.findOne({ pair });
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const result = await contract.closePosition(positionId);

    res.json({
      success: true,
      pnl: result.pnl,
      fee: result.fee,
      fundingPaid: result.fundingPaid,
      message: 'Position closed successfully'
    });
  } catch (error) {
    res.status(400).json({ error: 'Failed to close position', message: error.message });
  }
};

// Update prices
exports.updatePrices = async (req, res) => {
  try {
    const { pair, markPrice, indexPrice } = req.body;

    const contract = await PerpetualContract.findOne({ pair });
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    await contract.updatePrices(markPrice, indexPrice);
    await contract.updateFundingRate();

    res.json({
      success: true,
      markPrice: contract.markPrice,
      indexPrice: contract.indexPrice,
      fundingRate: contract.fundingRate,
      liquidations: await contract.checkLiquidations()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update prices', message: error.message });
  }
};

// Get user positions
exports.getUserPositions = async (req, res) => {
  try {
    const { pair } = req.params;
    const userId = req.user._id;

    const contract = await PerpetualContract.findOne({ pair });
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const userPositions = contract.positions.filter(
      p => p.trader.toString() === userId.toString() && p.status !== 'CLOSED'
    );

    res.json({
      success: true,
      positions: userPositions.map(p => ({
        id: p._id,
        side: p.side,
        size: p.size,
        entryPrice: p.entryPrice,
        liquidationPrice: p.liquidationPrice,
        unrealizedPnL: p.unrealizedPnL,
        collateral: p.collateral,
        leverage: p.leverage,
        accumulatedFunding: p.accumulatedFunding
      })),
      count: userPositions.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get positions', message: error.message });
  }
};

// Get funding history
exports.getFundingHistory = async (req, res) => {
  try {
    const { pair } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const contract = await PerpetualContract.findOne({ pair });
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    res.json({
      success: true,
      fundingHistory: contract.fundingHistory.slice(-limit),
      currentFundingRate: contract.fundingRate,
      nextFundingTime: new Date(contract.lastFundingTime.getTime() + contract.fundingInterval)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get funding history', message: error.message });
  }
};

module.exports = exports;
