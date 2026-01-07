/**
 * Trading Controller
 * Handles advanced trading features including limit orders, stop-loss, take-profit, and price alerts
 */

const Order = require('../models/Order');
const PriceAlert = require('../models/PriceAlert');
const Wallet = require('../models/Wallet');
const Price = require('../models/Price');
const { Transaction } = require('../src/transaction');
const logger = require('../utils/logger');

// Trading fee percentage
const TRADING_FEE = 0.001; // 0.1%

// Minimum order amounts
const MIN_ORDER_AMOUNT = 0.1;

/**
 * Create a limit order
 */
exports.createLimitOrder = async (req, res) => {
  try {
    const { address, side, price, amount, expiresIn } = req.body;

    if (!address || !side || !price || !amount) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide address, side, price, and amount'
      });
    }

    // Validate amount
    if (amount < MIN_ORDER_AMOUNT) {
      return res.status(400).json({
        error: 'Amount too low',
        message: `Minimum order amount is ${MIN_ORDER_AMOUNT} STRAT`
      });
    }

    // Validate side
    if (!['buy', 'sell'].includes(side)) {
      return res.status(400).json({
        error: 'Invalid side',
        message: 'Side must be either "buy" or "sell"'
      });
    }

    // Validate price
    if (price <= 0) {
      return res.status(400).json({
        error: 'Invalid price',
        message: 'Price must be greater than 0'
      });
    }

    // Get wallet
    const wallet = await Wallet.findOne({ address, user: req.user._id });
    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    // Check balance for sell orders
    if (side === 'sell') {
      const balance = req.blockchain.getBalance(address);
      if (balance < amount) {
        return res.status(400).json({
          error: 'Insufficient balance',
          balance,
          requested: amount
        });
      }
    } else {
      // For buy orders, check if user has enough USD (in this case, we'll use STRAT balance as proxy)
      const requiredAmount = amount * price;
      const balance = req.blockchain.getBalance(address);
      if (balance < requiredAmount) {
        return res.status(400).json({
          error: 'Insufficient balance for buy order',
          balance,
          required: requiredAmount
        });
      }
    }

    // Set expiration if provided
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date(Date.now() + expiresIn * 1000); // expiresIn is in seconds
    }

    // Create limit order
    const order = new Order({
      user: req.user._id,
      address,
      type: 'limit',
      side,
      price,
      amount,
      pair: 'STRAT/USD',
      expiresAt
    });

    await order.save();

    // Emit WebSocket event
    if (req.io) {
      req.io.to(`user:${req.user._id}`).emit('order_created', {
        orderId: order._id,
        type: order.type,
        side: order.side,
        price: order.price,
        amount: order.amount
      });
    }

    res.json({
      success: true,
      message: 'Limit order created successfully',
      order: {
        id: order._id,
        type: order.type,
        side: order.side,
        pair: order.pair,
        price: order.price,
        amount: order.amount,
        status: order.status,
        expiresAt: order.expiresAt,
        createdAt: order.createdAt
      }
    });

  } catch (error) {
    logger.error('Create limit order error:', error);
    res.status(500).json({
      error: 'Failed to create limit order',
      message: error.message
    });
  }
};

/**
 * Create a stop-loss order
 */
exports.createStopLoss = async (req, res) => {
  try {
    const { address, side, triggerPrice, amount, executePrice } = req.body;

    if (!address || !side || !triggerPrice || !amount) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide address, side, triggerPrice, and amount'
      });
    }

    // Validate amount
    if (amount < MIN_ORDER_AMOUNT) {
      return res.status(400).json({
        error: 'Amount too low',
        message: `Minimum order amount is ${MIN_ORDER_AMOUNT} STRAT`
      });
    }

    // Validate side
    if (!['buy', 'sell'].includes(side)) {
      return res.status(400).json({
        error: 'Invalid side',
        message: 'Side must be either "buy" or "sell"'
      });
    }

    // Get wallet
    const wallet = await Wallet.findOne({ address, user: req.user._id });
    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    // Check balance
    if (side === 'sell') {
      const balance = req.blockchain.getBalance(address);
      if (balance < amount) {
        return res.status(400).json({
          error: 'Insufficient balance',
          balance,
          requested: amount
        });
      }
    }

    // Get current price to validate trigger price
    const currentPrice = await Price.getCurrent();
    if (side === 'sell' && triggerPrice >= currentPrice.priceUSD) {
      return res.status(400).json({
        error: 'Invalid stop-loss trigger',
        message: 'Stop-loss sell trigger must be below current price',
        currentPrice: currentPrice.priceUSD
      });
    }

    // Create stop-loss order
    const order = new Order({
      user: req.user._id,
      address,
      type: 'stop-loss',
      side,
      price: executePrice || triggerPrice, // Execute at this price once triggered
      triggerPrice,
      amount,
      pair: 'STRAT/USD'
    });

    await order.save();

    // Emit WebSocket event
    if (req.io) {
      req.io.to(`user:${req.user._id}`).emit('order_created', {
        orderId: order._id,
        type: order.type,
        side: order.side,
        triggerPrice: order.triggerPrice,
        amount: order.amount
      });
    }

    res.json({
      success: true,
      message: 'Stop-loss order created successfully',
      order: {
        id: order._id,
        type: order.type,
        side: order.side,
        pair: order.pair,
        triggerPrice: order.triggerPrice,
        executePrice: order.price,
        amount: order.amount,
        status: order.status,
        createdAt: order.createdAt
      }
    });

  } catch (error) {
    logger.error('Create stop-loss error:', error);
    res.status(500).json({
      error: 'Failed to create stop-loss order',
      message: error.message
    });
  }
};

/**
 * Create a take-profit order
 */
exports.createTakeProfit = async (req, res) => {
  try {
    const { address, side, triggerPrice, amount, executePrice } = req.body;

    if (!address || !side || !triggerPrice || !amount) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide address, side, triggerPrice, and amount'
      });
    }

    // Validate amount
    if (amount < MIN_ORDER_AMOUNT) {
      return res.status(400).json({
        error: 'Amount too low',
        message: `Minimum order amount is ${MIN_ORDER_AMOUNT} STRAT`
      });
    }

    // Validate side
    if (!['buy', 'sell'].includes(side)) {
      return res.status(400).json({
        error: 'Invalid side',
        message: 'Side must be either "buy" or "sell"'
      });
    }

    // Get wallet
    const wallet = await Wallet.findOne({ address, user: req.user._id });
    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    // Check balance
    if (side === 'sell') {
      const balance = req.blockchain.getBalance(address);
      if (balance < amount) {
        return res.status(400).json({
          error: 'Insufficient balance',
          balance,
          requested: amount
        });
      }
    }

    // Get current price to validate trigger price
    const currentPrice = await Price.getCurrent();
    if (side === 'sell' && triggerPrice <= currentPrice.priceUSD) {
      return res.status(400).json({
        error: 'Invalid take-profit trigger',
        message: 'Take-profit sell trigger must be above current price',
        currentPrice: currentPrice.priceUSD
      });
    }

    // Create take-profit order
    const order = new Order({
      user: req.user._id,
      address,
      type: 'take-profit',
      side,
      price: executePrice || triggerPrice,
      triggerPrice,
      amount,
      pair: 'STRAT/USD'
    });

    await order.save();

    // Emit WebSocket event
    if (req.io) {
      req.io.to(`user:${req.user._id}`).emit('order_created', {
        orderId: order._id,
        type: order.type,
        side: order.side,
        triggerPrice: order.triggerPrice,
        amount: order.amount
      });
    }

    res.json({
      success: true,
      message: 'Take-profit order created successfully',
      order: {
        id: order._id,
        type: order.type,
        side: order.side,
        pair: order.pair,
        triggerPrice: order.triggerPrice,
        executePrice: order.price,
        amount: order.amount,
        status: order.status,
        createdAt: order.createdAt
      }
    });

  } catch (error) {
    logger.error('Create take-profit error:', error);
    res.status(500).json({
      error: 'Failed to create take-profit order',
      message: error.message
    });
  }
};

/**
 * Cancel an order
 */
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    // Verify ownership
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Not authorized to cancel this order'
      });
    }

    // Check if order can be cancelled
    if (!['pending', 'partial'].includes(order.status)) {
      return res.status(400).json({
        error: 'Order cannot be cancelled',
        status: order.status
      });
    }

    // Cancel the order
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    await order.save();

    // Emit WebSocket event
    if (req.io) {
      req.io.to(`user:${req.user._id}`).emit('order_cancelled', {
        orderId: order._id
      });
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      order: {
        id: order._id,
        status: order.status,
        cancelledAt: order.cancelledAt
      }
    });

  } catch (error) {
    logger.error('Cancel order error:', error);
    res.status(500).json({
      error: 'Failed to cancel order',
      message: error.message
    });
  }
};

/**
 * Get user's orders
 */
exports.getOrders = async (req, res) => {
  try {
    const { status, type, side, limit = 50, offset = 0 } = req.query;

    // Build query
    const query = { user: req.user._id };
    if (status) query.status = status;
    if (type) query.type = type;
    if (side) query.side = side;

    // Get orders
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    // Get total count
    const total = await Order.countDocuments(query);

    // Enrich orders with calculated fields
    const enrichedOrders = orders.map(order => ({
      id: order._id,
      type: order.type,
      side: order.side,
      pair: order.pair,
      price: order.price,
      triggerPrice: order.triggerPrice,
      amount: order.amount,
      filledAmount: order.filledAmount,
      remainingAmount: order.getRemainingAmount(),
      averageFilledPrice: order.averageFilledPrice,
      fees: order.fees,
      status: order.status,
      triggered: order.triggered,
      triggeredAt: order.triggeredAt,
      expiresAt: order.expiresAt,
      createdAt: order.createdAt,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt
    }));

    res.json({
      success: true,
      orders: enrichedOrders,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Get orders error:', error);
    res.status(500).json({
      error: 'Failed to get orders',
      message: error.message
    });
  }
};

/**
 * Get a specific order by ID
 */
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    // Verify ownership
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Not authorized to view this order'
      });
    }

    res.json({
      success: true,
      order: {
        id: order._id,
        type: order.type,
        side: order.side,
        pair: order.pair,
        price: order.price,
        triggerPrice: order.triggerPrice,
        amount: order.amount,
        filledAmount: order.filledAmount,
        remainingAmount: order.getRemainingAmount(),
        averageFilledPrice: order.averageFilledPrice,
        fees: order.fees,
        status: order.status,
        triggered: order.triggered,
        triggeredAt: order.triggeredAt,
        expiresAt: order.expiresAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        completedAt: order.completedAt,
        cancelledAt: order.cancelledAt
      }
    });

  } catch (error) {
    logger.error('Get order error:', error);
    res.status(500).json({
      error: 'Failed to get order',
      message: error.message
    });
  }
};

/**
 * Create a price alert
 */
exports.createPriceAlert = async (req, res) => {
  try {
    const { targetPrice, condition, message, expiresIn } = req.body;

    if (!targetPrice || !condition) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide targetPrice and condition'
      });
    }

    // Validate condition
    const validConditions = ['above', 'below', 'crosses_above', 'crosses_below'];
    if (!validConditions.includes(condition)) {
      return res.status(400).json({
        error: 'Invalid condition',
        message: `Condition must be one of: ${validConditions.join(', ')}`
      });
    }

    // Validate target price
    if (targetPrice <= 0) {
      return res.status(400).json({
        error: 'Invalid target price',
        message: 'Target price must be greater than 0'
      });
    }

    // Set expiration if provided
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date(Date.now() + expiresIn * 1000); // expiresIn is in seconds
    }

    // Get current price for initial check
    const currentPrice = await Price.getCurrent();

    // Create price alert
    const alert = new PriceAlert({
      user: req.user._id,
      email: req.user.email,
      pair: 'STRAT/USD',
      targetPrice,
      condition,
      message: message || `STRAT price ${condition.replace('_', ' ')} $${targetPrice}`,
      lastCheckedPrice: currentPrice.priceUSD,
      expiresAt
    });

    await alert.save();

    // Emit WebSocket event
    if (req.io) {
      req.io.to(`user:${req.user._id}`).emit('alert_created', {
        alertId: alert._id,
        targetPrice: alert.targetPrice,
        condition: alert.condition
      });
    }

    res.json({
      success: true,
      message: 'Price alert created successfully',
      alert: {
        id: alert._id,
        pair: alert.pair,
        targetPrice: alert.targetPrice,
        condition: alert.condition,
        message: alert.message,
        status: alert.status,
        expiresAt: alert.expiresAt,
        createdAt: alert.createdAt
      }
    });

  } catch (error) {
    logger.error('Create price alert error:', error);
    res.status(500).json({
      error: 'Failed to create price alert',
      message: error.message
    });
  }
};

/**
 * Get user's price alerts
 */
exports.getPriceAlerts = async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    // Build query
    const query = { user: req.user._id };
    if (status) query.status = status;

    // Get alerts
    const alerts = await PriceAlert.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    // Get total count
    const total = await PriceAlert.countDocuments(query);

    // Get current price
    const currentPrice = await Price.getCurrent();

    // Enrich alerts
    const enrichedAlerts = alerts.map(alert => ({
      id: alert._id,
      pair: alert.pair,
      targetPrice: alert.targetPrice,
      currentPrice: currentPrice.priceUSD,
      condition: alert.condition,
      message: alert.message,
      status: alert.status,
      triggered: alert.triggered,
      triggeredAt: alert.triggeredAt,
      triggeredPrice: alert.triggeredPrice,
      expiresAt: alert.expiresAt,
      createdAt: alert.createdAt
    }));

    res.json({
      success: true,
      alerts: enrichedAlerts,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Get price alerts error:', error);
    res.status(500).json({
      error: 'Failed to get price alerts',
      message: error.message
    });
  }
};

/**
 * Cancel a price alert
 */
exports.cancelPriceAlert = async (req, res) => {
  try {
    const { alertId } = req.params;

    const alert = await PriceAlert.findById(alertId);
    if (!alert) {
      return res.status(404).json({
        error: 'Alert not found'
      });
    }

    // Verify ownership
    if (alert.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Not authorized to cancel this alert'
      });
    }

    // Check if alert can be cancelled
    if (alert.status !== 'active') {
      return res.status(400).json({
        error: 'Alert cannot be cancelled',
        status: alert.status
      });
    }

    // Cancel the alert
    alert.status = 'cancelled';
    alert.updatedAt = new Date();
    await alert.save();

    // Emit WebSocket event
    if (req.io) {
      req.io.to(`user:${req.user._id}`).emit('alert_cancelled', {
        alertId: alert._id
      });
    }

    res.json({
      success: true,
      message: 'Price alert cancelled successfully',
      alert: {
        id: alert._id,
        status: alert.status
      }
    });

  } catch (error) {
    logger.error('Cancel price alert error:', error);
    res.status(500).json({
      error: 'Failed to cancel price alert',
      message: error.message
    });
  }
};

/**
 * Get trading history (filled orders)
 */
exports.getTradingHistory = async (req, res) => {
  try {
    const { limit = 50, offset = 0, startDate, endDate } = req.query;

    // Build query for filled orders
    const query = {
      user: req.user._id,
      status: { $in: ['filled', 'partial'] }
    };

    // Add date filters if provided
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Get filled orders
    const orders = await Order.find(query)
      .sort({ completedAt: -1, updatedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    // Get total count
    const total = await Order.countDocuments(query);

    // Calculate statistics
    const stats = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalVolume: { $sum: '$filledAmount' },
          totalFees: { $sum: '$fees' },
          totalTrades: { $sum: 1 }
        }
      }
    ]);

    // Enrich orders
    const enrichedOrders = orders.map(order => ({
      id: order._id,
      type: order.type,
      side: order.side,
      pair: order.pair,
      amount: order.amount,
      filledAmount: order.filledAmount,
      averageFilledPrice: order.averageFilledPrice,
      fees: order.fees,
      totalValue: order.filledAmount * order.averageFilledPrice,
      status: order.status,
      createdAt: order.createdAt,
      completedAt: order.completedAt || order.updatedAt
    }));

    res.json({
      success: true,
      history: enrichedOrders,
      stats: stats.length > 0 ? {
        totalVolume: stats[0].totalVolume,
        totalFees: stats[0].totalFees,
        totalTrades: stats[0].totalTrades
      } : {
        totalVolume: 0,
        totalFees: 0,
        totalTrades: 0
      },
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Get trading history error:', error);
    res.status(500).json({
      error: 'Failed to get trading history',
      message: error.message
    });
  }
};

/**
 * Get trading statistics
 */
exports.getTradingStats = async (req, res) => {
  try {
    const { period = '24h' } = req.query;

    // Calculate date range
    let startDate;
    switch (period) {
      case '1h':
        startDate = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    // Get order statistics
    const orderStats = await Order.aggregate([
      {
        $match: {
          user: req.user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get active orders
    const activeOrders = await Order.countDocuments({
      user: req.user._id,
      status: { $in: ['pending', 'partial'] }
    });

    // Get active alerts
    const activeAlerts = await PriceAlert.countDocuments({
      user: req.user._id,
      status: 'active'
    });

    // Format stats
    const stats = {
      pending: 0,
      partial: 0,
      filled: 0,
      cancelled: 0,
      expired: 0
    };

    orderStats.forEach(stat => {
      stats[stat._id] = stat.count;
    });

    res.json({
      success: true,
      period,
      stats: {
        ...stats,
        activeOrders,
        activeAlerts
      }
    });

  } catch (error) {
    logger.error('Get trading stats error:', error);
    res.status(500).json({
      error: 'Failed to get trading statistics',
      message: error.message
    });
  }
};
