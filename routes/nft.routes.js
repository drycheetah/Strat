const express = require('express');
const router = express.Router();
const nftController = require('../controllers/nftController');

// Marketplace statistics
router.get('/marketplace/stats', nftController.getMarketplaceStats);

// Get trending NFTs
router.get('/trending', nftController.getTrendingNFTs);

// Get active marketplace listings
router.get('/listings', nftController.getActiveListings);

// Get NFT collection (with filters)
router.get('/collection', nftController.getNFTCollection);

// Get NFT details by token ID
router.get('/:tokenId', nftController.getNFTDetails);

// Get NFTs owned by a user
router.get('/user/:address', nftController.getUserNFTs);

// Mint a new NFT
router.post('/mint', nftController.mintNFT);

// List NFT for sale
router.post('/:tokenId/list', nftController.listNFTForSale);

// Buy an NFT
router.post('/:tokenId/buy', nftController.buyNFT);

// Cancel listing
router.post('/:tokenId/cancel', nftController.cancelListing);

// Transfer NFT
router.post('/:tokenId/transfer', nftController.transferNFT);

module.exports = router;
