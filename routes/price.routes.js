const express = require('express');
const router = express.Router();
const priceController = require('../controllers/priceController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.get('/current', priceController.getCurrentPrice);
router.get('/history', priceController.getPriceHistory);

// Protected routes (admin only for now)
router.post('/update', authenticate, priceController.updatePrice);

module.exports = router;
