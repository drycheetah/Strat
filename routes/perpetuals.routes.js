const express = require('express');
const router = express.Router();
const perpetualsController = require('../controllers/perpetualsController');
const { authenticate } = require('../middleware/auth');

router.post('/contracts', authenticate, perpetualsController.createContract);
router.get('/contracts', perpetualsController.getContracts);
router.get('/contracts/:pair', perpetualsController.getContract);
router.post('/positions/open', authenticate, perpetualsController.openPosition);
router.post('/positions/close', authenticate, perpetualsController.closePosition);
router.post('/prices/update', authenticate, perpetualsController.updatePrices);
router.get('/positions/:pair', authenticate, perpetualsController.getUserPositions);
router.get('/funding/:pair', perpetualsController.getFundingHistory);

module.exports = router;
