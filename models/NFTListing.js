const mongoose = require('mongoose');

const nftListingSchema = new mongoose.Schema({
  tokenId: {
    type: String,
    required: true,
    index: true,
    ref: 'NFT'
  },
  seller: {
    type: String,
    required: true,
    index: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'sold', 'cancelled'],
    default: 'active',
    index: true
  },
  expiresAt: {
    type: Date,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  soldAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  buyer: {
    type: String
  },
  salePrice: {
    type: Number
  },
  royaltyPaid: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
nftListingSchema.index({ tokenId: 1, status: 1 });
nftListingSchema.index({ seller: 1, status: 1, createdAt: -1 });
nftListingSchema.index({ status: 1, price: 1 });
nftListingSchema.index({ expiresAt: 1, status: 1 });

/**
 * Check if listing is expired
 */
nftListingSchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return this.expiresAt < new Date();
};

/**
 * Mark listing as sold
 */
nftListingSchema.methods.markAsSold = async function(buyer, salePrice, royaltyPaid = 0) {
  this.status = 'sold';
  this.buyer = buyer;
  this.salePrice = salePrice;
  this.royaltyPaid = royaltyPaid;
  this.soldAt = new Date();
  await this.save();
  return this;
};

/**
 * Cancel the listing
 */
nftListingSchema.methods.cancel = async function() {
  if (this.status !== 'active') {
    throw new Error('Listing is not active');
  }

  this.status = 'cancelled';
  this.cancelledAt = new Date();
  await this.save();
  return this;
};

/**
 * Get active listings with price range filter
 */
nftListingSchema.statics.getActiveListings = async function(filters = {}) {
  const query = { status: 'active' };

  if (filters.minPrice) {
    query.price = { ...query.price, $gte: filters.minPrice };
  }

  if (filters.maxPrice) {
    query.price = { ...query.price, $lte: filters.maxPrice };
  }

  if (filters.seller) {
    query.seller = filters.seller;
  }

  // Remove expired listings
  const now = new Date();
  const listings = await this.find(query)
    .sort({ createdAt: -1 })
    .limit(filters.limit || 100);

  // Filter out expired listings and auto-cancel them
  const activeListings = [];
  for (let listing of listings) {
    if (listing.isExpired()) {
      await listing.cancel();
    } else {
      activeListings.push(listing);
    }
  }

  return activeListings;
};

/**
 * Get sales statistics for a seller
 */
nftListingSchema.statics.getSellerStats = async function(seller) {
  const listings = await this.find({ seller });

  const totalListings = listings.length;
  const sold = listings.filter(l => l.status === 'sold').length;
  const active = listings.filter(l => l.status === 'active' && !l.isExpired()).length;
  const totalRevenue = listings
    .filter(l => l.status === 'sold')
    .reduce((sum, l) => sum + (l.salePrice - l.royaltyPaid), 0);

  return {
    seller,
    totalListings,
    sold,
    active,
    totalRevenue,
    averagePrice: sold > 0 ? totalRevenue / sold : 0
  };
};

/**
 * Get marketplace statistics
 */
nftListingSchema.statics.getMarketplaceStats = async function() {
  const activeListings = await this.find({ status: 'active' });
  const soldListings = await this.find({ status: 'sold' });

  const totalVolume = soldListings.reduce((sum, l) => sum + (l.salePrice || 0), 0);
  const totalRoyalties = soldListings.reduce((sum, l) => sum + (l.royaltyPaid || 0), 0);

  const prices = activeListings.map(l => l.price);
  const floorPrice = prices.length > 0 ? Math.min(...prices) : 0;

  return {
    activeListings: activeListings.length,
    totalSales: soldListings.length,
    totalVolume,
    totalRoyalties,
    floorPrice,
    uniqueSellers: new Set(soldListings.map(l => l.seller)).size,
    uniqueBuyers: new Set(soldListings.map(l => l.buyer).filter(b => b)).size
  };
};

/**
 * Clean up expired listings (should be run periodically)
 */
nftListingSchema.statics.cleanupExpired = async function() {
  const now = new Date();
  const expired = await this.find({
    status: 'active',
    expiresAt: { $lt: now }
  });

  for (let listing of expired) {
    await listing.cancel();
  }

  return expired.length;
};

module.exports = mongoose.model('NFTListing', nftListingSchema);
