const nftController = require('../../../controllers/nftController');
const NFT = require('../../../models/NFT');
const NFTListing = require('../../../models/NFTListing');
const { mockRequest, mockResponse, mockNext } = require('../../helpers/testHelpers');

jest.mock('../../../models/NFT');
jest.mock('../../../models/NFTListing');

describe('NFT Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    jest.clearAllMocks();
  });

  describe('mintNFT', () => {
    test('should mint NFT successfully', async () => {
      req.body = {
        name: 'Test NFT',
        description: 'Test Description',
        metadata: { rarity: 'legendary' }
      };
      req.user = { address: 'creator-address' };

      const mockNFT = {
        _id: 'nft-id',
        tokenId: '123',
        save: jest.fn().mockResolvedValue(true)
      };

      NFT.mockImplementation(() => mockNFT);

      await nftController.mintNFT(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should require name', async () => {
      req.body = { description: 'Test' };
      req.user = { address: 'creator-address' };

      await nftController.mintNFT(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getNFTs', () => {
    test('should return all NFTs', async () => {
      const mockNFTs = [
        { _id: '1', name: 'NFT 1', owner: 'owner1' },
        { _id: '2', name: 'NFT 2', owner: 'owner2' }
      ];

      NFT.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockNFTs)
      });

      await nftController.getNFTs(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockNFTs
        })
      );
    });

    test('should filter NFTs by owner', async () => {
      req.query = { owner: 'owner-address' };

      NFT.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([])
      });

      await nftController.getNFTs(req, res, next);

      expect(NFT.find).toHaveBeenCalledWith(
        expect.objectContaining({ owner: 'owner-address' })
      );
    });
  });

  describe('transferNFT', () => {
    test('should transfer NFT to new owner', async () => {
      req.params = { id: 'nft-id' };
      req.body = { to: 'new-owner' };
      req.user = { address: 'current-owner' };

      const mockNFT = {
        _id: 'nft-id',
        owner: 'current-owner',
        save: jest.fn().mockResolvedValue(true)
      };

      NFT.findById = jest.fn().mockResolvedValue(mockNFT);

      await nftController.transferNFT(req, res, next);

      expect(mockNFT.owner).toBe('new-owner');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should reject transfer by non-owner', async () => {
      req.params = { id: 'nft-id' };
      req.body = { to: 'new-owner' };
      req.user = { address: 'not-owner' };

      const mockNFT = {
        owner: 'actual-owner'
      };

      NFT.findById = jest.fn().mockResolvedValue(mockNFT);

      await nftController.transferNFT(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('listNFTForSale', () => {
    test('should list NFT for sale', async () => {
      req.params = { id: 'nft-id' };
      req.body = { price: 100 };
      req.user = { address: 'owner-address' };

      const mockNFT = {
        _id: 'nft-id',
        owner: 'owner-address',
        tokenId: '123'
      };

      const mockListing = {
        save: jest.fn().mockResolvedValue(true)
      };

      NFT.findById = jest.fn().mockResolvedValue(mockNFT);
      NFTListing.mockImplementation(() => mockListing);

      await nftController.listNFTForSale(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('should reject listing with negative price', async () => {
      req.params = { id: 'nft-id' };
      req.body = { price: -100 };
      req.user = { address: 'owner-address' };

      await nftController.listNFTForSale(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('buyNFT', () => {
    test('should purchase listed NFT', async () => {
      req.params = { listingId: 'listing-id' };
      req.user = { address: 'buyer-address', balance: 1000 };

      const mockListing = {
        _id: 'listing-id',
        nftId: 'nft-id',
        seller: 'seller-address',
        price: 100,
        status: 'active',
        save: jest.fn().mockResolvedValue(true)
      };

      const mockNFT = {
        _id: 'nft-id',
        owner: 'seller-address',
        save: jest.fn().mockResolvedValue(true)
      };

      NFTListing.findById = jest.fn().mockResolvedValue(mockListing);
      NFT.findById = jest.fn().mockResolvedValue(mockNFT);

      await nftController.buyNFT(req, res, next);

      expect(mockNFT.owner).toBe('buyer-address');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should reject purchase with insufficient balance', async () => {
      req.params = { listingId: 'listing-id' };
      req.user = { address: 'buyer-address', balance: 10 };

      const mockListing = {
        price: 100,
        status: 'active'
      };

      NFTListing.findById = jest.fn().mockResolvedValue(mockListing);

      await nftController.buyNFT(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getNFTMetadata', () => {
    test('should return NFT metadata', async () => {
      req.params = { id: 'nft-id' };

      const mockNFT = {
        _id: 'nft-id',
        name: 'Test NFT',
        metadata: { rarity: 'legendary', power: 100 }
      };

      NFT.findById = jest.fn().mockResolvedValue(mockNFT);

      await nftController.getNFTMetadata(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockNFT
        })
      );
    });
  });
});
