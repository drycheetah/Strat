const express = require('express');
const router = express.Router();
const mempoolController = require('../controllers/mempoolController');

// Get mempool statistics
router.get('/stats', mempoolController.getMempoolStats);

// Get transaction from mempool
router.get('/transaction/:txHash', mempoolController.getMempoolTransaction);

// Get transactions by priority
router.get('/transactions', mempoolController.getTransactionsByPriority);

// Replace transaction (RBF)
router.post('/replace/:oldTxHash', mempoolController.replaceTransaction);

// Remove transaction from mempool
router.delete('/transaction/:txHash', mempoolController.removeTransaction);

// Get recommended fee rate
router.get('/fee-rate', mempoolController.getRecommendedFeeRate);

module.exports = router;
