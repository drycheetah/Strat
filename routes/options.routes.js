const express = require('express');
const router = express.Router();
const optionsController = require('../controllers/optionsController');
const { authenticate } = require('../middleware/auth');

router.post('/contracts', authenticate, optionsController.createContract);
router.get('/contracts', optionsController.getContracts);
router.post('/create', authenticate, optionsController.createOption);
router.post('/buy', authenticate, optionsController.buyOption);
router.post('/exercise', authenticate, optionsController.exerciseOption);
router.get('/chain/:pair', optionsController.getOptionChain);
router.post('/prices/update', authenticate, optionsController.updatePrice);

module.exports = router;
