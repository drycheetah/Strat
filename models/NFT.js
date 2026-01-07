const mongoose = require('mongoose');

const nftSchema = new mongoose.Schema({
  tokenId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  owner: {
    type: String,
    required: true,
    index: true
  },
  creator: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    required: true // IPFS hash
  },
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  forSale: {
    type: Boolean,
    default: false,
    index: true
  },
  royaltyPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 50 // Maximum 50% royalty
  },
  metadata: {
    type: Object,
    default: {}
  },
  collection: {
    type: String,
    default: 'Default',
    index: true
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common',
    index: true
  },
  attributes: [{
    trait_type: {
      type: String,
      required: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  }],
  mintedAt: {
    type: Date,
    default: Date.now
  },
  transferHistory: [{
    from: String,
    to: String,
    price: Number,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  totalViews: {
    type: Number,
    default: 0
  },
  totalLikes: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
nftSchema.index({ owner: 1, createdAt: -1 });
nftSchema.index({ creator: 1, createdAt: -1 });
nftSchema.index({ forSale: 1, price: 1 });
nftSchema.index({ collection: 1, rarity: 1 });
nftSchema.index({ tokenId: 1 }, { unique: true });

/**
 * Transfer NFT to a new owner
 */
nftSchema.methods.transfer = async function(toAddress, price = 0) {
  // Record transfer history
  this.transferHistory.push({
    from: this.owner,
    to: toAddress,
    price: price,
    timestamp: new Date()
  });

  // Update owner
  this.owner = toAddress;

  // Remove from sale when transferred
  this.forSale = false;
  this.price = 0;

  await this.save();
  return this;
};

/**
 * List NFT for sale
 */
nftSchema.methods.listForSale = async function(price) {
  if (price <= 0) {
    throw new Error('Price must be greater than 0');
  }

  this.forSale = true;
  this.price = price;
  await this.save();
  return this;
};

/**
 * Remove NFT from sale
 */
nftSchema.methods.cancelListing = async function() {
  this.forSale = false;
  this.price = 0;
  await this.save();
  return this;
};

/**
 * Calculate royalty amount for a sale
 */
nftSchema.methods.calculateRoyalty = function(salePrice) {
  return (salePrice * this.royaltyPercent) / 100;
};

/**
 * Get NFT statistics for a collection
 */
nftSchema.statics.getCollectionStats = async function(collection) {
  const nfts = await this.find({ collection });

  const totalNFTs = nfts.length;
  const forSale = nfts.filter(nft => nft.forSale).length;
  const totalVolume = nfts.reduce((sum, nft) => {
    const sales = nft.transferHistory.filter(t => t.price > 0);
    return sum + sales.reduce((s, t) => s + t.price, 0);
  }, 0);

  const prices = nfts.filter(nft => nft.forSale).map(nft => nft.price);
  const floorPrice = prices.length > 0 ? Math.min(...prices) : 0;

  return {
    collection,
    totalNFTs,
    forSale,
    totalVolume,
    floorPrice,
    uniqueOwners: new Set(nfts.map(nft => nft.owner)).size
  };
};

/**
 * Get NFT statistics for an owner
 */
nftSchema.statics.getOwnerStats = async function(address) {
  const owned = await this.find({ owner: address });
  const created = await this.find({ creator: address });

  const totalValue = owned
    .filter(nft => nft.forSale)
    .reduce((sum, nft) => sum + nft.price, 0);

  return {
    address,
    ownedCount: owned.length,
    createdCount: created.length,
    forSaleCount: owned.filter(nft => nft.forSale).length,
    totalValue
  };
};

/**
 * Get trending NFTs (most views/likes in last 24h)
 */
nftSchema.statics.getTrending = async function(limit = 10) {
  return this.find({ forSale: true })
    .sort({ totalViews: -1, totalLikes: -1 })
    .limit(limit);
};

/**
 * Generate unique token ID
 */
nftSchema.statics.generateTokenId = async function() {
  const count = await this.countDocuments();
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `NFT-${timestamp}-${count}-${random}`;
};

module.exports = mongoose.model('NFT', nftSchema);
