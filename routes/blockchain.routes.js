const express = require('express');
const router = express.Router();
const blockchainController = require('../controllers/blockchainController');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Public routes
router.get('/stats', blockchainController.getStats);
router.get('/blocks', blockchainController.getBlocks);
router.get('/blocks/latest', blockchainController.getLatestBlock);
router.get('/blocks/:id', blockchainController.getBlock);
router.get('/address/:address', blockchainController.getAddress);
router.get('/transaction/:hash', blockchainController.getTransaction);
router.get('/validate', blockchainController.validateChain);

// Protected routes
router.post('/mine', authenticate, blockchainController.mineBlock);

module.exports = router;
