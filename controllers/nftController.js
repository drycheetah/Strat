/**
 * NFT Controller
 * Handles NFT minting, trading, and marketplace operations for STRAT blockchain
 */

const NFT = require('../models/NFT');
const NFTListing = require('../models/NFTListing');
const Wallet = require('../models/Wallet');

// Minimum price for NFT sales (to prevent spam)
const MIN_NFT_PRICE = 0.01;

// Platform fee percentage
const PLATFORM_FEE_PERCENT = 2.5;

/**
 * Mint a new NFT
 */
exports.mintNFT = async (req, res) => {
  try {
    const {
      creator,
      name,
      description,
      image,
      collection,
      rarity,
      royaltyPercent,
      attributes,
      metadata
    } = req.body;

    // Validate required fields
    if (!creator || !name || !image) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide creator, name, and image (IPFS hash)'
      });
    }

    // Validate creator wallet exists
    const wallet = await Wallet.findOne({ address: creator });
    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found',
        message: 'Creator wallet does not exist'
      });
    }

    // Validate royalty percentage
    if (royaltyPercent && (royaltyPercent < 0 || royaltyPercent > 50)) {
      return res.status(400).json({
        error: 'Invalid royalty percentage',
        message: 'Royalty must be between 0 and 50%'
      });
    }

    // Generate unique token ID
    const tokenId = await NFT.generateTokenId();

    // Create NFT
    const nft = new NFT({
      tokenId,
      owner: creator,
      creator,
      name,
      description: description || '',
      image,
      collection: collection || 'Default',
      rarity: rarity || 'common',
      royaltyPercent: royaltyPercent || 0,
      attributes: attributes || [],
      metadata: metadata || {}
    });

    await nft.save();

    // Emit WebSocket event
    if (req.io) {
      req.io.emit('nft_minted', {
        tokenId: nft.tokenId,
        creator: nft.creator,
        name: nft.name,
        collection: nft.collection
      });

      req.io.to(`address:${creator}`).emit('nft_created', {
        tokenId: nft.tokenId,
        name: nft.name
      });
    }

    res.json({
      success: true,
      message: 'NFT minted successfully',
      nft: {
        tokenId: nft.tokenId,
        name: nft.name,
        owner: nft.owner,
        creator: nft.creator,
        image: nft.image,
        collection: nft.collection,
        rarity: nft.rarity,
        royaltyPercent: nft.royaltyPercent
      }
    });

  } catch (error) {
    console.error('Mint NFT error:', error);
    res.status(500).json({
      error: 'Failed to mint NFT',
      message: error.message
    });
  }
};

/**
 * List NFT for sale on marketplace
 */
exports.listNFTForSale = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { seller, price, expiresIn } = req.body;

    if (!seller || !price) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide seller and price'
      });
    }

    // Validate price
    if (price < MIN_NFT_PRICE) {
      return res.status(400).json({
        error: 'Price too low',
        message: `Minimum price is ${MIN_NFT_PRICE} STRAT`
      });
    }

    // Find NFT
    const nft = await NFT.findOne({ tokenId });
    if (!nft) {
      return res.status(404).json({
        error: 'NFT not found'
      });
    }

    // Verify seller is the owner
    if (nft.owner !== seller) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Only the NFT owner can list it for sale'
      });
    }

    // Check if already listed
    if (nft.forSale) {
      return res.status(400).json({
        error: 'NFT already listed for sale'
      });
    }

    // Calculate expiration date
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date(Date.now() + expiresIn * 1000); // expiresIn in seconds
    }

    // Create listing
    const listing = new NFTListing({
      tokenId,
      seller,
      price,
      expiresAt,
      status: 'active'
    });

    await listing.save();

    // Update NFT status
    await nft.listForSale(price);

    // Emit WebSocket event
    if (req.io) {
      req.io.emit('nft_listed', {
        tokenId: nft.tokenId,
        name: nft.name,
        price,
        seller
      });

      req.io.to(`address:${seller}`).emit('nft_listing_created', {
        tokenId,
        price
      });
    }

    res.json({
      success: true,
      message: 'NFT listed for sale successfully',
      listing: {
        id: listing._id,
        tokenId: listing.tokenId,
        seller: listing.seller,
        price: listing.price,
        expiresAt: listing.expiresAt
      }
    });

  } catch (error) {
    console.error('List NFT error:', error);
    res.status(500).json({
      error: 'Failed to list NFT',
      message: error.message
    });
  }
};

/**
 * Buy an NFT from marketplace
 */
exports.buyNFT = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { buyer } = req.body;

    if (!buyer) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide buyer address'
      });
    }

    // Find NFT
    const nft = await NFT.findOne({ tokenId });
    if (!nft) {
      return res.status(404).json({
        error: 'NFT not found'
      });
    }

    // Check if NFT is for sale
    if (!nft.forSale) {
      return res.status(400).json({
        error: 'NFT is not for sale'
      });
    }

    // Find active listing
    const listing = await NFTListing.findOne({
      tokenId,
      status: 'active'
    });

    if (!listing) {
      return res.status(404).json({
        error: 'Active listing not found'
      });
    }

    // Check if listing is expired
    if (listing.isExpired()) {
      await listing.cancel();
      await nft.cancelListing();
      return res.status(400).json({
        error: 'Listing has expired'
      });
    }

    // Prevent self-purchase
    if (buyer === nft.owner) {
      return res.status(400).json({
        error: 'Cannot buy your own NFT'
      });
    }

    // Get buyer wallet
    const buyerWallet = await Wallet.findOne({ address: buyer });
    if (!buyerWallet) {
      return res.status(404).json({
        error: 'Buyer wallet not found'
      });
    }

    // Check buyer balance
    const buyerBalance = req.blockchain ? req.blockchain.getBalance(buyer) : buyerWallet.balance;
    if (buyerBalance < nft.price) {
      return res.status(400).json({
        error: 'Insufficient balance',
        balance: buyerBalance,
        required: nft.price
      });
    }

    // Calculate fees and payments
    const salePrice = nft.price;
    const royaltyAmount = nft.calculateRoyalty(salePrice);
    const platformFee = (salePrice * PLATFORM_FEE_PERCENT) / 100;
    const sellerProceeds = salePrice - royaltyAmount - platformFee;

    // Get seller wallet
    const sellerWallet = await Wallet.findOne({ address: nft.owner });
    if (!sellerWallet) {
      return res.status(404).json({
        error: 'Seller wallet not found'
      });
    }

    // Process payment
    buyerWallet.balance -= salePrice;
    sellerWallet.balance += sellerProceeds;

    // Pay royalty to creator if different from seller
    if (nft.creator !== nft.owner && royaltyAmount > 0) {
      const creatorWallet = await Wallet.findOne({ address: nft.creator });
      if (creatorWallet) {
        creatorWallet.balance += royaltyAmount;
        await creatorWallet.save();
      }
    } else if (royaltyAmount > 0) {
      // If creator is seller, add royalty back to their proceeds
      sellerWallet.balance += royaltyAmount;
    }

    await buyerWallet.save();
    await sellerWallet.save();

    // Transfer NFT
    await nft.transfer(buyer, salePrice);

    // Mark listing as sold
    await listing.markAsSold(buyer, salePrice, royaltyAmount);

    // Emit WebSocket events
    if (req.io) {
      req.io.emit('nft_sold', {
        tokenId: nft.tokenId,
        name: nft.name,
        seller: listing.seller,
        buyer,
        price: salePrice
      });

      req.io.to(`address:${buyer}`).emit('nft_purchased', {
        tokenId,
        price: salePrice
      });

      req.io.to(`address:${listing.seller}`).emit('nft_sale_completed', {
        tokenId,
        buyer,
        proceeds: sellerProceeds
      });

      // Update balances
      req.io.to(`address:${buyer}`).emit('address_balance', {
        address: buyer,
        balance: buyerWallet.balance
      });

      req.io.to(`address:${listing.seller}`).emit('address_balance', {
        address: listing.seller,
        balance: sellerWallet.balance
      });
    }

    res.json({
      success: true,
      message: 'NFT purchased successfully',
      sale: {
        tokenId: nft.tokenId,
        buyer,
        seller: listing.seller,
        price: salePrice,
        royalty: royaltyAmount,
        platformFee,
        sellerProceeds
      }
    });

  } catch (error) {
    console.error('Buy NFT error:', error);
    res.status(500).json({
      error: 'Failed to purchase NFT',
      message: error.message
    });
  }
};

/**
 * Cancel NFT listing
 */
exports.cancelListing = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { seller } = req.body;

    if (!seller) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide seller address'
      });
    }

    // Find NFT
    const nft = await NFT.findOne({ tokenId });
    if (!nft) {
      return res.status(404).json({
        error: 'NFT not found'
      });
    }

    // Verify seller is the owner
    if (nft.owner !== seller) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Only the NFT owner can cancel the listing'
      });
    }

    // Find active listing
    const listing = await NFTListing.findOne({
      tokenId,
      status: 'active'
    });

    if (!listing) {
      return res.status(404).json({
        error: 'Active listing not found'
      });
    }

    // Cancel listing
    await listing.cancel();
    await nft.cancelListing();

    // Emit WebSocket event
    if (req.io) {
      req.io.emit('nft_delisted', {
        tokenId: nft.tokenId,
        seller
      });

      req.io.to(`address:${seller}`).emit('nft_listing_cancelled', {
        tokenId
      });
    }

    res.json({
      success: true,
      message: 'Listing cancelled successfully',
      tokenId
    });

  } catch (error) {
    console.error('Cancel listing error:', error);
    res.status(500).json({
      error: 'Failed to cancel listing',
      message: error.message
    });
  }
};

/**
 * Transfer NFT to another address
 */
exports.transferNFT = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { from, to } = req.body;

    if (!from || !to) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide from and to addresses'
      });
    }

    // Find NFT
    const nft = await NFT.findOne({ tokenId });
    if (!nft) {
      return res.status(404).json({
        error: 'NFT not found'
      });
    }

    // Verify sender is the owner
    if (nft.owner !== from) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Only the NFT owner can transfer it'
      });
    }

    // Check if NFT is listed for sale
    if (nft.forSale) {
      return res.status(400).json({
        error: 'Cannot transfer NFT while listed for sale',
        message: 'Please cancel the listing first'
      });
    }

    // Verify recipient wallet exists
    const recipientWallet = await Wallet.findOne({ address: to });
    if (!recipientWallet) {
      return res.status(404).json({
        error: 'Recipient wallet not found'
      });
    }

    // Transfer NFT
    await nft.transfer(to, 0); // 0 price for direct transfer

    // Emit WebSocket events
    if (req.io) {
      req.io.emit('nft_transferred', {
        tokenId: nft.tokenId,
        from,
        to
      });

      req.io.to(`address:${from}`).emit('nft_sent', {
        tokenId,
        to
      });

      req.io.to(`address:${to}`).emit('nft_received', {
        tokenId,
        from,
        name: nft.name
      });
    }

    res.json({
      success: true,
      message: 'NFT transferred successfully',
      transfer: {
        tokenId,
        from,
        to,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Transfer NFT error:', error);
    res.status(500).json({
      error: 'Failed to transfer NFT',
      message: error.message
    });
  }
};

/**
 * Get NFT collection (with filters)
 */
exports.getNFTCollection = async (req, res) => {
  try {
    const {
      collection,
      rarity,
      forSale,
      minPrice,
      maxPrice,
      sortBy,
      limit,
      offset
    } = req.query;

    // Build query
    const query = {};
    if (collection) query.collection = collection;
    if (rarity) query.rarity = rarity;
    if (forSale !== undefined) query.forSale = forSale === 'true';

    if (forSale === 'true') {
      if (minPrice) query.price = { ...query.price, $gte: parseFloat(minPrice) };
      if (maxPrice) query.price = { ...query.price, $lte: parseFloat(maxPrice) };
    }

    // Sort options
    let sort = { createdAt: -1 };
    if (sortBy === 'price_asc') sort = { price: 1 };
    if (sortBy === 'price_desc') sort = { price: -1 };
    if (sortBy === 'oldest') sort = { createdAt: 1 };
    if (sortBy === 'popular') sort = { totalViews: -1 };

    // Pagination
    const limitNum = parseInt(limit) || 50;
    const offsetNum = parseInt(offset) || 0;

    // Execute query
    const nfts = await NFT.find(query)
      .sort(sort)
      .limit(limitNum)
      .skip(offsetNum);

    const total = await NFT.countDocuments(query);

    // Get collection stats if collection specified
    let stats = null;
    if (collection) {
      stats = await NFT.getCollectionStats(collection);
    }

    res.json({
      success: true,
      nfts: nfts.map(nft => ({
        tokenId: nft.tokenId,
        name: nft.name,
        description: nft.description,
        image: nft.image,
        owner: nft.owner,
        creator: nft.creator,
        price: nft.price,
        forSale: nft.forSale,
        collection: nft.collection,
        rarity: nft.rarity,
        royaltyPercent: nft.royaltyPercent,
        attributes: nft.attributes,
        totalViews: nft.totalViews,
        totalLikes: nft.totalLikes,
        mintedAt: nft.mintedAt
      })),
      total,
      limit: limitNum,
      offset: offsetNum,
      stats
    });

  } catch (error) {
    console.error('Get NFT collection error:', error);
    res.status(500).json({
      error: 'Failed to get NFT collection',
      message: error.message
    });
  }
};

/**
 * Get NFTs owned by a user
 */
exports.getUserNFTs = async (req, res) => {
  try {
    const { address } = req.params;
    const { includeCreated } = req.query;

    // Get owned NFTs
    const owned = await NFT.find({ owner: address }).sort({ createdAt: -1 });

    // Get created NFTs if requested
    let created = [];
    if (includeCreated === 'true') {
      created = await NFT.find({ creator: address }).sort({ createdAt: -1 });
    }

    // Get user stats
    const stats = await NFT.getOwnerStats(address);

    res.json({
      success: true,
      address,
      stats,
      owned: owned.map(nft => ({
        tokenId: nft.tokenId,
        name: nft.name,
        description: nft.description,
        image: nft.image,
        creator: nft.creator,
        price: nft.price,
        forSale: nft.forSale,
        collection: nft.collection,
        rarity: nft.rarity,
        royaltyPercent: nft.royaltyPercent,
        attributes: nft.attributes,
        mintedAt: nft.mintedAt
      })),
      created: includeCreated === 'true' ? created.map(nft => ({
        tokenId: nft.tokenId,
        name: nft.name,
        owner: nft.owner,
        price: nft.price,
        forSale: nft.forSale
      })) : undefined
    });

  } catch (error) {
    console.error('Get user NFTs error:', error);
    res.status(500).json({
      error: 'Failed to get user NFTs',
      message: error.message
    });
  }
};

/**
 * Get NFT details by token ID
 */
exports.getNFTDetails = async (req, res) => {
  try {
    const { tokenId } = req.params;

    const nft = await NFT.findOne({ tokenId });
    if (!nft) {
      return res.status(404).json({
        error: 'NFT not found'
      });
    }

    // Increment view count
    nft.totalViews += 1;
    await nft.save();

    // Get active listing if exists
    let listing = null;
    if (nft.forSale) {
      listing = await NFTListing.findOne({
        tokenId,
        status: 'active'
      });
    }

    res.json({
      success: true,
      nft: {
        tokenId: nft.tokenId,
        name: nft.name,
        description: nft.description,
        image: nft.image,
        owner: nft.owner,
        creator: nft.creator,
        price: nft.price,
        forSale: nft.forSale,
        collection: nft.collection,
        rarity: nft.rarity,
        royaltyPercent: nft.royaltyPercent,
        attributes: nft.attributes,
        metadata: nft.metadata,
        totalViews: nft.totalViews,
        totalLikes: nft.totalLikes,
        mintedAt: nft.mintedAt,
        transferHistory: nft.transferHistory
      },
      listing: listing ? {
        id: listing._id,
        seller: listing.seller,
        price: listing.price,
        expiresAt: listing.expiresAt,
        createdAt: listing.createdAt
      } : null
    });

  } catch (error) {
    console.error('Get NFT details error:', error);
    res.status(500).json({
      error: 'Failed to get NFT details',
      message: error.message
    });
  }
};

/**
 * Get marketplace statistics
 */
exports.getMarketplaceStats = async (req, res) => {
  try {
    const stats = await NFTListing.getMarketplaceStats();

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get marketplace stats error:', error);
    res.status(500).json({
      error: 'Failed to get marketplace stats',
      message: error.message
    });
  }
};

/**
 * Get trending NFTs
 */
exports.getTrendingNFTs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const trending = await NFT.getTrending(limit);

    res.json({
      success: true,
      nfts: trending.map(nft => ({
        tokenId: nft.tokenId,
        name: nft.name,
        image: nft.image,
        price: nft.price,
        collection: nft.collection,
        totalViews: nft.totalViews,
        totalLikes: nft.totalLikes
      }))
    });

  } catch (error) {
    console.error('Get trending NFTs error:', error);
    res.status(500).json({
      error: 'Failed to get trending NFTs',
      message: error.message
    });
  }
};

/**
 * Get active marketplace listings
 */
exports.getActiveListings = async (req, res) => {
  try {
    const { minPrice, maxPrice, seller, limit } = req.query;

    const filters = {};
    if (minPrice) filters.minPrice = parseFloat(minPrice);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
    if (seller) filters.seller = seller;
    if (limit) filters.limit = parseInt(limit);

    const listings = await NFTListing.getActiveListings(filters);

    // Populate NFT data
    const enrichedListings = await Promise.all(
      listings.map(async (listing) => {
        const nft = await NFT.findOne({ tokenId: listing.tokenId });
        return {
          id: listing._id,
          tokenId: listing.tokenId,
          seller: listing.seller,
          price: listing.price,
          expiresAt: listing.expiresAt,
          createdAt: listing.createdAt,
          nft: nft ? {
            name: nft.name,
            image: nft.image,
            collection: nft.collection,
            rarity: nft.rarity
          } : null
        };
      })
    );

    res.json({
      success: true,
      listings: enrichedListings,
      count: enrichedListings.length
    });

  } catch (error) {
    console.error('Get active listings error:', error);
    res.status(500).json({
      error: 'Failed to get active listings',
      message: error.message
    });
  }
};
