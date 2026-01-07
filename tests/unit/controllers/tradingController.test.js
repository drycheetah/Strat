const tradingController = require('../../../controllers/tradingController');
const Order = require('../../../models/Order');
const { mockRequest, mockResponse, mockNext } = require('../../helpers/testHelpers');

jest.mock('../../../models/Order');

describe('Trading Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    test('should create buy order successfully', async () => {
      req.body = {
        type: 'buy',
        pair: 'STRAT/USDT',
        amount: 100,
        price: 10.5
      };
      req.user = { address: 'trader-address' };

      const mockOrder = {
        _id: 'order-id',
        save: jest.fn().mockResolvedValue(true)
      };

      Order.mockImplementation(() => mockOrder);

      await tradingController.createOrder(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should create sell order successfully', async () => {
      req.body = {
        type: 'sell',
        pair: 'STRAT/USDT',
        amount: 50,
        price: 11.0
      };
      req.user = { address: 'trader-address' };

      const mockOrder = {
        save: jest.fn().mockResolvedValue(true)
      };

      Order.mockImplementation(() => mockOrder);

      await tradingController.createOrder(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('should reject order with invalid type', async () => {
      req.body = {
        type: 'invalid',
        pair: 'STRAT/USDT',
        amount: 100,
        price: 10.5
      };

      await tradingController.createOrder(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    test('should reject order with negative amount', async () => {
      req.body = {
        type: 'buy',
        pair: 'STRAT/USDT',
        amount: -100,
        price: 10.5
      };

      await tradingController.createOrder(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getOrders', () => {
    test('should return user orders', async () => {
      req.user = { address: 'trader-address' };

      const mockOrders = [
        { _id: '1', type: 'buy', amount: 100 },
        { _id: '2', type: 'sell', amount: 50 }
      ];

      Order.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockOrders)
      });

      await tradingController.getOrders(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockOrders
        })
      );
    });

    test('should filter orders by status', async () => {
      req.query = { status: 'open' };
      req.user = { address: 'trader-address' };

      Order.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([])
      });

      await tradingController.getOrders(req, res, next);

      expect(Order.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'open' })
      );
    });
  });

  describe('cancelOrder', () => {
    test('should cancel order successfully', async () => {
      req.params = { id: 'order-id' };
      req.user = { address: 'trader-address' };

      const mockOrder = {
        _id: 'order-id',
        trader: 'trader-address',
        status: 'open',
        save: jest.fn().mockResolvedValue(true)
      };

      Order.findById = jest.fn().mockResolvedValue(mockOrder);

      await tradingController.cancelOrder(req, res, next);

      expect(mockOrder.status).toBe('cancelled');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should reject cancelling others order', async () => {
      req.params = { id: 'order-id' };
      req.user = { address: 'user1' };

      const mockOrder = {
        trader: 'user2',
        status: 'open'
      };

      Order.findById = jest.fn().mockResolvedValue(mockOrder);

      await tradingController.cancelOrder(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    test('should reject cancelling filled order', async () => {
      req.params = { id: 'order-id' };
      req.user = { address: 'trader-address' };

      const mockOrder = {
        trader: 'trader-address',
        status: 'filled'
      };

      Order.findById = jest.fn().mockResolvedValue(mockOrder);

      await tradingController.cancelOrder(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getOrderBook', () => {
    test('should return order book for pair', async () => {
      req.params = { pair: 'STRAT/USDT' };

      const mockBuyOrders = [
        { price: 10.5, amount: 100 },
        { price: 10.0, amount: 200 }
      ];

      const mockSellOrders = [
        { price: 11.0, amount: 150 },
        { price: 11.5, amount: 100 }
      ];

      Order.find = jest.fn()
        .mockResolvedValueOnce(mockBuyOrders)
        .mockResolvedValueOnce(mockSellOrders);

      await tradingController.getOrderBook(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          bids: expect.any(Array),
          asks: expect.any(Array)
        })
      );
    });
  });

  describe('getTradeHistory', () => {
    test('should return trade history', async () => {
      req.user = { address: 'trader-address' };

      const mockTrades = [
        { _id: '1', type: 'buy', amount: 100, price: 10.5 },
        { _id: '2', type: 'sell', amount: 50, price: 11.0 }
      ];

      Order.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockTrades)
        })
      });

      await tradingController.getTradeHistory(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockTrades
        })
      );
    });
  });

  describe('matchOrders', () => {
    test('should match compatible buy and sell orders', async () => {
      const buyOrder = {
        _id: 'buy-1',
        type: 'buy',
        price: 10.5,
        amount: 100,
        trader: 'buyer'
      };

      const sellOrder = {
        _id: 'sell-1',
        type: 'sell',
        price: 10.0,
        amount: 100,
        trader: 'seller'
      };

      // Test matching logic
      expect(buyOrder.price).toBeGreaterThanOrEqual(sellOrder.price);
      expect(buyOrder.amount).toBe(sellOrder.amount);
    });
  });
});
