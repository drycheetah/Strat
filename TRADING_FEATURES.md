# Advanced Trading Features - Implementation Guide

This document describes the advanced trading features that have been created for STRAT, including limit orders, stop-loss orders, take-profit orders, and price alerts.

## Files Created

### 1. Models

#### `models/Order.js`
Mongoose model for trading orders with the following features:
- **Order Types**: limit, stop-loss, take-profit
- **Order Sides**: buy, sell
- **Fields**:
  - Basic: user, address, type, side, pair, price, amount
  - Execution: filledAmount, averageFilledPrice, fees, status
  - Triggers: triggerPrice, triggered, triggeredAt
  - Lifecycle: expiresAt, createdAt, updatedAt, completedAt, cancelledAt
- **Methods**:
  - `canFillAtPrice(currentPrice)` - Check if order can be filled
  - `getRemainingAmount()` - Calculate unfilled amount
  - `isFullyFilled()` - Check completion status
  - `partialFill(amount, price)` - Execute partial fills
  - `trigger()` - Trigger stop-loss/take-profit orders
- **Static Methods**:
  - `getActiveOrders(pair)` - Get all active orders for a trading pair
  - `getUserActiveOrders(userId)` - Get user's active orders
  - `getTriggeredOrders(pair, price)` - Find orders ready to execute
  - `expireOldOrders()` - Clean up expired orders

#### `models/PriceAlert.js`
Mongoose model for price alerts with the following features:
- **Conditions**: above, below, crosses_above, crosses_below
- **Fields**:
  - Basic: user, email, pair, targetPrice, condition, message
  - Status: status, triggered, triggeredAt, triggeredPrice
  - Notifications: notificationSent, notificationSentAt
  - Tracking: lastCheckedPrice, expiresAt
- **Methods**:
  - `shouldTrigger(currentPrice)` - Check if alert should fire
  - `trigger(currentPrice)` - Activate the alert
  - `updateLastPrice(price)` - Update price tracking
  - `markNotificationSent()` - Mark notification as delivered
- **Static Methods**:
  - `getActiveAlerts(pair)` - Get active alerts for a pair
  - `getUserActiveAlerts(userId)` - Get user's active alerts
  - `checkAlerts(pair, price)` - Check all alerts against current price
  - `expireOldAlerts()` - Clean up expired alerts
  - `getUserStats(userId)` - Get alert statistics

### 2. Controller

#### `controllers/tradingController.js`
Handles all trading operations with the following endpoints:

**Order Management:**
- `createLimitOrder` - Create limit buy/sell orders
- `createStopLoss` - Create stop-loss orders with trigger prices
- `createTakeProfit` - Create take-profit orders (similar to stop-loss)
- `cancelOrder` - Cancel pending/partial orders
- `getOrders` - Get user's orders with filtering and pagination
- `getOrderById` - Get detailed order information
- `getTradingHistory` - Get filled orders history with statistics

**Price Alerts:**
- `createPriceAlert` - Create price notification alerts
- `getPriceAlerts` - Get user's alerts with current price
- `cancelPriceAlert` - Cancel active alerts

**Statistics:**
- `getTradingStats` - Get trading statistics by period (1h, 24h, 7d, 30d)

### 3. Routes

#### `routes/trading.routes.js`
REST API endpoints with authentication:

**Orders:**
- `POST /api/trading/orders/limit` - Create limit order
- `POST /api/trading/orders/stop-loss` - Create stop-loss order
- `POST /api/trading/orders/take-profit` - Create take-profit order
- `GET /api/trading/orders` - Get orders (with query params: status, type, side, limit, offset)
- `GET /api/trading/orders/:orderId` - Get specific order
- `DELETE /api/trading/orders/:orderId` - Cancel order

**Price Alerts:**
- `POST /api/trading/alerts` - Create price alert
- `GET /api/trading/alerts` - Get alerts (with query params: status, limit, offset)
- `DELETE /api/trading/alerts/:alertId` - Cancel alert

**History & Stats:**
- `GET /api/trading/history` - Get trading history (with query params: limit, offset, startDate, endDate)
- `GET /api/trading/stats` - Get trading statistics (with query param: period)

## Integration Steps

### 1. Register Routes in server.js

Add the trading routes to your server.js file. Find the `setupRoutes()` method and add:

```javascript
// At the top with other route imports (around line 27)
const tradingRoutes = require('./routes/trading.routes');

// In the setupRoutes() method (around line 225)
this.app.use('/api/trading', tradingRoutes);
```

### 2. Update API Documentation

In the `setupRoutes()` method, update the API documentation endpoint to include trading:

```javascript
// Around line 228-241
this.app.get('/api', (req, res) => {
  res.json({
    name: 'STRAT Blockchain API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      wallets: '/api/wallets',
      blockchain: '/api/blockchain',
      transactions: '/api/transactions',
      contracts: '/api/contracts',
      bridge: '/api/bridge',
      trading: '/api/trading',  // Add this line
      staking: '/api/staking',
      social: '/api/social',
      nft: '/api/nft',
      price: '/api/price',
      liquidity: '/api/liquidity'
    },
    documentation: '/api/docs'
  });
});
```

### 3. Create Background Jobs (Optional)

For automatic order execution and alert checking, create a background job service:

Create `services/tradingService.js`:

```javascript
const Order = require('../models/Order');
const PriceAlert = require('../models/PriceAlert');
const Price = require('../models/Price');
const logger = require('../utils/logger');

class TradingService {
  constructor(blockchain, io) {
    this.blockchain = blockchain;
    this.io = io;
    this.checkInterval = 5000; // Check every 5 seconds
  }

  start() {
    // Check orders and alerts periodically
    setInterval(() => {
      this.checkOrders();
      this.checkAlerts();
      this.expireOldItems();
    }, this.checkInterval);

    logger.info('Trading service started');
  }

  async checkOrders() {
    try {
      const currentPrice = await Price.getCurrent();
      const triggeredOrders = await Order.getTriggeredOrders('STRAT/USD', currentPrice.priceUSD);

      for (const order of triggeredOrders) {
        // Trigger the order
        order.trigger();
        await order.save();

        // Emit WebSocket event
        this.io.to(`user:${order.user}`).emit('order_triggered', {
          orderId: order._id,
          type: order.type,
          triggeredPrice: currentPrice.priceUSD
        });

        logger.info(`Order ${order._id} triggered at price ${currentPrice.priceUSD}`);
      }
    } catch (error) {
      logger.error('Error checking orders:', error);
    }
  }

  async checkAlerts() {
    try {
      const currentPrice = await Price.getCurrent();
      const triggeredAlerts = await PriceAlert.checkAlerts('STRAT/USD', currentPrice.priceUSD);

      for (const alert of triggeredAlerts) {
        // Emit WebSocket event
        this.io.to(`user:${alert.user}`).emit('price_alert', {
          alertId: alert._id,
          message: alert.message,
          targetPrice: alert.targetPrice,
          currentPrice: currentPrice.priceUSD
        });

        // TODO: Send email notification
        logger.info(`Price alert ${alert._id} triggered at price ${currentPrice.priceUSD}`);
      }
    } catch (error) {
      logger.error('Error checking alerts:', error);
    }
  }

  async expireOldItems() {
    try {
      const expiredOrders = await Order.expireOldOrders();
      const expiredAlerts = await PriceAlert.expireOldAlerts();

      if (expiredOrders > 0) {
        logger.info(`Expired ${expiredOrders} old orders`);
      }
      if (expiredAlerts > 0) {
        logger.info(`Expired ${expiredAlerts} old alerts`);
      }
    } catch (error) {
      logger.error('Error expiring old items:', error);
    }
  }
}

module.exports = TradingService;
```

Then in `server.js`, initialize the service in the `initialize()` method:

```javascript
// After setupWebSocket() call (around line 78)
this.setupTradingService();

// Add this method to the ProductionServer class
setupTradingService() {
  const TradingService = require('./services/tradingService');
  this.tradingService = new TradingService(this.blockchain, this.io);
  this.tradingService.start();
  logger.info('Trading service initialized');
}
```

## API Usage Examples

### Create Limit Order

```javascript
// Create a limit buy order
POST /api/trading/orders/limit
Authorization: Bearer <token>
Content-Type: application/json

{
  "address": "wallet_address",
  "side": "buy",
  "price": 0.05,
  "amount": 100,
  "expiresIn": 86400  // Optional: 24 hours in seconds
}
```

### Create Stop-Loss Order

```javascript
// Create a stop-loss sell order
POST /api/trading/orders/stop-loss
Authorization: Bearer <token>
Content-Type: application/json

{
  "address": "wallet_address",
  "side": "sell",
  "triggerPrice": 0.045,  // Trigger when price drops to $0.045
  "amount": 50,
  "executePrice": 0.044   // Optional: execute at this price
}
```

### Create Price Alert

```javascript
// Create alert when price crosses above $0.10
POST /api/trading/alerts
Authorization: Bearer <token>
Content-Type: application/json

{
  "targetPrice": 0.10,
  "condition": "crosses_above",
  "message": "STRAT reached $0.10!",
  "expiresIn": 604800  // Optional: 7 days
}
```

### Get Orders

```javascript
// Get active limit orders
GET /api/trading/orders?status=pending&type=limit&limit=20
Authorization: Bearer <token>
```

### Get Trading History

```javascript
// Get trading history for last 30 days
GET /api/trading/history?limit=50&startDate=2024-12-07
Authorization: Bearer <token>
```

### Get Trading Statistics

```javascript
// Get 24h trading stats
GET /api/trading/stats?period=24h
Authorization: Bearer <token>
```

## Database Indexes

Both models include optimized indexes for common queries:

**Order Indexes:**
- `user + status` - User's orders by status
- `address + status` - Wallet's orders by status
- `pair + type + status` - Trading pair orders
- `status + createdAt` - Recent orders
- `triggerPrice + triggered` - Triggered orders

**PriceAlert Indexes:**
- `user + status` - User's alerts by status
- `pair + status` - Trading pair alerts
- `status + triggered` - Triggered alerts
- `targetPrice + condition` - Price-based lookups

## WebSocket Events

The trading system emits the following WebSocket events:

**Orders:**
- `order_created` - New order created
- `order_triggered` - Stop-loss/take-profit triggered
- `order_filled` - Order fully filled
- `order_cancelled` - Order cancelled

**Price Alerts:**
- `alert_created` - New alert created
- `price_alert` - Alert triggered
- `alert_cancelled` - Alert cancelled

Clients can subscribe to user-specific events by joining room `user:<userId>`.

## Security Considerations

1. **Authentication Required**: All endpoints require JWT authentication
2. **Authorization**: Users can only access/modify their own orders and alerts
3. **Input Validation**: All inputs are validated before processing
4. **Balance Checks**: Orders verify wallet balance before creation
5. **Rate Limiting**: Consider adding rate limiting to prevent abuse

## Future Enhancements

Potential improvements to consider:

1. **Order Matching Engine**: Implement automatic order matching
2. **Partial Fills**: Support partial order execution
3. **Order Books**: Maintain buy/sell order books
4. **Trading Pairs**: Support multiple trading pairs (STRAT/BTC, STRAT/ETH, etc.)
5. **Advanced Orders**: Support trailing stops, OCO orders, etc.
6. **Email Notifications**: Send email alerts when price targets are hit
7. **SMS Notifications**: Optional SMS alerts for critical price movements
8. **Trading Fees**: Implement and track trading fees
9. **Trading Reports**: Generate detailed trading performance reports
10. **API Keys**: Allow programmatic trading via API keys

## Testing

To test the trading features:

1. Create a user account and authenticate
2. Create a wallet and fund it
3. Create various order types and verify they're stored correctly
4. Set up price alerts and test different conditions
5. Simulate price changes to trigger orders and alerts
6. Verify WebSocket events are emitted correctly
7. Test order cancellation and expiration

## Support

For issues or questions about the trading features, refer to:
- Model definitions in `models/Order.js` and `models/PriceAlert.js`
- Controller logic in `controllers/tradingController.js`
- Route definitions in `routes/trading.routes.js`
