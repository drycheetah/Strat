const PredictionMarket = require('../models/PredictionMarket');

exports.createMarket = async (req, res) => {
  try {
    const { question, description, category, marketType, outcomes, closingTime } = req.body;

    const marketId = `MARKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const market = new PredictionMarket({
      marketId,
      question,
      description,
      category,
      marketType: marketType || 'BINARY',
      outcomes: outcomes.map(o => ({ name: o, totalShares: 0, totalAmount: 0, price: 1 / outcomes.length })),
      creator: req.user._id,
      closingTime: new Date(closingTime)
    });

    await market.save();
    res.json({ success: true, market: market.getStats() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create market', message: error.message });
  }
};

exports.getMarkets = async (req, res) => {
  try {
    const { category, status } = req.query;
    const query = { active: true };

    if (category) query.category = category;
    if (status) query.status = status;

    const markets = await PredictionMarket.find(query).sort({ createdAt: -1 }).limit(50);

    res.json({
      success: true,
      markets: markets.map(m => m.getStats()),
      count: markets.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get markets', message: error.message });
  }
};

exports.placeBet = async (req, res) => {
  try {
    const { marketId, outcome, amount } = req.body;

    const market = await PredictionMarket.findOne({ marketId });
    if (!market) return res.status(404).json({ error: 'Market not found' });

    const bet = await market.placeBet(req.user._id, outcome, amount);

    res.json({
      success: true,
      bet: {
        outcome: bet.outcome,
        amount: bet.amount,
        shares: bet.shares,
        averagePrice: bet.averagePrice
      },
      marketStats: market.getStats()
    });
  } catch (error) {
    res.status(400).json({ error: 'Failed to place bet', message: error.message });
  }
};

exports.resolveMarket = async (req, res) => {
  try {
    const { marketId, winningOutcome, resolutionSource } = req.body;

    const market = await PredictionMarket.findOne({ marketId });
    if (!market) return res.status(404).json({ error: 'Market not found' });

    const result = await market.resolveMarket(winningOutcome, resolutionSource);

    res.json({
      success: true,
      winningOutcome: result.winningOutcome,
      totalPayout: result.totalPayout,
      winningBets: result.winningBets
    });
  } catch (error) {
    res.status(400).json({ error: 'Failed to resolve market', message: error.message });
  }
};

exports.claimWinnings = async (req, res) => {
  try {
    const { marketId } = req.body;

    const market = await PredictionMarket.findOne({ marketId });
    if (!market) return res.status(404).json({ error: 'Market not found' });

    const result = await market.claimWinnings(req.user._id);

    res.json({
      success: true,
      totalPayout: result.totalPayout,
      betsClaimed: result.betsClaimed
    });
  } catch (error) {
    res.status(400).json({ error: 'Failed to claim winnings', message: error.message });
  }
};

exports.getUserBets = async (req, res) => {
  try {
    const { marketId } = req.params;

    const market = await PredictionMarket.findOne({ marketId });
    if (!market) return res.status(404).json({ error: 'Market not found' });

    const bets = market.getUserBets(req.user._id);

    res.json({ success: true, bets, count: bets.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get bets', message: error.message });
  }
};

module.exports = exports;
