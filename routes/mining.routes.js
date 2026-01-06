const express = require('express');
const router = express.Router();
const miningController = require('../controllers/miningController');

/**
 * Mining routes for standalone miners
 * These endpoints allow external mining clients to connect and mine STRAT
 */

// Get mining work (current block to mine)
router.get('/work', miningController.getMiningWork);

// Submit mined block
router.post('/submit', miningController.submitBlock);

// Get mining statistics
router.get('/stats', miningController.getMiningStats);

// Get miner's earnings
router.get('/earnings/:address', miningController.getMinerEarnings);

module.exports = router;
