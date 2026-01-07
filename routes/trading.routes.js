const express = require('express');
const router = express.Router();
const tradingController = require('../controllers/tradingController');
const { authenticate } = require('../middleware/auth');

// All trading routes require authentication
router.use(authenticate);

// Order routes
router.post('/orders/limit', tradingController.createLimitOrder);
router.post('/orders/stop-loss', tradingController.createStopLoss);
router.post('/orders/take-profit', tradingController.createTakeProfit);
router.get('/orders', tradingController.getOrders);
router.get('/orders/:orderId', tradingController.getOrderById);
router.delete('/orders/:orderId', tradingController.cancelOrder);

// Price alert routes
router.post('/alerts', tradingController.createPriceAlert);
router.get('/alerts', tradingController.getPriceAlerts);
router.delete('/alerts/:alertId', tradingController.cancelPriceAlert);

// Trading history and statistics
router.get('/history', tradingController.getTradingHistory);
router.get('/stats', tradingController.getTradingStats);

module.exports = router;
