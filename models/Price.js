const mongoose = require('mongoose');

const priceSchema = new mongoose.Schema({
  priceUSD: {
    type: Number,
    required: true,
    default: 0.01 // Starting price: $0.01 per STRAT
  },
  marketCap: {
    type: Number,
    default: 0
  },
  volume24h: {
    type: Number,
    default: 0
  },
  priceChange24h: {
    type: Number,
    default: 0
  },
  priceChangePercent24h: {
    type: Number,
    default: 0
  },
  high24h: {
    type: Number,
    default: 0
  },
  low24h: {
    type: Number,
    default: 0
  },
  circulatingSupply: {
    type: Number,
    default: 0
  },
  totalSupply: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create a singleton pattern - only one price document
priceSchema.statics.getCurrent = async function() {
  let price = await this.findOne();
  if (!price) {
    price = await this.create({
      priceUSD: parseFloat(process.env.INITIAL_STRAT_PRICE) || 0.01
    });
  }
  return price;
};

// Update price based on trading activity
priceSchema.statics.updatePrice = async function(newPrice) {
  const current = await this.getCurrent();
  const priceChange = newPrice - current.priceUSD;
  const priceChangePercent = (priceChange / current.priceUSD) * 100;

  current.priceUSD = newPrice;
  current.priceChange24h = priceChange;
  current.priceChangePercent24h = priceChangePercent;
  current.high24h = Math.max(current.high24h, newPrice);
  current.low24h = current.low24h === 0 ? newPrice : Math.min(current.low24h, newPrice);
  current.lastUpdated = Date.now();

  await current.save();
  return current;
};

module.exports = mongoose.model('Price', priceSchema);
