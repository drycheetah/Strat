const express = require('express');
const router = express.Router();
const liquidityController = require('../controllers/liquidityController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.get('/pool', liquidityController.getPoolInfo);
router.post('/calculate-swap', liquidityController.calculateSwap);

// Protected routes
router.post('/add', authenticate, liquidityController.addLiquidity);
router.post('/remove', authenticate, liquidityController.removeLiquidity);
router.get('/position', authenticate, liquidityController.getUserPosition);

module.exports = router;
