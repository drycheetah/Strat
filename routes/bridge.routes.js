const express = require('express');
const router = express.Router();
const bridgeController = require('../controllers/bridgeController');
const { authenticate } = require('../middleware/auth');

// Public route - get bridge info
router.get('/info', bridgeController.getBridgeInfo);

// Protected routes
router.post('/verify', authenticate, bridgeController.verifyDeposit);
router.get('/history', authenticate, bridgeController.getBridgeHistory);

module.exports = router;
