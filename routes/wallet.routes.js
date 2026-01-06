const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { validate, schemas } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');

// All wallet routes require authentication
router.use(authenticate);

router.post('/', validate(schemas.createWallet), walletController.createWallet);
router.post('/restore', validate(schemas.restoreWallet), walletController.restoreWallet);
router.get('/info', walletController.getInfo); // Must come before /:id to avoid conflict
router.get('/', walletController.getWallets);
router.get('/:id', walletController.getWallet);
router.get('/:id/transactions', walletController.getTransactionHistory);
router.post('/:id/export', walletController.exportMnemonic);
router.put('/:id/primary', walletController.setPrimaryWallet);

module.exports = router;
