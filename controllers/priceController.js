const Price = require('../models/Price');
const LiquidityPool = require('../models/LiquidityPool');
const logger = require('../utils/logger');

/**
 * Get current STRAT price
 */
const getCurrentPrice = async (req, res) => {
  try {
    // Get real-time price from AMM pool
    const pool = await LiquidityPool.getPool();
    const currentPriceUSD = pool.getPriceUSD();

    const price = await Price.getCurrent();

    // Update price from AMM
    const oldPrice = price.priceUSD;
    price.priceUSD = currentPriceUSD;

    // Calculate 24h change
    if (oldPrice > 0) {
      price.priceChange24h = currentPriceUSD - oldPrice;
      price.priceChangePercent24h = ((currentPriceUSD - oldPrice) / oldPrice) * 100;
    }

    // Update high/low
    price.high24h = Math.max(price.high24h, currentPriceUSD);
    price.low24h = price.low24h === 0 ? currentPriceUSD : Math.min(price.low24h, currentPriceUSD);

    // Update volume from pool
    price.volume24h = pool.volume24h;

    // Update circulating supply from blockchain
    if (req.blockchain) {
      let totalSupply = 0;
      for (let [key, utxo] of req.blockchain.utxos) {
        totalSupply += utxo.amount;
      }

      price.circulatingSupply = totalSupply;
      price.totalSupply = totalSupply;
      price.marketCap = totalSupply * price.priceUSD;
    }

    price.lastUpdated = Date.now();
    await price.save();

    res.json({
      success: true,
      price: {
        usd: price.priceUSD,
        marketCap: price.marketCap,
        volume24h: price.volume24h,
        priceChange24h: price.priceChange24h,
        priceChangePercent24h: price.priceChangePercent24h,
        high24h: price.high24h,
        low24h: price.low24h,
        circulatingSupply: price.circulatingSupply,
        totalSupply: price.totalSupply,
        solReserve: pool.solReserve,
        stratReserve: pool.stratReserve,
        lastUpdated: price.lastUpdated
      }
    });
  } catch (error) {
    logger.error(`Get price error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get price',
      message: error.message
    });
  }
};

/**
 * Update STRAT price (admin only)
 */
const updatePrice = async (req, res) => {
  try {
    const { priceUSD } = req.body;

    if (!priceUSD || priceUSD <= 0) {
      return res.status(400).json({
        error: 'Invalid price',
        message: 'Price must be greater than 0'
      });
    }

    const price = await Price.updatePrice(priceUSD);

    logger.info(`STRAT price updated to $${priceUSD}`);

    res.json({
      success: true,
      message: 'Price updated successfully',
      price: {
        usd: price.priceUSD,
        change24h: price.priceChange24h,
        changePercent24h: price.priceChangePercent24h
      }
    });
  } catch (error) {
    logger.error(`Update price error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to update price',
      message: error.message
    });
  }
};

/**
 * Get price history
 */
const getPriceHistory = async (req, res) => {
  try {
    // For now, return current price
    // In production, you'd store historical price data
    const price = await Price.getCurrent();

    res.json({
      success: true,
      history: [{
        timestamp: price.lastUpdated,
        price: price.priceUSD
      }]
    });
  } catch (error) {
    logger.error(`Get price history error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get price history',
      message: error.message
    });
  }
};

module.exports = {
  getCurrentPrice,
  updatePrice,
  getPriceHistory
};
