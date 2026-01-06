const express = require('express');
const router = express.Router();
const explorerController = require('../controllers/explorerController');

// Get blockchain statistics
router.get('/stats', explorerController.getStats);

// Search blockchain
router.get('/search/:query', explorerController.search);

// Get block by index or hash
router.get('/block/:identifier', explorerController.getBlock);

// Get transaction details
router.get('/transaction/:txHash', explorerController.getTransaction);

// Get address details and history
router.get('/address/:address', explorerController.getAddress);

// Get recent blocks
router.get('/blocks', explorerController.getRecentBlocks);

// Get rich list
router.get('/richlist', explorerController.getRichList);

// Get mining statistics
router.get('/mining', explorerController.getMiningStats);

// Get charts data
router.get('/charts/:type', explorerController.getCharts);

module.exports = router;
