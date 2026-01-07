const SyntheticAsset = require('../models/SyntheticAsset');

exports.createAsset = async (req, res) => {
  try {
    const { symbol, name, assetType, targetAsset, currentPrice, oracleAddress, minCollateralRatio } = req.body;

    const asset = new SyntheticAsset({
      symbol,
      name,
      assetType,
      targetAsset,
      currentPrice,
      oracleAddress,
      collateralPrice: 1, // Simplified - should come from oracle
      minCollateralRatio: minCollateralRatio || 150
    });

    await asset.save();
    res.json({ success: true, asset: asset.getStats() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create synthetic asset', message: error.message });
  }
};

exports.getAssets = async (req, res) => {
  try {
    const assets = await SyntheticAsset.find({ active: true });
    res.json({
      success: true,
      assets: assets.map(a => a.getStats()),
      count: assets.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get assets', message: error.message });
  }
};

exports.mintSynthetic = async (req, res) => {
  try {
    const { symbol, collateralAmount, syntheticAmount } = req.body;

    const asset = await SyntheticAsset.findOne({ symbol });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const position = await asset.mintSynthetic(req.user._id, collateralAmount, syntheticAmount);

    res.json({
      success: true,
      position: {
        id: position._id,
        collateralAmount: position.collateralAmount,
        syntheticMinted: position.syntheticMinted,
        collateralRatio: position.collateralRatio,
        liquidationPrice: position.liquidationPrice
      }
    });
  } catch (error) {
    res.status(400).json({ error: 'Failed to mint synthetic', message: error.message });
  }
};

exports.burnSynthetic = async (req, res) => {
  try {
    const { symbol, positionId, syntheticAmount } = req.body;

    const asset = await SyntheticAsset.findOne({ symbol });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const result = await asset.burnSynthetic(positionId, syntheticAmount);

    res.json({
      success: true,
      collateralReturned: result.collateralReturned,
      message: 'Synthetic burned successfully'
    });
  } catch (error) {
    res.status(400).json({ error: 'Failed to burn synthetic', message: error.message });
  }
};

exports.addCollateral = async (req, res) => {
  try {
    const { symbol, positionId, collateralAmount } = req.body;

    const asset = await SyntheticAsset.findOne({ symbol });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const position = await asset.addCollateral(positionId, collateralAmount);

    res.json({
      success: true,
      newCollateralRatio: position.collateralRatio,
      newLiquidationPrice: position.liquidationPrice
    });
  } catch (error) {
    res.status(400).json({ error: 'Failed to add collateral', message: error.message });
  }
};

exports.updatePrice = async (req, res) => {
  try {
    const { symbol, price, collateralPrice } = req.body;

    const asset = await SyntheticAsset.findOne({ symbol });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    await asset.updatePrice(price, collateralPrice);

    res.json({
      success: true,
      newPrice: asset.currentPrice,
      globalCollateralRatio: asset.getGlobalCollateralRatio()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update price', message: error.message });
  }
};

exports.getUserPositions = async (req, res) => {
  try {
    const { symbol } = req.params;

    const asset = await SyntheticAsset.findOne({ symbol });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const positions = asset.getUserPositions(req.user._id);

    res.json({ success: true, positions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get positions', message: error.message });
  }
};

module.exports = exports;
